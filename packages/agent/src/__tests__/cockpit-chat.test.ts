import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { loopbackBase, parseChatRequest } from '../chat.js';

describe('loopbackBase', () => {
  it('accepts only http(s) URLs that point to this machine', () => {
    expect(loopbackBase('http://localhost:11434')).toBe('http://localhost:11434');
    expect(loopbackBase('http://127.0.0.1:11434/some/path?x=1')).toBe('http://127.0.0.1:11434');
    expect(loopbackBase('http://[::1]:11434')).toBe('http://[::1]:11434');
  });

  it('rejects other hosts, schemes and credentials', () => {
    expect(loopbackBase('http://169.254.169.254')).toBeNull();
    expect(loopbackBase('http://192.168.1.10:11434')).toBeNull();
    expect(loopbackBase('https://example.com')).toBeNull();
    expect(loopbackBase('http://localhost.evil.test')).toBeNull();
    expect(loopbackBase('http://user:pw@localhost:11434')).toBeNull();
    expect(loopbackBase('file:///etc/passwd')).toBeNull();
    expect(loopbackBase('not a url')).toBeNull();
    expect(loopbackBase(42)).toBeNull();
  });
});

describe('parseChatRequest', () => {
  it('requires a prompt and a known provider', () => {
    expect(parseChatRequest({ provider: 'ollama' })).toEqual({ error: 'prompt is required' });
    expect(parseChatRequest({ provider: 'nope', prompt: 'hi' })).toEqual({ error: 'invalid provider' });
  });

  it('requires an API key for the hosted providers', () => {
    expect(parseChatRequest({ provider: 'openai', prompt: 'hi' })).toEqual({ error: 'API key required for this provider' });
    expect('value' in parseChatRequest({ provider: 'openai', prompt: 'hi', apiKey: 'sk-test' })).toBe(true);
  });

  it('rejects oversized, malformed and out-of-range input', () => {
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'x'.repeat(20_001) })).toBe(true);
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'hi', model: 'a b; rm -rf' })).toBe(true);
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'hi', messages: 'nope' })).toBe(true);
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'hi', messages: [{ role: 'root', content: 'x' }] })).toBe(true);
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'hi', messages: new Array(51).fill({ role: 'user', content: 'x' }) })).toBe(true);
    expect('error' in parseChatRequest({ provider: 'openai', prompt: 'hi', apiKey: 'two words' })).toBe(true);
  });

  it('keeps well-formed history and drops empty messages', () => {
    const parsed = parseChatRequest({
      provider: 'ollama',
      prompt: 'hi',
      model: 'llama3.1:8b',
      messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: '' }],
    });
    expect('value' in parsed && parsed.value.messages).toEqual([{ role: 'user', content: 'a' }]);
  });

  it('refuses an Ollama URL that points away from this machine', () => {
    expect('error' in parseChatRequest({ provider: 'ollama', prompt: 'hi', ollamaUrl: 'http://169.254.169.254' })).toBe(true);
  });
});

describe('POST /api/cockpit/chat', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synaptix-cockpit-chat-'));
  const dbPath = join(dir, 'test.db');
  let baseUrl = '';
  let authHeader = '';
  let close: () => Promise<void>;
  let fakeOllama: Server;
  let ollamaUrl = '';

  beforeAll(async () => {
    process.env.TERMORA_AGENTS_FILE = join(dir, 'agents.json');
    delete process.env.TERMORA_ENABLE_AGENT_SPAWN;
    const { createAppServer } = await import('../server.js');
    const { initDatabase } = await import('../db.js');
    const { createSessionJWT } = await import('../auth.js');
    const config = {
      port: 0, webPort: 0,
      jwtSecret: randomBytes(32).toString('hex'),
      staticToken: randomBytes(32).toString('base64url'),
      ngrokAuthtoken: undefined, ngrokStaticDomain: undefined,
      tunnelMethod: 'local' as const, resendApiKey: undefined, dbPath, tmuxDisabled: true,
    };
    const { db, statements } = initDatabase(dbPath);
    const { httpServer } = createAppServer(config, statements);
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    authHeader = `Bearer ${token}`;
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
    close = async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      db.close();
    };

    // A stand-in for Ollama on the loopback interface: streams two newline-delimited JSON chunks.
    fakeOllama = createServer((req, res) => {
      req.resume();
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.write(`${JSON.stringify({ message: { content: 'Hel' } })}\n`);
      res.end(`${JSON.stringify({ message: { content: 'lo' }, done: true })}\n`);
    });
    await new Promise<void>((resolve) => fakeOllama.listen(0, '127.0.0.1', resolve));
    ollamaUrl = `http://127.0.0.1:${(fakeOllama.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await close();
    await new Promise<void>((resolve) => fakeOllama.close(() => resolve()));
    delete process.env.TERMORA_AGENTS_FILE;
    rmSync(dir, { recursive: true, force: true });
  });

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}/api/cockpit/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('answers 401 without a token', async () => {
    expect((await post({ provider: 'ollama', prompt: 'hi' })).status).toBe(401);
  });

  it('answers 401 to a made-up bearer token', async () => {
    expect((await post({ provider: 'ollama', prompt: 'hi' }, { Authorization: 'Bearer not-a-real-token' })).status).toBe(401);
  });

  it('answers 400 to an invalid provider', async () => {
    expect((await post({ provider: 'nope', prompt: 'hi' }, { Authorization: authHeader })).status).toBe(400);
  });

  it('answers 400 when the Ollama URL points to another host', async () => {
    const res = await post({ provider: 'ollama', prompt: 'hi', ollamaUrl: 'http://169.254.169.254' }, { Authorization: authHeader });
    expect(res.status).toBe(400);
  });

  it('answers 403 for the claude CLI unless agent spawning is enabled', async () => {
    const res = await post({ provider: 'claude-cli', prompt: 'hi' }, { Authorization: authHeader });
    expect(res.status).toBe(403);
  });

  it('streams a loopback Ollama answer as server-sent events', async () => {
    const res = await post({ provider: 'ollama', prompt: 'hi', ollamaUrl }, { Authorization: authHeader });
    expect(res.status).toBe(200);
    const text = await res.text();
    const deltas = [...text.matchAll(/^data: (\{.*\})$/gm)].map((m) => (JSON.parse(m[1]) as { delta: string }).delta);
    expect(deltas.join('')).toBe('Hello');
    expect(text.trimEnd().endsWith('data: [DONE]')).toBe(true);
  });
});
