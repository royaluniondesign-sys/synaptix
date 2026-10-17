import { useState, useCallback } from 'react';
import { useConnectionInfo } from '../hooks/useConnectionInfo';
import { useDevices } from '../hooks/useDevices';
import { formatRelativeTime } from '../lib/format-relative-time';
import type { SkinId, KeyboardMode, PerKeyColors } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

const S = {
  bg:          '#09090b',
  surface:     '#0c0c0f',
  surface2:    '#18181b',
  surface3:    '#27272a',
  border:      '#27272a',
  borderLight: '#3f3f46',
  primary:     '#a78bfa',
  success:     '#10b981',
  error:       '#ef4444',
  warning:     '#f59e0b',
  text1:       '#fafafa',
  text2:       '#a1a1aa',
  text3:       '#52525b',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SettingsViewProps {
  skin: SkinId;
  onSkinChange: (skin: SkinId) => void;
  perKeyColors: PerKeyColors;
  onPerKeyColorChange: (colors: PerKeyColors) => void;
  keyboardMode: KeyboardMode;
  onKeyboardModeChange: (mode: KeyboardMode) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
  authToken: string | null;
}

type Section =
  | 'agents' | 'providers' | 'chat-settings'
  | 'connection' | 'general'
  | 'appearance' | 'keyboard' | 'notifications' | 'shortcuts' | 'stats'
  | 'security' | 'privacy'
  | 'experimental';

interface NavItem {
  id: Section;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function Icon({ d, color = 'currentColor' }: { d: string | string[]; color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'AI Capabilities',
    items: [
      {
        id: 'agents',
        label: 'Agents',
        icon: <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
      },
      {
        id: 'providers',
        label: 'AI Provider Accounts',
        badge: 'Optional',
        icon: <Icon d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
      },
      {
        id: 'chat-settings',
        label: 'Chat',
        icon: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
      },
    ],
  },
  {
    title: 'Set Up',
    items: [
      {
        id: 'connection',
        label: 'Connection',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
      },
      {
        id: 'general',
        label: 'General',
        icon: <Icon d="M3 12h18M3 6h18M3 18h18" />,
      },
    ],
  },
  {
    title: 'Interface',
    items: [
      { id: 'appearance', label: 'Appearance', icon: <Icon d={['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']} /> },
      { id: 'keyboard', label: 'Keyboard', icon: <Icon d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /> },
      { id: 'notifications', label: 'Notifications', icon: <Icon d={['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']} /> },
      { id: 'shortcuts', label: 'Shortcuts', icon: <Icon d={['M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12z', 'M8 12h8M12 8v8']} /> },
      { id: 'stats', label: 'Stats & Usage', icon: <Icon d="M18 20V10M12 20V4M6 20v-6" /> },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { id: 'security', label: 'Auth & Devices', icon: <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} /> },
      { id: 'privacy', label: 'Privacy', icon: <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /> },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { id: 'experimental', label: 'Experimental', icon: <Icon d={['M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18']} /> },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ label, desc }: { label: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: S.text1, letterSpacing: -0.5, margin: 0 }}>{label}</h3>
      {desc && <p style={{ fontSize: 12, color: S.text3, margin: '4px 0 0' }}>{desc}</p>}
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.9, color: S.text3, textTransform: 'uppercase', margin: '14px 0 4px 4px' }}>
      {label}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: value ? S.primary : S.surface3,
        border: `1px solid ${value ? S.primary : S.border}`,
        padding: 0, cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'all 220ms ease-out',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: S.text1, transition: 'left 220ms ease-out',
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children, last, onClick }: {
  label: string; desc?: string;
  children?: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        borderBottom: last ? 'none' : `1px solid ${S.border}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: S.text3, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /**/ }
  }, [text]);
  return (
    <button type="button" onClick={() => void copy()} style={{
      height: 26, padding: '0 10px', borderRadius: 6, flexShrink: 0,
      border: `1px solid ${copied ? S.success : S.border}`,
      background: copied ? `${S.success}12` : S.surface3,
      color: copied ? S.success : S.text2,
      fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider icons
// ─────────────────────────────────────────────────────────────────────────────

function ProviderLogo({ id, size = 32 }: { id: string; size?: number }) {
  const s = size;
  const r = Math.round(s * 0.28);
  if (id === 'claude') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#D97757"/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="17" fontWeight="700" fontFamily="Georgia,serif">A</text>
    </svg>
  );
  if (id === 'codex') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#0d0d0d"/>
      <text x="16" y="21" textAnchor="middle" fill="#10a37f" fontSize="13" fontWeight="700" fontFamily="monospace">{'{/}'}</text>
    </svg>
  );
  if (id === 'ollama') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#1c1c1e" stroke="#3f3f46" strokeWidth="1"/>
      <ellipse cx="16" cy="18" rx="6" ry="5" fill="white" opacity="0.9"/>
      <circle cx="13.5" cy="16" r="1.5" fill="#1c1c1e"/>
      <circle cx="18.5" cy="16" r="1.5" fill="#1c1c1e"/>
      <path d="M12 10 Q16 7 20 10" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  );
  if (id === 'openai') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#10a37f"/>
      <path d="M16 6a7 7 0 0 1 6.73 8.96A5.5 5.5 0 0 1 25 19.5a5.5 5.5 0 0 1-5.5 5.5h-7A5.5 5.5 0 0 1 7 19.5a5.5 5.5 0 0 1 2.27-4.47A7 7 0 0 1 16 6z" fill="white" opacity="0.92"/>
    </svg>
  );
  if (id === 'openrouter') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#6366f1"/>
      <path d="M8 16h16M20 12l4 4-4 4M12 12l-4 4 4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (id === 'grok') return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill="#000"/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif">𝕏</text>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx={r} fill={S.surface3} stroke={S.border}/>
      <text x="16" y="21" textAnchor="middle" fill={S.text3} fontSize="13" fontFamily="monospace">AI</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Agents
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_AGENT_KEY = 'termora_default_agent';
const DEFAULT_AGENTS = [
  { id: 'auto', label: 'Auto', desc: 'Best available agent for the task' },
  { id: 'none', label: 'No agent (blank terminal)', desc: 'Raw shell, no AI assistance' },
  { id: 'claude', label: 'Claude', desc: 'claude CLI — uses that CLI\'s own sign-in' },
  { id: 'codex', label: 'Codex', desc: 'codex CLI — OpenAI Codex agent' },
  { id: 'ollama', label: 'Ollama', desc: 'Local LLM — free, runs on your machine' },
];

function AgentsSection() {
  const [defaultAgent, setDefaultAgent] = useState(
    () => localStorage.getItem(DEFAULT_AGENT_KEY) ?? 'auto'
  );
  const [agentHooks, setAgentHooks] = useState(true);
  const [trustFolder, setTrustFolder] = useState(false);
  const [autoTitles, setAutoTitles] = useState(true);
  const [keepAwake, setKeepAwake] = useState<'on' | 'agent' | 'off'>('agent');

  const setAgent = (id: string) => {
    setDefaultAgent(id);
    localStorage.setItem(DEFAULT_AGENT_KEY, id);
  };

  return (
    <>
      <SectionTitle label="Agents" desc="Manage AI agents, set a default, and customize commands." />

      <GroupLabel label="Default Agent" />
      <Card>
        {DEFAULT_AGENTS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAgent(a.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: i < DEFAULT_AGENTS.length - 1 ? `1px solid ${S.border}` : 'none',
              background: defaultAgent === a.id ? `${S.primary}10` : 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <ProviderLogo id={a.id === 'auto' ? 'claude' : a.id === 'none' ? 'none' : a.id} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: defaultAgent === a.id ? 600 : 400, color: defaultAgent === a.id ? S.text1 : S.text2 }}>
                {a.label}
                {defaultAgent === a.id && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: S.primary, background: `${S.primary}18`, padding: '1px 6px', borderRadius: 4, border: `1px solid ${S.primary}30` }}>DEFAULT</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: S.text3, marginTop: 1 }}>{a.desc}</div>
            </div>
            {defaultAgent === a.id && (
              <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </Card>

      <GroupLabel label="Behavior" />
      <Card>
        <SettingRow
          label="Agent status hooks"
          desc="Shows working, waiting, and done states in Termora. Turn off to remove Termora-managed hooks."
        >
          <Toggle value={agentHooks} onChange={setAgentHooks} />
        </SettingRow>
        <SettingRow
          label="Trust the folder when Termora starts an agent"
          desc='Agents Termora starts skip the "Do you trust this folder?" prompt so hooks run immediately.'
        >
          <Toggle value={trustFolder} onChange={setTrustFolder} />
        </SettingRow>
        <SettingRow
          label="Auto-generate session names"
          desc="Derive short stable names from the first known agent prompt. Manual renames always win."
        >
          <Toggle value={autoTitles} onChange={setAutoTitles} />
        </SettingRow>
        <SettingRow label="Keep computer awake" desc="Prevent idle sleep while agents work so long runs finish." last>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['on', 'agent', 'off'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setKeepAwake(v)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 6,
                  border: `1px solid ${keepAwake === v ? S.primary : S.border}`,
                  background: keepAwake === v ? `${S.primary}15` : 'transparent',
                  color: keepAwake === v ? S.primary : S.text3,
                  fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {v === 'on' ? 'On' : v === 'agent' ? 'Agent' : 'Off'}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      <GroupLabel label="CLI Integration" />
      <Card>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: S.text2, marginBottom: 10, lineHeight: 1.6 }}>
            Add a new agent by running this command in a terminal on the Termora host:
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <code style={{
              flex: 1, fontSize: 11, color: S.primary, fontFamily: "'JetBrains Mono', monospace",
              background: S.bg, padding: '7px 10px', borderRadius: 7,
              border: `1px solid ${S.border}`, overflow: 'auto', whiteSpace: 'nowrap',
            }}>
              termora agent add --name my-agent --command claude
            </code>
            <CopyButton text="termora agent add --name my-agent --command claude" />
          </div>
          <div style={{ fontSize: 10, color: S.text3 }}>
            Registered agents appear in the Default Agent list above and in the Agents view.
          </div>
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: AI Provider Accounts
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS_CONFIG = [
  {
    id: 'claude',
    label: 'Claude',
    desc: 'Optional. Termora works with your existing claude CLI login; add accounts only if you want quick switching.',
    free: true,
    type: 'cli' as const,
    cliCmd: 'claude auth login',
    hint: 'Uses the sign-in of the claude CLI on this machine.',
  },
  {
    id: 'codex',
    label: 'Codex',
    desc: 'Optional. Uses your Codex CLI login. Each account keeps its own local sign-in context.',
    free: false,
    type: 'cli' as const,
    cliCmd: 'codex login',
    hint: 'Requires Codex CLI v0.136.0+.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    desc: '100% free — runs LLMs locally on your machine. No API key needed.',
    free: true,
    type: 'url' as const,
    storageKey: 'termora_ollama_url',
    placeholder: 'http://localhost:11434',
    hint: 'Pull models: ollama pull llama3.1',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    desc: 'API key for GPT-4o, gpt-4o-mini, and other OpenAI models.',
    free: false,
    type: 'key' as const,
    storageKey: 'termora_chat_openai_key',
    placeholder: 'sk-...',
    hint: 'Get your key at platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    desc: 'Access 200+ models. Models tagged :free have no cost.',
    free: true,
    type: 'key' as const,
    storageKey: 'termora_chat_openrouter_key',
    placeholder: 'sk-or-...',
    hint: 'Get a free key at openrouter.ai — free-tier models available.',
  },
  {
    id: 'grok',
    label: 'Grok (xAI)',
    desc: 'Shows weekly credit usage from your Grok CLI sign-in.',
    free: false,
    type: 'cli' as const,
    cliCmd: 'grok login',
    hint: 'Run grok login in a terminal, then refresh here.',
  },
];

function ProviderAccountCard({ provider }: { provider: typeof PROVIDERS_CONFIG[0] }) {
  const [value, setValue] = useState(() => {
    if (provider.type === 'key' || provider.type === 'url') {
      return localStorage.getItem(provider.storageKey ?? '') ?? '';
    }
    return '';
  });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const save = () => {
    if (provider.storageKey) localStorage.setItem(provider.storageKey, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const forget = () => {
    if (provider.storageKey) localStorage.removeItem(provider.storageKey);
    setValue('');
  };

  const hasValue = value.trim().length > 0;

  return (
    <Card style={{ marginBottom: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 10px' }}>
        <ProviderLogo id={provider.id} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: S.text1 }}>{provider.label}</span>
            {provider.free && <Chip label="FREE" color={S.success} />}
          </div>
          <div style={{ fontSize: 11, color: S.text3, marginTop: 2, lineHeight: 1.4 }}>{provider.desc}</div>
        </div>
        {hasValue && <Chip label="ACTIVE" color={S.success} />}
      </div>

      <div style={{ borderTop: `1px solid ${S.border}`, padding: '12px 14px' }}>
        {/* CLI providers */}
        {provider.type === 'cli' && (
          <>
            <div style={{ fontSize: 11, color: S.text2, marginBottom: 8 }}>
              Sign in by running in a terminal:
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <code style={{
                flex: 1, fontSize: 11, color: S.primary, fontFamily: "'JetBrains Mono', monospace",
                background: S.bg, padding: '7px 10px', borderRadius: 7,
                border: `1px solid ${S.border}`,
              }}>
                {provider.cliCmd}
              </code>
              <CopyButton text={provider.cliCmd ?? ''} />
            </div>
            <p style={{ fontSize: 10, color: S.text3 }}>{provider.hint}</p>
          </>
        )}

        {/* URL providers (Ollama) */}
        {provider.type === 'url' && (
          <>
            <label style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              API URL
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={provider.placeholder}
                style={{
                  flex: 1, height: 34, background: S.surface3, border: `1px solid ${S.border}`,
                  borderRadius: 7, padding: '0 10px', color: S.text1, fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={save} style={{
                height: 34, padding: '0 12px', borderRadius: 7, border: 'none',
                background: saved ? S.success : S.primary, color: S.bg,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {saved ? 'Saved!' : 'Save'}
              </button>
              {hasValue && (
                <button type="button" onClick={forget} style={{
                  height: 34, padding: '0 10px', borderRadius: 7,
                  border: `1px solid ${S.error}44`, background: `${S.error}10`,
                  color: S.error, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: S.text3 }}>{provider.hint}</p>
          </>
        )}

        {/* API Key providers */}
        {provider.type === 'key' && (
          <>
            <label style={{ fontSize: 10, fontWeight: 600, color: S.text3, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              API Key
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={provider.placeholder}
                  autoComplete="off"
                  style={{
                    width: '100%', height: 34, background: S.surface3, border: `1px solid ${S.border}`,
                    borderRadius: 7, padding: '0 36px 0 10px', color: S.text1, fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 2,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showKey
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
              <button type="button" onClick={save} style={{
                height: 34, padding: '0 12px', borderRadius: 7, border: 'none',
                background: saved ? S.success : S.primary, color: S.bg,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>
                {saved ? 'Saved!' : 'Save'}
              </button>
              {hasValue && (
                <button type="button" onClick={forget} style={{
                  height: 34, padding: '0 10px', borderRadius: 7, flexShrink: 0,
                  border: `1px solid ${S.error}44`, background: `${S.error}10`,
                  color: S.error, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Forget
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: S.text3 }}>{provider.hint}</p>
            <p style={{ fontSize: 10, color: S.text3, marginTop: 4 }}>
              Saved in this browser and sent with each chat message to the Termora agent, which forwards it to the provider. Over a public tunnel it also passes through the tunnel provider; use TUNNEL=local to avoid that.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

function ProvidersSection() {
  return (
    <>
      <SectionTitle
        label="AI Provider Accounts"
        desc="Optional. Termora works with your existing provider logins; add keys only if you want Termora to help switch between them."
      />
      {PROVIDERS_CONFIG.map((p) => <ProviderAccountCard key={p.id} provider={p} />)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Chat Settings
// ─────────────────────────────────────────────────────────────────────────────

function ChatSettingsSection() {
  const [streaming, setStreaming] = useState(true);
  const [history, setHistory] = useState(true);
  const [maxHistory, setMaxHistory] = useState(200);

  return (
    <>
      <SectionTitle label="Chat" desc="Configure in-app AI chat behavior." />

      <GroupLabel label="Behavior" />
      <Card>
        <SettingRow label="Streaming responses" desc="Show tokens as they arrive for a faster feel">
          <Toggle value={streaming} onChange={setStreaming} />
        </SettingRow>
        <SettingRow label="Persist history" desc="Save chat messages in browser storage across sessions" last>
          <Toggle value={history} onChange={setHistory} />
        </SettingRow>
      </Card>

      <GroupLabel label="History" />
      <Card>
        <SettingRow label="Max messages to keep" desc={`Keeps the last ${maxHistory} messages per conversation`} last>
          <div style={{ display: 'flex', gap: 4 }}>
            {[50, 100, 200, 500].map((n) => (
              <button key={n} type="button" onClick={() => setMaxHistory(n)} style={{
                height: 26, padding: '0 9px', borderRadius: 6,
                border: `1px solid ${maxHistory === n ? S.primary : S.border}`,
                background: maxHistory === n ? `${S.primary}15` : 'transparent',
                color: maxHistory === n ? S.primary : S.text3,
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{n}</button>
            ))}
          </div>
        </SettingRow>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Connection
// ─────────────────────────────────────────────────────────────────────────────

function ConnectionSection({ connectionStatus, latencyMs }: { connectionStatus: ConnectionStatus; latencyMs: number | null }) {
  const { info, refresh } = useConnectionInfo();
  const authUrl = info.authUrl;
  const isConnected = connectionStatus === 'connected';
  const statusColor = isConnected ? S.success : connectionStatus === 'reconnecting' ? S.warning : S.error;
  const statusLabel = isConnected ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting…' : 'Offline';

  return (
    <>
      <SectionTitle label="Connection" desc="Agent WebSocket and authentication status." />

      <GroupLabel label="Agent" />
      <Card>
        <SettingRow label="Status" desc={info.machineName ?? 'This machine'}>
          <Chip label={statusLabel} color={statusColor} />
        </SettingRow>
        <SettingRow label="Latency" desc="WebSocket round-trip" last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              color: latencyMs == null ? S.text3 : latencyMs < 30 ? S.success : latencyMs < 100 ? S.warning : S.error,
            }}>
              {latencyMs != null ? `${latencyMs}ms` : '—'}
            </span>
            <button type="button" onClick={refresh} style={{
              width: 26, height: 26, borderRadius: 6, border: `1px solid ${S.border}`,
              background: 'transparent', color: S.text3, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>
        </SettingRow>
      </Card>

      {authUrl && (
        <>
          <GroupLabel label="One-Click Access URL" />
          <Card>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: S.text2, marginBottom: 8, lineHeight: 1.5 }}>
                Open on any device — authentication token embedded. Share with trusted devices only.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, fontSize: 10, color: S.primary, fontFamily: "'JetBrains Mono', monospace",
                  background: S.bg, padding: '7px 10px', borderRadius: 7, border: `1px solid ${S.border}`,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                }}>
                  {authUrl}
                </code>
                <CopyButton text={authUrl} label="Copy link" />
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Appearance
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL_THEMES = [
  { id: 'obsidian', name: 'Obsidian', bg: '#09090b', cursor: '#a78bfa' },
  { id: 'midnight', name: 'Midnight', bg: '#030712', cursor: '#60a5fa' },
  { id: 'forest',   name: 'Forest',   bg: '#0a0f0a', cursor: '#34d399' },
  { id: 'amber',    name: 'Amber',    bg: '#0c0a00', cursor: '#fbbf24' },
];

const SKINS: { id: SkinId; name: string; subtitle: string; color: string }[] = [
  { id: 'macbook-silver', name: 'MacBook Silver', subtitle: 'Clean aluminum finish', color: '#e4e4e7' },
  { id: 'ios-terminal',   name: 'iOS Terminal',   subtitle: 'Dark glass feel',        color: '#27272a' },
  { id: 'gamer-rgb',      name: 'Hyperion Gamer', subtitle: 'RGB rainbow backlit',    color: '#0d001a' },
  { id: 'custom-painted', name: 'Custom Painted', subtitle: 'Violet-accent labels',   color: '#18181b' },
  { id: 'amber-retro',    name: 'Retro PTY',      subtitle: 'Amber terminal nostalgia', color: '#0c0a00' },
  { id: 'ice-white',      name: 'Ice White',      subtitle: 'Bright, clean keys',     color: '#f4f4f5' },
];

function AppearanceSection({ skin, onSkinChange }: { skin: SkinId; onSkinChange: (s: SkinId) => void }) {
  const [termTheme, setTermTheme] = useState(
    () => localStorage.getItem('termora_theme') ?? 'obsidian'
  );

  const setTheme = (id: string) => {
    setTermTheme(id);
    localStorage.setItem('termora_theme', id);
  };

  return (
    <>
      <SectionTitle label="Appearance" desc="Terminal theme, keyboard skin, and display preferences." />

      <GroupLabel label="Terminal Theme" />
      <Card>
        {TERMINAL_THEMES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              borderBottom: i < TERMINAL_THEMES.length - 1 ? `1px solid ${S.border}` : 'none',
              background: termTheme === t.id ? `${S.primary}10` : 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 24, borderRadius: 6, background: t.bg,
              border: `1px solid ${S.borderLight}`,
              display: 'flex', alignItems: 'center', paddingLeft: 6, gap: 3, flexShrink: 0,
            }}>
              <div style={{ width: 3, height: 12, borderRadius: 1, background: t.cursor }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: termTheme === t.id ? 600 : 400, color: termTheme === t.id ? S.text1 : S.text2, flex: 1 }}>
              {t.name}
            </span>
            {termTheme === t.id && <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </Card>

      <GroupLabel label="Keyboard Skin" />
      <Card>
        {SKINS.map((sk, i) => (
          <button
            key={sk.id}
            type="button"
            onClick={() => onSkinChange(sk.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              borderBottom: i < SKINS.length - 1 ? `1px solid ${S.border}` : 'none',
              background: skin === sk.id ? `${S.primary}10` : 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 24, borderRadius: 6, background: sk.color,
              border: `1px solid ${S.borderLight}`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              {['#ef4444','#a78bfa','#10b981'].map((c) => (
                <div key={c} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: skin === sk.id ? 600 : 400, color: skin === sk.id ? S.text1 : S.text2 }}>{sk.name}</div>
              <div style={{ fontSize: 10, color: S.text3 }}>{sk.subtitle}</div>
            </div>
            {skin === sk.id && <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Keyboard
// ─────────────────────────────────────────────────────────────────────────────

function KeyboardSection({ keyboardMode, onKeyboardModeChange }: { keyboardMode: KeyboardMode; onKeyboardModeChange: (m: KeyboardMode) => void }) {
  const [haptic, setHaptic] = useState(70);
  const [repeatDelay, setRepeatDelay] = useState(350);
  const [sound, setSound] = useState(false);
  const modes: { id: KeyboardMode; label: string; desc: string }[] = [
    { id: 'custom',   label: 'Virtual',  desc: 'Custom keyboard skins with haptics' },
    { id: 'system',   label: 'Native',   desc: 'Device OS keyboard (iOS, Android)' },
    { id: 'physical', label: 'Hardware', desc: 'External/Bluetooth only — no virtual keyboard' },
  ];

  return (
    <>
      <SectionTitle label="Keyboard" desc="Input mode, skins, haptics, and timing." />
      <GroupLabel label="Input Mode" />
      <Card>
        {modes.map((m, i) => (
          <button key={m.id} type="button" onClick={() => onKeyboardModeChange(m.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderBottom: i < modes.length - 1 ? `1px solid ${S.border}` : 'none',
            background: keyboardMode === m.id ? `${S.primary}10` : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${keyboardMode === m.id ? S.primary : S.border}`,
              background: keyboardMode === m.id ? S.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {keyboardMode === m.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.bg }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: keyboardMode === m.id ? 600 : 400, color: keyboardMode === m.id ? S.text1 : S.text2 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: S.text3, marginTop: 1 }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </Card>
      <GroupLabel label="Haptics & Timing" />
      <Card>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Haptic Intensity</span>
            <span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono', monospace" }}>{haptic}%</span>
          </div>
          <input type="range" min={0} max={100} value={haptic} onChange={(e) => setHaptic(Number(e.target.value))}
            style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right, ${S.primary} ${haptic}%, ${S.surface3} ${haptic}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }}
          />
        </div>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Key Repeat Delay</span>
            <span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono', monospace" }}>{repeatDelay}ms</span>
          </div>
          <input type="range" min={100} max={800} value={repeatDelay} onChange={(e) => setRepeatDelay(Number(e.target.value))}
            style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right, ${S.primary} ${((repeatDelay-100)/700)*100}%, ${S.surface3} ${((repeatDelay-100)/700)*100}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }}
          />
        </div>
        <SettingRow label="Key click sound" last>
          <Toggle value={sound} onChange={setSound} />
        </SettingRow>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Notifications
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsSection() {
  const [inApp, setInApp] = useState(true);
  const [osNotifs, setOsNotifs] = useState(false);
  const [onDone, setOnDone] = useState(true);
  const [onFail, setOnFail] = useState(true);

  const requestOsPermission = async () => {
    if (!('Notification' in window)) { alert('Your browser does not support notifications.'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') setOsNotifs(true);
  };

  return (
    <>
      <SectionTitle label="Notifications" desc="Control when and how Termora notifies you." />
      <GroupLabel label="Channels" />
      <Card>
        <SettingRow label="In-app notifications" desc="Show events in the Notifications tab with unread badge">
          <Toggle value={inApp} onChange={setInApp} />
        </SettingRow>
        <SettingRow label="macOS / browser notifications" desc="Native OS notification when a job finishes, even in background" last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {osNotifs
              ? <Chip label="ENABLED" color={S.success} />
              : <button type="button" onClick={() => void requestOsPermission()} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${S.primary}44`, background: `${S.primary}10`, color: S.primary, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Enable</button>
            }
            <Toggle value={osNotifs} onChange={setOsNotifs} />
          </div>
        </SettingRow>
      </Card>
      <GroupLabel label="Events" />
      <Card>
        <SettingRow label="Job completed" desc="Notify when a background task finishes successfully">
          <Toggle value={onDone} onChange={setOnDone} />
        </SettingRow>
        <SettingRow label="Job failed" desc="Notify when a background task errors" last>
          <Toggle value={onFail} onChange={setOnFail} />
        </SettingRow>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Shortcuts
// ─────────────────────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { label: 'Quick Open',     keys: ['⌘ / Ctrl', 'K'] },
  { label: 'Settings',       keys: ['⌘ / Ctrl', ','] },
  { label: 'Copy selection', keys: ['⌘ / Ctrl', 'C'] },
  { label: 'Paste',          keys: ['⌘ / Ctrl', 'V'] },
];

function ShortcutsSection() {
  return (
    <>
      <SectionTitle label="Shortcuts" desc="Keyboard shortcuts available in Termora." />
      <Card>
        {SHORTCUTS.map((s, i) => (
          <SettingRow key={s.label} label={s.label} last={i === SHORTCUTS.length - 1}>
            <div style={{ display: 'flex', gap: 3 }}>
              {s.keys.map((k) => (
                <kbd key={k} style={{
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                  background: S.surface3, border: `1px solid ${S.borderLight}`,
                  borderRadius: 4, padding: '2px 7px', color: S.text2,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
                }}>
                  {k}
                </kbd>
              ))}
            </div>
          </SettingRow>
        ))}
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Stats
// ─────────────────────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <>
      <SectionTitle label="Stats & Usage" desc="Session activity and resource usage." />
      <Card>
        <div style={{ padding: '12px 14px', fontSize: 11, color: S.text3, lineHeight: 1.6 }}>
          Not implemented yet. Termora does not count sessions, commands or traffic, and sends no usage data anywhere.
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Security
// ─────────────────────────────────────────────────────────────────────────────

function SecuritySection({ authToken }: { authToken: string | null }) {
  const devicesState = useDevices(authToken);
  return (
    <>
      <SectionTitle label="Auth & Devices" desc="Authentication status, active devices, and session management." />
      <GroupLabel label="Authentication" />
      <Card>
        <SettingRow label="Auth method" desc="Static JWT token — never expires unless revoked">
          <Chip label="ACTIVE" color={S.success} />
        </SettingRow>
        <SettingRow label="Token scope" desc="Full PTY + WebSocket access">
          <span style={{ fontSize: 11, color: S.text3, fontFamily: "'JetBrains Mono', monospace" }}>PTY · WS</span>
        </SettingRow>
        <SettingRow label="Rate limiting" desc="Auth endpoints: 10 req / 15 min" last>
          <Chip label="ON" color={S.success} />
        </SettingRow>
      </Card>

      <GroupLabel label="Devices" />
      <Card>
        {devicesState.loading && (
          <div style={{ padding: '14px', fontSize: 11, color: S.text3, textAlign: 'center' }}>Loading devices…</div>
        )}
        {!devicesState.loading && devicesState.devices.length === 0 && (
          <div style={{ padding: '14px', fontSize: 11, color: S.text3, textAlign: 'center' }}>No devices signed in</div>
        )}
        {devicesState.devices.map((device, i) => (
          <SettingRow
            key={device.id}
            label={device.deviceName || 'Unknown device'}
            desc={`${device.current ? 'This device · ' : ''}Last seen ${formatRelativeTime(device.lastSeen)}`}
            last={i === devicesState.devices.length - 1}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {device.current && <Chip label="THIS DEVICE" color={S.success} />}
              <button type="button" onClick={() => void devicesState.revoke(device.id)} style={{
                height: 26, padding: '0 10px', borderRadius: 6,
                border: `1px solid ${S.error}44`, background: `${S.error}10`,
                color: S.error, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {device.current ? 'Sign out' : 'Revoke'}
              </button>
            </div>
          </SettingRow>
        ))}
      </Card>
      <button type="button" onClick={() => void devicesState.revokeAll()} style={{
        width: '100%', height: 38, borderRadius: 8, marginTop: 4,
        border: `1px solid ${S.error}44`, background: `${S.error}10`,
        color: S.error, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Sign Out All Devices
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Privacy
// ─────────────────────────────────────────────────────────────────────────────

function PrivacySection() {
  const [telemetry, setTelemetry] = useState(false);
  const [crashReports, setCrashReports] = useState(false);
  return (
    <>
      <SectionTitle label="Privacy" desc="Control what data Termora collects and shares." />
      <Card>
        <SettingRow label="Usage telemetry" desc="Anonymous session counts and feature usage. Never contains terminal content.">
          <Toggle value={telemetry} onChange={setTelemetry} />
        </SettingRow>
        <SettingRow label="Crash reports" desc="Automatically send crash logs to help fix bugs" last>
          <Toggle value={crashReports} onChange={setCrashReports} />
        </SettingRow>
      </Card>
      <Card style={{ marginTop: 10 }}>
        <div style={{ padding: '12px 14px', fontSize: 11, color: S.text3, lineHeight: 1.6 }}>
          All API keys and tokens are stored only in your browser's localStorage. Termora's backend never
          receives or logs your AI provider credentials.
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Experimental
// ─────────────────────────────────────────────────────────────────────────────

function ExperimentalSection() {
  const [agentDashboard, setAgentDashboard] = useState(false);
  const [autoResume, setAutoResume] = useState(false);
  const [pet, setPet] = useState(false);
  const [agentSleep, setAgentSleep] = useState(false);
  const [worktreeCards, setWorktreeCards] = useState(false);
  const [sleepAfter, setSleepAfter] = useState(30);

  return (
    <>
      <SectionTitle label="Experimental" desc="New features that are still taking shape. Give them a try." />
      <Card>
        <SettingRow label="Agent Dashboard" desc="Adds an Agent Dashboard entry to the sidebar. Monitor agents that need you, are working, or are done.">
          <Toggle value={agentDashboard} onChange={setAgentDashboard} />
        </SettingRow>
        <SettingRow label="Auto-resume chats" desc="When Termora restarts, automatically resume chats that were working.">
          <Toggle value={autoResume} onChange={setAutoResume} />
        </SettingRow>
        <SettingRow label="Status bar pet" desc="Shows a small animated pet (Claudino, Codex bot, or custom image) pinned to the bottom-right corner.">
          <Toggle value={pet} onChange={setPet} />
        </SettingRow>
        <SettingRow label="Worktree card preview" desc="Preview updated worktree-card layout, metadata placement, and status presentation.">
          <Toggle value={worktreeCards} onChange={setWorktreeCards} />
        </SettingRow>
        <SettingRow label="Agent sleep" desc="Stop idle background agent terminals after a timeout and resume supported sessions when you open them." last>
          <Toggle value={agentSleep} onChange={setAgentSleep} />
        </SettingRow>
      </Card>
      {agentSleep && (
        <Card style={{ marginTop: 10 }}>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Sleep after</span>
              <span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono', monospace" }}>{sleepAfter} minutes</span>
            </div>
            <input type="range" min={5} max={120} step={5} value={sleepAfter} onChange={(e) => setSleepAfter(Number(e.target.value))}
              style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right, ${S.primary} ${((sleepAfter-5)/115)*100}%, ${S.surface3} ${((sleepAfter-5)/115)*100}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }}
            />
            <div style={{ fontSize: 10, color: S.text3, marginTop: 6 }}>How many idle minutes a completed background agent must wait before Termora can sleep it.</div>
          </div>
        </Card>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SettingsView
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsView({
  skin, onSkinChange,
  perKeyColors: _perKeyColors, onPerKeyColorChange: _onPerKeyColorChange,
  keyboardMode, onKeyboardModeChange,
  connectionStatus, latencyMs, authToken,
}: SettingsViewProps) {
  const [section, setSection] = useState<Section>('agents');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (section) {
      case 'agents':       return <AgentsSection />;
      case 'providers':    return <ProvidersSection />;
      case 'chat-settings': return <ChatSettingsSection />;
      case 'connection':   return <ConnectionSection connectionStatus={connectionStatus} latencyMs={latencyMs} />;
      case 'general':      return <GeneralSection />;
      case 'appearance':   return <AppearanceSection skin={skin} onSkinChange={onSkinChange} />;
      case 'keyboard':     return <KeyboardSection keyboardMode={keyboardMode} onKeyboardModeChange={onKeyboardModeChange} />;
      case 'notifications': return <NotificationsSection />;
      case 'shortcuts':    return <ShortcutsSection />;
      case 'stats':        return <StatsSection />;
      case 'security':     return <SecuritySection authToken={authToken} />;
      case 'privacy':      return <PrivacySection />;
      case 'experimental': return <ExperimentalSection />;
      default:             return <AgentsSection />;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: S.bg }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 200 : 0,
        minWidth: sidebarOpen ? 200 : 0,
        overflow: 'hidden',
        borderRight: `1px solid ${S.border}`,
        background: S.surface,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease, min-width 200ms ease',
        flexShrink: 0,
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              flex: 1, position: 'relative',
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span style={{ fontSize: 11, color: S.text3 }}>Search settings</span>
              <kbd style={{ marginLeft: 'auto', fontSize: 9, color: S.text3, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 3, padding: '0 4px' }}>⌘F</kbd>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px', scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: S.text3, textTransform: 'uppercase', padding: '10px 4px 4px' }}>
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    style={{
                      width: '100%', height: 32, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '0 8px', borderRadius: 7, border: 'none', marginBottom: 1,
                      background: active ? `${S.primary}14` : 'transparent',
                      color: active ? S.primary : S.text2,
                      fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: 'inherit',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 120ms ease-out',
                    }}
                  >
                    <span style={{ color: active ? S.primary : S.text3, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: S.text3, background: S.surface3, padding: '1px 5px', borderRadius: 4, border: `1px solid ${S.border}`, flexShrink: 0 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>

        <div style={{ padding: '8px 12px', borderTop: `1px solid ${S.border}` }}>
          <span style={{ fontSize: 9, color: S.text3 }}>v{__APP_VERSION__} · RUD Lab</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Content header */}
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}`, background: S.surface, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            style={{ background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>
            {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === section)?.label ?? 'Settings'}
          </span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 40px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// General section (simple placeholder)
// ─────────────────────────────────────────────────────────────────────────────

function GeneralSection() {
  const [language, setLanguage] = useState('en');
  return (
    <>
      <SectionTitle label="General" desc="General Termora preferences." />
      <Card>
        <SettingRow label="Language" desc="UI language (terminal output language is set by the shell)" last>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{
            background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 6,
            color: S.text2, fontSize: 11, padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </SettingRow>
      </Card>
      <Card style={{ marginTop: 10 }}>
        <SettingRow label="About Termora" desc={`Version ${__APP_VERSION__} — Built by RUD Lab`} last>
          <span style={{ fontSize: 10, color: S.text3 }}>MIT License</span>
        </SettingRow>
      </Card>
    </>
  );
}
