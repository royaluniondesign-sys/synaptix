import { spawn } from 'node:child_process';
import type { Response } from 'express';

export const CHAT_PROVIDERS = ['claude-cli', 'ollama', 'openai', 'openrouter'] as const;
export type ChatProvider = (typeof CHAT_PROVIDERS)[number];

const MAX_MESSAGES = 50;
const MAX_CHARS = 20_000;
const REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_OLLAMA = 'http://localhost:11434';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  provider: ChatProvider;
  model: string | undefined;
  messages: ChatMessage[];
  prompt: string;
  apiKey: string | undefined;
  ollamaBase: string;
}

/**
 * The chat proxy forwards to a model host chosen by the client, so everything the client sends is checked here.
 * Ollama is only reachable on this machine: an authenticated device must not be able to make the agent call
 * other hosts on its network.
 */
export function parseChatRequest(body: unknown): { value: ChatRequest } | { error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  if (typeof b.prompt !== 'string' || !b.prompt.trim()) return { error: 'prompt is required' };
  if (b.prompt.length > MAX_CHARS) return { error: `prompt is longer than ${MAX_CHARS} characters` };
  if (typeof b.provider !== 'string' || !(CHAT_PROVIDERS as readonly string[]).includes(b.provider)) {
    return { error: 'invalid provider' };
  }
  const provider = b.provider as ChatProvider;

  let model: string | undefined;
  if (b.model !== undefined) {
    if (typeof b.model !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/.test(b.model)) return { error: 'invalid model' };
    model = b.model;
  }

  const messages: ChatMessage[] = [];
  if (b.messages !== undefined) {
    if (!Array.isArray(b.messages) || b.messages.length > MAX_MESSAGES) {
      return { error: `messages must be an array of at most ${MAX_MESSAGES} items` };
    }
    for (const item of b.messages) {
      const m = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') return { error: 'invalid message role' };
      if (typeof m.content !== 'string' || m.content.length > MAX_CHARS) return { error: 'invalid message content' };
      if (m.content) messages.push({ role: m.role, content: m.content });
    }
  }

  let apiKey: string | undefined;
  if (b.apiKey !== undefined) {
    if (typeof b.apiKey !== 'string' || b.apiKey.length > 400 || (b.apiKey !== '' && !/^[\x21-\x7e]+$/.test(b.apiKey))) {
      return { error: 'invalid apiKey' };
    }
    apiKey = b.apiKey || undefined;
  }
  if ((provider === 'openai' || provider === 'openrouter') && !apiKey) return { error: 'API key required for this provider' };

  let ollamaBase = DEFAULT_OLLAMA;
  if (b.ollamaUrl !== undefined && b.ollamaUrl !== '') {
    const base = loopbackBase(b.ollamaUrl);
    if (!base) return { error: 'ollamaUrl must point to this machine (localhost, 127.0.0.1 or [::1])' };
    ollamaBase = base;
  }

  return { value: { provider, model, messages, prompt: b.prompt, apiKey, ollamaBase } };
}

/** Returns the origin of a loopback http(s) URL, or null for anything else. */
export function loopbackBase(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!LOOPBACK_HOSTS.has(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Streams a chat answer as server-sent events: `data: {"delta":"..."}` then `data: [DONE]`. */
export function streamChat(res: Response, chat: ChatRequest): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let finished = false;
  const cleanups: Array<() => void> = [];
  const finish = (error?: string) => {
    if (finished) return;
    finished = true;
    for (const cleanup of cleanups) cleanup();
    if (!res.writableEnded && !res.destroyed) {
      if (error) res.write(`data: ${JSON.stringify({ delta: `\n\nError: ${error}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  };
  const send = (delta: string) => {
    if (!finished && !res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  cleanups.push(() => clearTimeout(timer));
  // The client went away: stop the upstream request or the child process.
  res.on('close', () => {
    controller.abort();
    finish();
  });

  if (chat.provider === 'claude-cli') {
    const history = chat.messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const fullPrompt = history ? `${history}\nHuman: ${chat.prompt}` : chat.prompt;
    // argv array, no shell. The caller has already checked TERMORA_ENABLE_AGENT_SPAWN.
    const child = spawn('claude', ['--print'], { shell: false, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    cleanups.push(() => child.kill());
    controller.signal.addEventListener('abort', () => child.kill());
    let produced = false;
    child.stdout.on('data', (chunk: Buffer) => {
      produced = true;
      send(chunk.toString());
    });
    child.stderr.resume();
    child.on('error', (err) => finish(err.message));
    child.on('close', (code) => {
      if (code !== 0 && !produced) finish(`claude exited with code ${code}. Is the claude CLI installed and signed in?`);
      else finish();
    });
    child.stdin.on('error', () => { /* the process ended before reading the prompt */ });
    child.stdin.end(fullPrompt);
    return;
  }

  const messages = [...chat.messages, { role: 'user', content: chat.prompt }];
  const isOllama = chat.provider === 'ollama';
  const url = isOllama
    ? `${chat.ollamaBase}/api/chat`
    : chat.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
  const model = chat.model ?? (isOllama ? 'llama3.1' : chat.provider === 'openai' ? 'gpt-4o-mini' : 'meta-llama/llama-3.1-8b-instruct:free');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isOllama) headers.Authorization = `Bearer ${chat.apiKey}`;
  if (chat.provider === 'openrouter') headers['X-Title'] = 'Termora';

  void (async () => {
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: true }),
        signal: controller.signal,
      });
      if (!upstream.ok || !upstream.body) {
        finish(`${isOllama ? 'Ollama' : chat.provider} answered ${upstream.status}`);
        return;
      }
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (isOllama) {
            try {
              const parsed = JSON.parse(line) as { message?: { content?: string } };
              if (parsed.message?.content) send(parsed.message.content);
            } catch { /* partial line */ }
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) send(delta);
            } catch { /* partial line */ }
          }
        }
      }
      finish();
    } catch {
      if (controller.signal.aborted) finish(finished ? undefined : 'the request timed out or was cancelled');
      else finish(isOllama ? `Ollama connection failed. Is Ollama running at ${chat.ollamaBase}?` : 'could not reach the provider');
    }
  })();
}
