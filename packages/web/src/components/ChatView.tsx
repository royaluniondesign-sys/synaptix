import { useState, useRef, useCallback, useEffect } from 'react';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#10b981',
  error: '#ef4444',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

export type ChatProvider = 'claude-cli' | 'ollama' | 'openai' | 'openrouter';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  provider?: ChatProvider;
  error?: boolean;
}

interface ProviderConfig {
  provider: ChatProvider;
  model: string;
  apiKey?: string;
  ollamaUrl?: string;
}

const PROVIDER_LABELS: Record<ChatProvider, string> = {
  'claude-cli': 'Claude (CLI)',
  'ollama': 'Ollama (local)',
  'openai': 'OpenAI',
  'openrouter': 'OpenRouter',
};

const PROVIDER_MODELS: Record<ChatProvider, string[]> = {
  'claude-cli': ['claude', 'claude-code'],
  'ollama': ['llama3.1', 'llama3.2', 'mistral', 'codellama', 'gemma2', 'phi3'],
  'openai': ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  'openrouter': [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b-it:free',
    'mistralai/mistral-7b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
  ],
};

const PROVIDER_FREE: Record<ChatProvider, boolean> = {
  'claude-cli': true,
  'ollama': true,
  'openai': false,
  'openrouter': true,
};

const CONFIG_KEY = 'termora_chat_config';
const HISTORY_KEY = 'termora_chat_history';

function loadConfig(): ProviderConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as ProviderConfig;
  } catch { /* ignore */ }
  return { provider: 'claude-cli', model: 'claude' };
}

function saveConfig(cfg: ProviderConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch { /* ignore */ }
  return [];
}

function saveHistory(msgs: ChatMessage[]) {
  try {
    const trimmed = msgs.slice(-200);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface ChatViewProps {
  authToken?: string | null;
  connectionStatus?: string;
}

export function ChatView({ authToken, connectionStatus }: ChatViewProps) {
  const [config, setConfig] = useState<ProviderConfig>(loadConfig);
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<ProviderConfig>(loadConfig);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const updateMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    saveHistory(next);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      provider: config.provider,
    };

    const nextMessages = [...messages, userMsg, assistantMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const conversationHistory = nextMessages
        .filter((m) => m.role !== 'system')
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/cockpit/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          messages: conversationHistory,
          prompt: text,
          ...(config.apiKey ? { apiKey: config.apiKey } : {}),
          ...(config.ollamaUrl ? { ollamaUrl: config.ollamaUrl } : {}),
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data) as { delta?: string; content?: string };
              const token = parsed.delta ?? parsed.content ?? '';
              accumulated += token;
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              ));
            } catch { /* non-JSON line */ }
          }
        }
      }

      const final = nextMessages.map((m) =>
        m.id === assistantId ? { ...m, content: accumulated } : m
      );
      saveHistory(final);

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + '\n\n_[stopped]_' } : m
          );
          saveHistory(updated);
          return updated;
        });
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${errMsg}`, error: true } : m
          );
          saveHistory(updated);
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [input, streaming, messages, config, authToken]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }, [send]);

  const clearChat = useCallback(() => {
    updateMessages([]);
  }, [updateMessages]);

  const saveAndCloseConfig = useCallback(() => {
    setConfig(configDraft);
    saveConfig(configDraft);
    setShowConfig(false);
  }, [configDraft]);

  const needsKey = config.provider === 'openai' || (config.provider === 'openrouter' && !config.apiKey);
  const isConnected = connectionStatus === 'connected';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${S.border}`,
        background: S.surface,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>
            AI Chat
          </h2>
          <p style={{ fontSize: 10, color: S.text3, margin: '1px 0 0' }}>
            {PROVIDER_LABELS[config.provider]} · {config.model}
            {PROVIDER_FREE[config.provider] && (
              <span style={{ color: S.success, marginLeft: 4 }}>FREE</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          style={{
            height: 26, padding: '0 10px', borderRadius: 5,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text3, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => { setConfigDraft(config); setShowConfig(true); }}
          style={{
            height: 26, width: 26, borderRadius: 5,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Provider setup warning */}
      {needsKey && (
        <div style={{
          padding: '8px 14px', background: `${S.error}10`,
          borderBottom: `1px solid ${S.error}30`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: S.error }}>
            API key required for {PROVIDER_LABELS[config.provider]} — tap ⚙ to add it
          </span>
        </div>
      )}
      {config.provider === 'claude-cli' && !isConnected && (
        <div style={{
          padding: '8px 14px', background: `${S.primary}10`,
          borderBottom: `1px solid ${S.primary}30`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: S.primary }}>
            Claude CLI runs via the agent — connect to agent first
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <ChatEmpty provider={config.provider} model={config.model} onPrompt={(p) => { setInput(p); inputRef.current?.focus(); }} />
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streaming && (
          <div style={{ display: 'flex', gap: 6, paddingLeft: 4, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: S.primary,
                animation: `bounce-dot 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: 10, color: S.text3, marginLeft: 4 }}>
              {PROVIDER_LABELS[config.provider]} is thinking…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${S.border}`,
        background: S.surface,
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          style={{
            flex: 1,
            background: S.surface2,
            border: `1px solid ${S.border}`,
            borderRadius: 8,
            color: S.text1,
            fontSize: 12,
            fontFamily: 'inherit',
            padding: '9px 11px',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
            caretColor: S.primary,
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            style={{
              height: 36, width: 36, borderRadius: 8, flexShrink: 0,
              border: `1px solid ${S.error}44`, background: `${S.error}12`,
              color: S.error, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim()}
            style={{
              height: 36, width: 36, borderRadius: 8, flexShrink: 0,
              border: 'none',
              background: input.trim() ? S.primary : S.surface3,
              color: input.trim() ? S.bg : S.text3,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms ease-out',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>

      {/* Config panel */}
      {showConfig && (
        <ConfigPanel
          draft={configDraft}
          onChange={setConfigDraft}
          onSave={saveAndCloseConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content && !message.error;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${S.primary}18`, border: `1px solid ${S.primary}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        background: isUser ? `${S.primary}18` : S.surface2,
        border: `1px solid ${isUser ? `${S.primary}30` : S.border}`,
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        padding: '8px 11px',
      }}>
        {isEmpty ? (
          <div style={{ width: 60, height: 10, borderRadius: 4, background: S.surface3 }} />
        ) : message.error ? (
          <span style={{ fontSize: 12, color: S.error, lineHeight: 1.5 }}>{message.content}</span>
        ) : (
          <MarkdownText text={message.content} />
        )}
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <div style={{ fontSize: 12, color: S.text1, lineHeight: 1.65, wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const code = match ? match[2] : part.slice(3, -3);
          return (
            <pre key={i} style={{
              background: S.bg, border: `1px solid ${S.border}`,
              borderRadius: 6, padding: '8px 10px', margin: '6px 0',
              fontSize: 10, lineHeight: 1.6,
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              color: S.text2, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>{code}</pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: S.surface3, borderRadius: 3, padding: '1px 5px',
              fontFamily: "'Geist Mono', monospace", fontSize: 10.5, color: S.primary,
            }}>{part.slice(1, -1)}</code>
          );
        }
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{
              __html: part
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^### (.+)$/gm, '<span style="font-size:13px;font-weight:600;color:#fafafa">$1</span>')
                .replace(/^## (.+)$/gm, '<span style="font-size:14px;font-weight:700;color:#fafafa">$1</span>')
                .replace(/^# (.+)$/gm, '<span style="font-size:15px;font-weight:700;color:#fafafa">$1</span>'),
            }}
          />
        );
      })}
    </div>
  );
}

function ChatEmpty({ provider, model, onPrompt }: { provider: ChatProvider; model: string; onPrompt: (p: string) => void }) {
  const starters: Record<ChatProvider, string[]> = {
    'claude-cli': [
      'Explain the project structure to me',
      'What are the most important files to know?',
      'Review my recent git changes',
      'Help me write a commit message',
    ],
    'ollama': [
      'What can you help me with?',
      'Explain this code to me',
      'Write a bash script to...',
      'What is the best way to...',
    ],
    'openai': [
      'Help me debug this error',
      'Explain this concept simply',
      'Write a function that...',
      'What are best practices for...',
    ],
    'openrouter': [
      'Help me with a coding problem',
      'Explain this algorithm',
      'Write documentation for...',
      'Suggest improvements for...',
    ],
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${S.primary}15`, border: `1px solid ${S.primary}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: S.text1, letterSpacing: -0.3 }}>
          {PROVIDER_LABELS[provider]}
        </div>
        <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>{model}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 300 }}>
        {(starters[provider] ?? []).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPrompt(s)}
            style={{
              textAlign: 'left', padding: '8px 12px',
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 11, color: S.text2, lineHeight: 1.4,
              transition: 'border-color 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${S.primary}50`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel({ draft, onChange, onSave, onClose }: {
  draft: ProviderConfig;
  onChange: (d: ProviderConfig) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 34, background: S.surface3,
    border: `1px solid ${S.border}`, borderRadius: 7, padding: '0 10px',
    color: S.text1, fontSize: 11, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: S.text3, letterSpacing: 0.7,
    textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', background: S.surface,
        borderTop: `1px solid ${S.border}`,
        borderRadius: '12px 12px 0 0',
        padding: '16px 16px 28px',
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.text1, flex: 1 }}>Chat Settings</span>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: 'none', color: S.text3,
            cursor: 'pointer', padding: 4,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Provider */}
        <div>
          <label style={labelStyle}>Provider</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(Object.keys(PROVIDER_LABELS) as ChatProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ ...draft, provider: p, model: PROVIDER_MODELS[p][0] })}
                style={{
                  padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${draft.provider === p ? S.primary : S.border}`,
                  background: draft.provider === p ? `${S.primary}15` : S.surface2,
                  color: draft.provider === p ? S.primary : S.text2,
                  fontSize: 10, fontWeight: 500, fontFamily: 'inherit',
                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <span style={{ fontWeight: 600 }}>{PROVIDER_LABELS[p]}</span>
                {PROVIDER_FREE[p] && (
                  <span style={{ fontSize: 8, color: S.success }}>FREE</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label style={labelStyle}>Model</label>
          <select
            value={draft.model}
            onChange={(e) => onChange({ ...draft, model: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {PROVIDER_MODELS[draft.provider].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
        </div>

        {draft.model === '__custom__' && (
          <div>
            <label style={labelStyle}>Custom model name</label>
            <input
              type="text"
              placeholder="e.g. llama3.1:70b"
              style={inputStyle}
              onChange={(e) => onChange({ ...draft, model: e.target.value })}
            />
          </div>
        )}

        {/* API Key */}
        {(draft.provider === 'openai' || draft.provider === 'openrouter') && (
          <div>
            <label style={labelStyle}>API Key</label>
            <input
              type="password"
              value={draft.apiKey ?? ''}
              placeholder={draft.provider === 'openai' ? 'sk-...' : 'sk-or-...'}
              onChange={(e) => onChange({ ...draft, apiKey: e.target.value })}
              style={inputStyle}
              autoComplete="off"
            />
            <p style={{ fontSize: 9, color: S.text3, margin: '4px 0 0' }}>
              Stored locally in browser only — never sent to Termora servers.
              {draft.provider === 'openrouter' && ' Free models available at openrouter.ai.'}
            </p>
          </div>
        )}

        {/* Ollama URL */}
        {draft.provider === 'ollama' && (
          <div>
            <label style={labelStyle}>Ollama URL</label>
            <input
              type="text"
              value={draft.ollamaUrl ?? 'http://localhost:11434'}
              placeholder="http://localhost:11434"
              onChange={(e) => onChange({ ...draft, ollamaUrl: e.target.value })}
              style={inputStyle}
            />
            <p style={{ fontSize: 9, color: S.text3, margin: '4px 0 0' }}>
              Ollama must be running locally. Pull models with: <code style={{ color: S.primary }}>ollama pull llama3.1</code>
            </p>
          </div>
        )}

        {/* Info */}
        <div style={{
          padding: '10px 12px', background: S.surface2,
          border: `1px solid ${S.border}`, borderRadius: 8,
        }}>
          {draft.provider === 'claude-cli' && (
            <p style={{ fontSize: 10, color: S.text2, margin: 0, lineHeight: 1.5 }}>
              Uses your <strong style={{ color: S.primary }}>Claude Max subscription</strong> via the installed <code style={{ color: S.primary }}>claude</code> CLI. No extra cost.
            </p>
          )}
          {draft.provider === 'ollama' && (
            <p style={{ fontSize: 10, color: S.text2, margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: S.success }}>100% free</strong> — runs models locally on your machine. Install at{' '}
              <span style={{ color: S.primary }}>ollama.com</span>.
            </p>
          )}
          {draft.provider === 'openai' && (
            <p style={{ fontSize: 10, color: S.text2, margin: 0, lineHeight: 1.5 }}>
              Uses your OpenAI API key. <strong style={{ color: S.primary }}>gpt-4o-mini</strong> is cheapest. Check usage at platform.openai.com.
            </p>
          )}
          {draft.provider === 'openrouter' && (
            <p style={{ fontSize: 10, color: S.text2, margin: 0, lineHeight: 1.5 }}>
              Access 200+ models. Models tagged <strong style={{ color: S.success }}>:free</strong> have no cost. Get a key at openrouter.ai.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          style={{
            height: 38, borderRadius: 8, border: 'none',
            background: S.primary, color: S.bg,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
