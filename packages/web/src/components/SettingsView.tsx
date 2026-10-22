import { useState, useEffect } from 'react';
import { useConnectionInfo } from '../hooks/useConnectionInfo';
import { useDevices } from '../hooks/useDevices';
import { formatRelativeTime } from '../lib/format-relative-time';
import type { SkinId, KeyboardMode, PerKeyColors } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';
import { T as S } from '../lib/design';

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
  onBack?: () => void;
}

type SectionId =
  | 'agents' | 'providers' | 'orchestration' | 'computer-use' | 'voice'
  | 'account' | 'general' | 'integrations' | 'mobile'
  | 'automations' | 'artifacts' | 'share-skills' | 'session-search' | 'git'
  | 'task-sources' | 'terminal' | 'quick-commands' | 'browser' | 'mobile-emulator' | 'floating-workspace'
  | 'appearance' | 'chat' | 'input-editing' | 'notifications' | 'shortcuts' | 'stats'
  | 'ssh-hosts' | 'remote-servers'
  | 'macos-permissions' | 'privacy'
  | 'advanced' | 'experimental' | 'plugins';

interface NavItem { id: SectionId; label: string; badge?: string }
interface NavGroup { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: 'AI Capabilities', items: [
    { id: 'agents', label: 'Agents' },
    { id: 'providers', label: 'AI Provider Accounts', badge: 'Optional' },
    { id: 'orchestration', label: 'Orchestration' },
    { id: 'computer-use', label: 'Computer Use' },
    { id: 'voice', label: 'Voice' },
  ]},
  { title: 'Set Up', items: [
    { id: 'account', label: 'Synaptix Account' },
    { id: 'general', label: 'General' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'mobile', label: 'Mobile' },
  ]},
  { title: 'Workflows', items: [
    { id: 'automations', label: 'Automations' },
    { id: 'artifacts', label: 'Artifacts', badge: 'Beta' },
    { id: 'share-skills', label: 'Share Skills', badge: 'Beta' },
    { id: 'session-search', label: 'Agent Session Search' },
    { id: 'git', label: 'Git & Source Control' },
    { id: 'task-sources', label: 'Task Sources' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'quick-commands', label: 'Quick Commands' },
    { id: 'browser', label: 'Browser' },
    { id: 'mobile-emulator', label: 'Mobile Emulator' },
    { id: 'floating-workspace', label: 'Floating Workspace' },
  ]},
  { title: 'Interface', items: [
    { id: 'appearance', label: 'Appearance' },
    { id: 'chat', label: 'Chat' },
    { id: 'input-editing', label: 'Input & Editing' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'stats', label: 'Stats & Usage' },
  ]},
  { title: 'Remote Hosts', items: [
    { id: 'ssh-hosts', label: 'SSH Hosts' },
    { id: 'remote-servers', label: 'Remote Synaptix Servers', badge: 'Beta' },
  ]},
  { title: 'Privacy & Security', items: [
    { id: 'macos-permissions', label: 'macOS Permissions' },
    { id: 'privacy', label: 'Privacy & Telemetry' },
  ]},
  { title: 'Advanced', items: [
    { id: 'advanced', label: 'Advanced' },
  ]},
  { title: 'Experimental', items: [
    { id: 'experimental', label: 'Experimental' },
    { id: 'plugins', label: 'Plugins' },
  ]},
];

const PROJECTS = ['RUD-WEB', 'Synaptix', 'excited-bohr', 'excited-tesla', 'intelligent-galileo', 'serene-raman'];

// ─── primitives ───────────────────────────────────────────────────────────────

function STitle({ label, desc }: { label: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: S.text1, margin: 0, letterSpacing: -0.5 }}>{label}</h3>
      {desc && <p style={{ fontSize: 12, color: S.text3, margin: '5px 0 0', lineHeight: 1.55 }}>{desc}</p>}
    </div>
  );
}
function GLabel({ label }: { label: string }) {
  return <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.9, color: S.text3, textTransform: 'uppercase', margin: '16px 0 5px' }}>{label}</div>;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8, ...style }}>{children}</div>;
}
function Row({ label, desc, children, last }: { label: string; desc?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: last ? 'none' : `1px solid ${S.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: S.text3, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, flexShrink: 0, background: value ? S.primary : S.surface3, border: `1px solid ${value ? S.primary : S.border}`, padding: 0, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'all 180ms', opacity: disabled ? 0.4 : 1 }}>
      <span style={{ position: 'absolute', top: 3, left: value ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: S.text1, transition: 'left 180ms' }} />
    </button>
  );
}
function Chip({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}28`, flexShrink: 0 }}>{label}</span>;
}
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => { void navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }} style={{ height: 26, padding: '0 9px', borderRadius: 6, border: `1px solid ${ok ? S.success : S.border}`, background: ok ? `${S.success}12` : S.surface3, color: ok ? S.success : S.text2, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{ok ? 'Copied!' : 'Copy'}</button>;
}
function CodeLine({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
      <code style={{ flex: 1, fontSize: 11, color: S.primary, fontFamily: "'JetBrains Mono',monospace", background: S.bg, padding: '6px 9px', borderRadius: 7, border: `1px solid ${S.border}`, overflow: 'auto', whiteSpace: 'nowrap' }}>{text}</code>
      <CopyBtn text={text} />
    </div>
  );
}
function Placeholder({ label, desc }: { label: string; desc?: string }) {
  return (<><STitle label={label} desc={desc} /><Card><div style={{ padding: '24px 16px', textAlign: 'center' }}><div style={{ opacity: 0.25, marginBottom: 6, display: 'flex', justifyContent: 'center' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={S.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/><line x1="2" y1="2" x2="22" y2="22"/></svg></div><div style={{ fontSize: 12, color: S.text3 }}>Coming soon</div></div></Card></>);
}

// ─── provider logos ───────────────────────────────────────────────────────────
function Logo({ id, size = 36 }: { id: string; size?: number }) {
  const r = Math.round(size * 0.27);
  const bg: Record<string, string> = {
    claude: '#D97757', codex: '#0a0a0a', opencode: '#1e1b4b', qwen: '#1a56c4',
    hermes: '#7c3aed', openclaw: '#be123c', ollama: '#1c1c1e', openai: '#0d0d0d',
    openrouter: '#6366f1', grok: '#111', gemini: '#1a73e8', auto: '#6366f1',
    copilot: '#24292e', aider: '#1a472a', gemma: '#4285f4', mistral: '#ff6b35',
    deepseek: '#0052cc',
  };
  const fill = bg[id] ?? S.surface3;

  const icons: Record<string, React.ReactNode> = {
    // Claude / Anthropic — their stylized A mark
    claude: <path fill="white" d="M18 6 L25.5 24 L22.5 24 L20.5 19.5 L15.5 19.5 L13.5 24 L10.5 24 Z M18 11.5 L21 18 L15 18 Z" />,

    // Codex / OpenAI — abstract bloom (hexagonal rotation)
    codex: (
      <>
        {[0,60,120,180,240,300].map(angle => (
          <ellipse key={angle} cx="18" cy="18" rx="4" ry="9" fill="white" opacity="0.9"
            transform={`rotate(${angle} 18 18)`} />
        ))}
        <circle cx="18" cy="18" r="3.5" fill={fill} />
      </>
    ),

    // OpenAI (same as codex but slightly different size)
    openai: (
      <>
        {[0,60,120,180,240,300].map(angle => (
          <ellipse key={angle} cx="18" cy="18" rx="4" ry="9" fill="white" opacity="0.9"
            transform={`rotate(${angle} 18 18)`} />
        ))}
        <circle cx="18" cy="18" r="3.5" fill={fill} />
      </>
    ),

    // Gemini — 4-pointed star (tall vertical, shorter horizontal)
    gemini: (
      <path fill="white" d="M18 5 C18 5 20 13 24 18 C20 23 18 31 18 31 C18 31 16 23 12 18 C16 13 18 5 18 5 Z
        M5 18 C5 18 13 20 18 24 C23 20 31 18 31 18 C31 18 23 16 18 12 C13 16 5 18 5 18 Z" />
    ),

    // Hermes — lightning bolt / stylized H
    hermes: <path fill="white" d="M11 8 L11 14 L17 14 L17 8 L20 8 L20 28 L17 28 L17 22 L11 22 L11 28 L8 28 L8 8 Z" />,

    // OpenCode — code brackets
    opencode: (
      <>
        <text x="18" y="23" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="monospace">&lt;/&gt;</text>
      </>
    ),

    // Qwen — Q with tail
    qwen: (
      <>
        <circle cx="18" cy="17" r="8" fill="none" stroke="white" strokeWidth="2.5" />
        <line x1="23" y1="22" x2="27" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),

    // OpenClaw — claw marks / streaks
    openclaw: (
      <>
        <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
          d="M12 9 Q10 16 12 23 M18 8 Q18 16 18 24 M24 9 Q26 16 24 23" />
      </>
    ),

    // Ollama — simplified llama silhouette
    ollama: (
      <>
        <ellipse cx="18" cy="20" rx="8" ry="7" fill="white" />
        <ellipse cx="18" cy="10" rx="4.5" ry="5" fill="white" />
        <rect x="16" y="10" width="4" height="3" fill="white" />
        {/* ears */}
        <ellipse cx="14" cy="7" rx="2" ry="3" fill="white" />
        <ellipse cx="22" cy="7" rx="2" ry="3" fill="white" />
      </>
    ),

    // OpenRouter — routing arrows
    openrouter: (
      <>
        <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M8 12 L16 12 L16 16 L24 12 L16 8 L16 12" />
        <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M8 24 L16 24 L16 20 L24 24 L16 28 L16 24" />
      </>
    ),

    // Grok / xAI — X mark
    grok: (
      <>
        <line x1="10" y1="10" x2="26" y2="26" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="26" y1="10" x2="10" y2="26" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </>
    ),

    // Auto — sparkle / magic wand
    auto: (
      <>
        <path fill="white" d="M18 6 L19.5 14 L27 12 L21 18 L27 24 L19.5 22 L18 30 L16.5 22 L9 24 L15 18 L9 12 L16.5 14 Z" />
      </>
    ),

    // Aider — simple terminal chevron
    aider: <path fill="white" d="M10 12 L16 18 L10 24 L12 24 L18 18 L12 12 Z M18 23 L26 23 L26 21 L18 21 Z" />,

    // GitHub Copilot
    copilot: (
      <>
        <circle cx="18" cy="14" r="7" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="13" cy="22" r="3.5" fill="white" />
        <circle cx="23" cy="22" r="3.5" fill="white" />
        <rect x="14.5" y="20.5" width="7" height="3" fill="white" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <rect width="36" height="36" rx={r} fill={fill} />
      {icons[id] ?? (
        <text x="18" y="24" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif">
          {id.slice(0, 2).toUpperCase()}
        </text>
      )}
    </svg>
  );
}

// ─── Agents ───────────────────────────────────────────────────────────────────
const DEFAULT_AGENTS = [
  { id: 'auto',      label: 'Auto',                   logoId: 'claude', desc: 'Best available agent for the task' },
  { id: 'none',      label: 'No agent (blank terminal)', logoId: 'none', desc: 'Raw shell, no AI assistance' },
  { id: 'claude',    label: 'Claude',                  logoId: 'claude', desc: 'claude CLI — uses your Claude Max subscription' },
  { id: 'codex',     label: 'Codex',                   logoId: 'codex', desc: 'codex CLI — OpenAI Codex agent' },
  { id: 'opencode',  label: 'OpenCode',                logoId: 'opencode', desc: 'opencode CLI — open-source coding agent' },
  { id: 'qwen',      label: 'Qwen Code',               logoId: 'qwen', desc: 'Qwen CLI — Alibaba coding agent' },
  { id: 'hermes',    label: 'Hermes',                  logoId: 'hermes', desc: 'hermes CLI — local agent' },
  { id: 'openclaw',  label: 'OpenClaw',                logoId: 'openclaw', desc: 'openclaw CLI — community agent' },
];

interface InstalledAgent { id: string; label: string; cmd: string; logoId: string; enabled: boolean; isDefault: boolean }
const INSTALLED_AGENTS_DEFAULT: InstalledAgent[] = [
  { id: 'claude',   label: 'Claude',   cmd: 'claude --dangerously-skip-permissions',    logoId: 'claude',   enabled: true,  isDefault: true  },
  { id: 'codex',    label: 'Codex',    cmd: 'codex --dangerously-bypass-approvals-and-sandbox', logoId: 'codex',  enabled: true,  isDefault: false },
  { id: 'opencode', label: 'OpenCode', cmd: 'opencode',                                  logoId: 'opencode', enabled: true,  isDefault: false },
  { id: 'qwen',     label: 'Qwen Code', cmd: 'qwen --approval-mode yolo',               logoId: 'qwen',     enabled: false, isDefault: false },
  { id: 'hermes',   label: 'Hermes',   cmd: 'hermes --yolo',                             logoId: 'hermes',   enabled: true,  isDefault: false },
  { id: 'openclaw', label: 'OpenClaw', cmd: 'openclaw',                                  logoId: 'openclaw', enabled: false, isDefault: false },
];

const AVAILABLE_AGENTS = [
  { id: 'claude-teams',     label: 'Claude Agent Teams',  cmd: 'orca claude-teams --dangerously-skip-permissions' },
  { id: 'openclaude',       label: 'OpenClaude',           cmd: 'openclaude --dangerously-skip-permissions' },
  { id: 'grok',             label: 'Grok',                 cmd: 'grok --permission-mode bypassPermissions' },
  { id: 'copilot',          label: 'GitHub Copilot',       cmd: 'copilot --yolo' },
  { id: 'opencode2',        label: 'OpenCode 2',           cmd: 'opencode2' },
  { id: 'mimo',             label: 'MiMo Code',            cmd: 'mimo' },
  { id: 'ante',             label: 'Ante',                 cmd: 'ante --yolo' },
  { id: 'trae',             label: 'Trae',                 cmd: 'traecli --yolo' },
  { id: 'muse',             label: 'Muse',                 cmd: 'muse --yolo' },
  { id: 'dsh',              label: 'DeepSeek Harness',     cmd: 'dsh-tui' },
  { id: 'qodercli',         label: 'Qoder CLI',            cmd: 'qodercli --dangerously-skip-permissions' },
  { id: 'qoderclicn',       label: 'Qoder CLI China',      cmd: 'qoderclicn --dangerously-skip-permissions' },
  { id: 'zcode',            label: 'ZCode',                cmd: 'zcode --mode yolo' },
  { id: 'pi',               label: 'Pi',                   cmd: 'pi' },
  { id: 'omp',              label: 'OMP',                  cmd: 'omp' },
  { id: 'prime',            label: 'Prime Agent',          cmd: 'prime-agent' },
  { id: 'gemini',           label: 'Gemini',               cmd: 'gemini --yolo' },
  { id: 'antigravity',      label: 'Antigravity',          cmd: 'agy --dangerously-skip-permissions' },
  { id: 'aider',            label: 'Aider',                cmd: 'aider --yes-always' },
  { id: 'goose',            label: 'Goose',                cmd: 'goose GOOSE_MODE=auto' },
  { id: 'amp',              label: 'Amp',                  cmd: 'amp --dangerously-allow-all' },
  { id: 'kilocode',         label: 'Kilocode',             cmd: 'kilo' },
  { id: 'kiro',             label: 'Kiro',                 cmd: 'kiro-cli --trust-all-tools' },
  { id: 'charm',            label: 'Charm',                cmd: 'crush --yolo' },
  { id: 'auggie',           label: 'Auggie',               cmd: 'auggie' },
  { id: 'autohand',         label: 'Autohand Code',        cmd: 'autohand --unrestricted' },
  { id: 'cline',            label: 'Cline',                cmd: 'cline --auto-approve true' },
  { id: 'codebuff',         label: 'Codebuff',             cmd: 'codebuff' },
  { id: 'freebuff',         label: 'Freebuff',             cmd: 'freebuff' },
  { id: 'commandcode',      label: 'Command Code',         cmd: 'command-code --yolo' },
  { id: 'continue',         label: 'Continue',             cmd: 'cn --allow "*"' },
  { id: 'cursor',           label: 'Cursor',               cmd: 'cursor-agent --yolo' },
  { id: 'droid',            label: 'Droid',                cmd: 'droid --auto high' },
  { id: 'kimi',             label: 'Kimi',                 cmd: 'kimi --yolo' },
  { id: 'mistralvibe',      label: 'Mistral Vibe',         cmd: 'vibe --agent auto-approve' },
  { id: 'rovodev',          label: 'Rovo Dev',             cmd: 'acli rovodev run --yolo' },
  { id: 'devin',            label: 'Devin',                cmd: 'devin --permission-mode bypass --respect-workspace-trust false' },
  { id: 'codebuddy',        label: 'CodeBuddy',            cmd: 'codebuddy --dangerously-skip-permissions' },
  { id: 'jcode',            label: 'Jcode',                cmd: 'jcode' },
];

function AgentsSection() {
  const [defAgent, setDefAgent] = useState(() => localStorage.getItem('synaptix_default_agent') ?? 'auto');
  const [hooks, setHooks] = useState(true);
  const [trustFolder, setTrustFolder] = useState(false);
  const [codexServer, setCodexServer] = useState(true);
  const [codexWarn, setCodexWarn] = useState(false);
  const [autoTitles, setAutoTitles] = useState(true);
  const [awake, setAwake] = useState<'on'|'agent'|'off'>('agent');
  const [cacheTimer, setCacheTimer] = useState(false);
  const [permMode, setPermMode] = useState<'yolo'|'manual'>('yolo');
  const [installed, setInstalled] = useState<InstalledAgent[]>(INSTALLED_AGENTS_DEFAULT);
  const [available, setAvailable] = useState<Record<string, boolean>>({});

  const setDef = (id: string) => { setDefAgent(id); localStorage.setItem('synaptix_default_agent', id); };

  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const refreshInstalled = () => {
    setRefreshing(true);
    setRefreshNote(null);
    fetch('/api/cockpit/agents')
      .then(r => {
        if (!r.ok) throw new Error('bad status');
        return r.json() as Promise<{ id: string }[]>;
      })
      .then((data: { id: string }[]) => {
        const ids = new Set(data.map((a: { id: string }) => a.id));
        setInstalled(prev => prev.map(a => ({ ...a, enabled: ids.has(a.id) })));
        setRefreshNote(null);
      })
      .catch(() => {
        setInstalled(INSTALLED_AGENTS_DEFAULT);
        setRefreshNote('Could not verify — showing defaults');
      })
      .finally(() => setRefreshing(false));
  };
  const toggleInstalled = (id: string, field: 'enabled') => setInstalled(prev => prev.map(a => a.id === id ? { ...a, [field]: !a[field] } : a));
  const setDefaultInstalled = (id: string) => setInstalled(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));

  return (
    <>
      <STitle label="Agents" desc="Manage AI agents, set a default, and customize commands." />

      <GLabel label="Default Agent" />
      <p style={{ fontSize: 11, color: S.text3, margin: '0 0 8px', lineHeight: 1.55 }}>
        Default agent, command overrides, CLI arguments, and launch environment are client preferences.
        SSH and remote server launches still validate host availability at run time.
      </p>
      <Card>
        {DEFAULT_AGENTS.map((a, i) => (
          <button key={a.id} type="button" onClick={() => setDef(a.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < DEFAULT_AGENTS.length - 1 ? `1px solid ${S.border}` : 'none', background: defAgent === a.id ? `${S.primary}12` : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            {a.logoId !== 'none' ? <Logo id={a.logoId} size={28} /> : <div style={{ width: 28, height: 28, borderRadius: 7, background: S.surface3, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: defAgent === a.id ? 600 : 400, color: defAgent === a.id ? S.text1 : S.text2 }}>{a.label}</span>
              </div>
            </div>
            {defAgent === a.id && <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </Card>

      <GLabel label="Behavior" />
      <Card>
        <Row label="Agent status hooks" desc="Shows working, waiting, and done states in Synaptix. Turn off to remove Synaptix-managed hooks and stop reinstalling them.">
          <Toggle value={hooks} onChange={setHooks} />
        </Row>
        <Row label="Trust the folder when Synaptix starts an agent" desc='Agents Synaptix starts skip their "Do you trust this folder?" prompt, so the project&apos;s agent hooks and settings run right away. Without this, each agent asks the first time it runs in a folder. Agents running without you watching, such as orchestration workers, automations and agents started from your phone, will wait at that question until you answer it in their terminal. Folders already trusted stay trusted.'>
          <Toggle value={trustFolder} onChange={setTrustFolder} />
        </Row>
        <Row label="Run each Codex terminal on its own server" desc="Keeps Synaptix's status and closing tabs working correctly. Turn off to use Codex's shared server and its agents overview. Applies to new terminals.">
          <Toggle value={codexServer} onChange={setCodexServer} />
        </Row>
        <Row label="Warn when a Codex tab shares a server" desc="Shows a notice on a Codex you started yourself when it shares a server with other tabs, because its agent status may be wrong.">
          <Toggle value={codexWarn} onChange={setCodexWarn} />
        </Row>
        <Row label="Auto-generate tab titles" desc="Derive short stable tab names from the first known agent prompt. Manual renames always win.">
          <Toggle value={autoTitles} onChange={setAutoTitles} />
        </Row>
        <Row label="Keep computer awake" desc="Choose On, Agent, or Off. Agent mode prevents idle sleep while agents work, so long runs finish with the lid open. Closing the lid still puts this Mac to sleep.">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['on','agent','off'] as const).map(v => (
              <button key={v} type="button" onClick={() => setAwake(v)} style={{ height: 26, padding: '0 10px', borderRadius: 6, fontFamily: 'inherit', border: `1px solid ${awake === v ? S.primary : S.border}`, background: awake === v ? `${S.primary}15` : 'transparent', color: awake === v ? S.primary : S.text3, fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                {v === 'on' ? 'On' : v === 'agent' ? 'Agent' : 'Off'}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Prompt Cache Timer" desc="Claude caches your conversation to reduce costs. When idle too long the cache expires and the next message resends full context at higher cost. This shows a countdown so you know when to resume." last>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <Toggle value={cacheTimer} onChange={setCacheTimer} />
            {cacheTimer && <span style={{ fontSize: 9, color: S.text3 }}>Show countdown in sidebar</span>}
          </div>
        </Row>
      </Card>

      <GLabel label="Agent Permissions" />
      <p style={{ fontSize: 11, color: S.text3, margin: '0 0 8px', lineHeight: 1.55 }}>
        Choose whether Synaptix launches agents with fewer permission prompts or with manual checks.
      </p>
      <Card>
        <div style={{ display: 'flex', padding: '10px 14px', gap: 8, borderBottom: `1px solid ${S.border}` }}>
          {(['yolo','manual'] as const).map(m => (
            <button key={m} type="button" onClick={() => setPermMode(m)} style={{ flex: 1, height: 32, borderRadius: 7, border: `1px solid ${permMode === m ? S.primary : S.border}`, background: permMode === m ? `${S.primary}15` : 'transparent', color: permMode === m ? S.primary : S.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {m === 'yolo' ? 'Yolo' : 'Manual'}
            </button>
          ))}
        </div>

        {/* Installed agents */}
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: refreshNote ? 4 : 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.text1 }}>Installed</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Chip label={`${installed.length} detected`} color={S.success} />
              <button type="button" onClick={refreshInstalled} disabled={refreshing} style={{ height: 24, padding: '0 9px', borderRadius: 5, border: `1px solid ${S.border}`, background: refreshing ? `${S.success}10` : 'transparent', color: refreshing ? S.success : S.text2, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>{refreshing ? 'Scanning…' : 'Refresh'}</button>
            </div>
          </div>
          {refreshNote && <div style={{ fontSize: 10, color: S.warning, marginBottom: 8 }}>{refreshNote}</div>}
          {installed.map(agent => (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
              <Logo id={agent.logoId} size={26} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.text1 }}>{agent.label}</div>
                <code style={{ fontSize: 9, color: S.text3, fontFamily: "'JetBrains Mono',monospace" }}>{agent.cmd}</code>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => toggleInstalled(agent.id, 'enabled')} style={{ height: 24, padding: '0 8px', borderRadius: 5, border: `1px solid ${agent.enabled ? S.success : S.border}`, background: agent.enabled ? `${S.success}12` : 'transparent', color: agent.enabled ? S.success : S.text3, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {agent.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button type="button" onClick={() => setDefaultInstalled(agent.id)} style={{ height: 24, padding: '0 8px', borderRadius: 5, border: `1px solid ${agent.isDefault ? S.primary : S.border}`, background: agent.isDefault ? `${S.primary}12` : 'transparent', color: agent.isDefault ? S.primary : S.text3, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {agent.isDefault ? 'Default' : 'Set default'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Available to install */}
        <div style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.text1 }}>Available to install</div>
            <Chip label={`${AVAILABLE_AGENTS.length} agents`} color={S.warning} />
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto', scrollbarWidth: 'none' }}>
            {AVAILABLE_AGENTS.map(agent => (
              <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: S.surface3, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: S.text3, fontFamily: "'JetBrains Mono',monospace" }}>{agent.label.slice(0, 2)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{agent.label}</div>
                  <code style={{ fontSize: 9, color: S.text3, fontFamily: "'JetBrains Mono',monospace" }}>{agent.cmd}</code>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => setAvailable(p => ({ ...p, [agent.id]: !(p[agent.id] ?? false) }))} style={{ height: 24, padding: '0 8px', borderRadius: 5, border: `1px solid ${available[agent.id] ? S.success : S.border}`, background: available[agent.id] ? `${S.success}12` : 'transparent', color: available[agent.id] ? S.success : S.text3, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {available[agent.id] ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}

// ─── AI Provider Accounts ─────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'claude',     label: 'Claude',      free: true,  type: 'cli' as const, cmd: 'claude auth login',    hint: 'Uses your Claude Max subscription — no extra cost.' },
  { id: 'codex',      label: 'Codex',       free: false, type: 'cli' as const, cmd: 'codex login',          hint: 'Requires Codex CLI v0.136.0+.' },
  { id: 'gemini',     label: 'Gemini CLI',  free: false, type: 'cli' as const, cmd: 'gemini auth',          hint: 'Sign in with your Google account.' },
  { id: 'grok',       label: 'Grok (xAI)',  free: false, type: 'cli' as const, cmd: 'grok login',           hint: 'Run grok login in a terminal, then refresh here.' },
  { id: 'ollama',     label: 'Ollama',      free: true,  type: 'url' as const, key: 'synaptix_ollama_url',   placeholder: 'http://localhost:11434', hint: 'Pull models: ollama pull llama3.1' },
  { id: 'openai',     label: 'OpenAI',      free: false, type: 'key' as const, key: 'synaptix_openai_key',   placeholder: 'sk-...', hint: 'platform.openai.com/api-keys' },
  { id: 'openrouter', label: 'OpenRouter',  free: true,  type: 'key' as const, key: 'synaptix_or_key',       placeholder: 'sk-or-...', hint: 'openrouter.ai — free-tier models available.' },
];
function ProviderCard({ p }: { p: typeof PROVIDERS[0] }) {
  const [val, setVal] = useState(() => p.type !== 'cli' ? (localStorage.getItem(p.key ?? '') ?? '') : '');
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);
  const save = () => { if (p.key) localStorage.setItem(p.key, val); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
        <Logo id={p.id} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: S.text1 }}>{p.label}</span>
            {p.free && <Chip label="FREE" color={S.success} />}
            {val.trim() && p.type !== 'cli' && <Chip label="ACTIVE" color={S.success} />}
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '10px 14px' }}>
        {p.type === 'cli' && <><div style={{ fontSize: 11, color: S.text2, marginBottom: 7 }}>Sign in by running in a terminal:</div><CodeLine text={p.cmd ?? ''} /></>}
        {(p.type === 'url' || p.type === 'key') && (
          <>
            <label style={{ fontSize: 10, fontWeight: 700, color: S.text3, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{p.type === 'url' ? 'API URL' : 'API Key'}</label>
            <div style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type={p.type === 'key' && !show ? 'password' : 'text'} value={val} onChange={e => setVal(e.target.value)} placeholder={p.placeholder} autoComplete="off" style={{ width: '100%', height: 32, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 7, padding: p.type === 'key' ? '0 32px 0 9px' : '0 9px', color: S.text1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: 'none', boxSizing: 'border-box' }} />
                {p.type === 'key' && <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 0 }}><svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">{show ? <><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg></button>}
              </div>
              <button type="button" onClick={save} style={{ height: 32, padding: '0 12px', borderRadius: 7, border: 'none', background: saved ? S.success : S.primary, color: S.bg, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{saved ? 'Saved!' : 'Save'}</button>
              {val.trim() && <button type="button" onClick={() => { if (p.key) localStorage.removeItem(p.key); setVal(''); }} style={{ height: 32, padding: '0 9px', borderRadius: 7, border: `1px solid ${S.error}44`, background: `${S.error}10`, color: S.error, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Clear</button>}
            </div>
            {p.type === 'key' && <div style={{ fontSize: 10, color: S.text3, marginTop: 3 }}>Stored locally only — never sent to Synaptix servers.</div>}
          </>
        )}
        <div style={{ fontSize: 10, color: S.text3, marginTop: 4 }}>{p.hint}</div>
      </div>
    </Card>
  );
}
// CLI-based agent account setup (like Orca's "orca account add --agent X" pattern)
const CLI_AGENT_ACCOUNTS = [
  { id: 'opencode', label: 'OpenCode', cmd: 'synaptix account add --agent opencode', desc: 'Add accounts by running this command in a terminal on the Synaptix host. Selection applies to new explicit agent launches on that host; direct SSH relay and Windows-hosted WSL launches use their own credentials.' },
  { id: 'codex',    label: 'Codex',    cmd: 'synaptix account add --agent codex',    desc: 'Add accounts by running this command in a terminal on the Synaptix host. Selection applies to new explicit agent launches on that host; direct SSH relay and Windows-hosted WSL launches use their own credentials.' },
  { id: 'gemini',   label: 'Gemini',   cmd: 'synaptix account add --agent gemini',   desc: 'Add accounts by running this command in a terminal on the Synaptix host. Selection applies to new explicit agent launches on that host; direct SSH relay and Windows-hosted WSL launches use their own credentials.' },
  { id: 'grok',     label: 'Grok',     cmd: 'synaptix account add --agent grok',     desc: 'Add accounts by running this command in a terminal on the Synaptix host.' },
];

function AgentAccountCard({ agent }: { agent: typeof CLI_AGENT_ACCOUNTS[0] }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle'|'ok'|'error'>('idle');
  const refresh = () => {
    setRefreshing(true);
    setRefreshStatus('idle');
    fetch('/api/cockpit/agents')
      .then(r => { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(() => setRefreshStatus('ok'))
      .catch(() => setRefreshStatus('error'))
      .finally(() => setRefreshing(false));
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo id={agent.id} size={32} />
        <span style={{ fontSize: 14, fontWeight: 600, color: S.text1 }}>{agent.label}</span>
      </div>
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: S.text2, marginBottom: 7, lineHeight: 1.55 }}>{agent.desc}</div>
        <CodeLine text={agent.cmd} />
        <div style={{ display: 'flex', gap: 6, marginTop: 7, alignItems: 'center' }}>
          <CopyBtn text={agent.cmd} />
          <button type="button" onClick={refresh} disabled={refreshing} style={{ height: 26, padding: '0 9px', borderRadius: 6, border: `1px solid ${refreshStatus === 'ok' ? S.success : refreshStatus === 'error' ? S.error : S.border}`, background: refreshStatus === 'ok' ? `${S.success}12` : refreshStatus === 'error' ? `${S.error}10` : S.surface3, color: refreshStatus === 'ok' ? S.success : refreshStatus === 'error' ? S.error : S.text2, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{refreshing ? 'Checking…' : refreshStatus === 'ok' ? 'Updated!' : refreshStatus === 'error' ? 'Could not reach agent' : 'Refresh accounts'}</button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: S.text3 }}>System default</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.success }}>Active</span>
        </div>
      </div>
    </Card>
  );
}

function ClaudeAccountCard() {
  const [accounts, setAccounts] = useState<{ id: string; label: string; desc: string; active: boolean }[]>([{ id: 'system', label: 'System default', desc: 'Use your current this device Claude login.', active: true }]);
  const [addClicked, setAddClicked] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saved'>('idle');

  const handleSave = () => {
    const trimmed = newToken.trim();
    if (!trimmed) return;
    const stored: { id: string; token: string; label: string }[] = JSON.parse(localStorage.getItem('synaptix_claude_accounts') ?? '[]');
    const newEntry = { id: `acc_${Date.now()}`, token: trimmed, label: `Account ${stored.length + 2}` };
    stored.push(newEntry);
    localStorage.setItem('synaptix_claude_accounts', JSON.stringify(stored));
    setAccounts(prev => [...prev, { id: newEntry.id, label: newEntry.label, desc: 'Added via token.', active: false }]);
    setNewToken('');
    setAddClicked(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo id="claude" size={32} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: S.text1 }}>Claude</div>
          <div style={{ fontSize: 11, color: S.text3, lineHeight: 1.45, marginTop: 2 }}>Optional. Synaptix can use your normal Claude login; add accounts only if you want quick switching without moving chat sessions.</div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: S.text1 }}>Accounts</div>
            <div style={{ fontSize: 10, color: S.text3 }}>Showing accounts for this device. New accounts are added there.</div>
          </div>
          <button type="button" onClick={() => setAddClicked(v => !v)} style={{ height: 26, padding: '0 9px', borderRadius: 6, border: `1px solid ${S.border}`, background: addClicked ? `${S.primary}15` : S.surface3, color: addClicked ? S.primary : S.text2, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Account
          </button>
        </div>
        {addClicked && (
          <div style={{ background: S.bg, border: `1px solid ${S.surface4}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.text1, marginBottom: 6 }}>Add Claude account</div>
            <div style={{ fontSize: 10, color: S.text3, marginBottom: 8, lineHeight: 1.5 }}>Paste a Claude session token or API key. Stored locally only — never sent to any server.</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type={showToken ? 'text' : 'password'} value={newToken} onChange={e => setNewToken(e.target.value)} placeholder="sk-ant-… or session token" autoComplete="off" style={{ width: '100%', height: 30, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 6, padding: '0 30px 0 9px', color: S.text1, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowToken(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">{showToken ? <><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>
                </button>
              </div>
              <button type="button" onClick={handleSave} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: 'none', background: S.primary, color: S.bg, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Save</button>
              <button type="button" onClick={() => { setAddClicked(false); setNewToken(''); }} style={{ height: 30, padding: '0 9px', borderRadius: 6, border: `1px solid ${S.border}`, background: 'transparent', color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Cancel</button>
            </div>
          </div>
        )}
        {saveStatus === 'saved' && <div style={{ fontSize: 10, color: S.success, marginBottom: 6 }}>Account saved.</div>}
        {accounts.map(acc => (
          <div key={acc.id} style={{ background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: S.text1 }}>{acc.label}</span>
              {acc.active && <span style={{ fontSize: 8, fontWeight: 700, color: S.success, background: `${S.success}18`, border: `1px solid ${S.success}28`, padding: '1px 5px', borderRadius: 4 }}>Active</span>}
            </div>
            <div style={{ fontSize: 11, color: S.text3, marginTop: 3 }}>{acc.desc}</div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: S.text3, lineHeight: 1.55, marginTop: 4 }}>No managed Claude accounts for this device. Synaptix will use that environment's system default Claude login until you add one here.</div>
      </div>
    </Card>
  );
}

function ProvidersSection() {
  return (
    <>
      <STitle label="AI Provider Accounts" desc="Optional. Synaptix works with your existing provider logins; add accounts only if you want Synaptix to help switch between them." />
      <ClaudeAccountCard />
      {CLI_AGENT_ACCOUNTS.map(a => <AgentAccountCard key={a.id} agent={a} />)}
      <GLabel label="API Keys" />
      {PROVIDERS.filter(p => p.type !== 'cli').map(p => <ProviderCard key={p.id} p={p} />)}
    </>
  );
}

// ─── Orchestration ────────────────────────────────────────────────────────────
function OrchestrationSection() {
  const [enabled, setEnabled] = useState(false);
  const [maxP, setMaxP] = useState(3);
  const [autoRoute, setAutoRoute] = useState(false);
  return (
    <>
      <STitle label="Orchestration" desc="Run multiple agents in parallel on fan-out tasks." />
      <Card>
        <Row label="Enable orchestration" desc="Allows Synaptix to spawn and coordinate parallel agent sessions for multi-worktree tasks."><Toggle value={enabled} onChange={setEnabled} /></Row>
        <Row label="Auto-route tasks" desc="Automatically pick the best agent for each sub-task based on type."><Toggle value={autoRoute} onChange={setAutoRoute} disabled={!enabled} /></Row>
        <Row label="Max parallel agents" desc="Maximum number of agents that can run simultaneously." last>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2,3,5,8].map(n => <button key={n} type="button" onClick={() => setMaxP(n)} style={{ height: 26, padding: '0 9px', borderRadius: 5, border: `1px solid ${maxP === n ? S.primary : S.border}`, background: maxP === n ? `${S.primary}15` : 'transparent', color: maxP === n ? S.primary : S.text3, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{n}</button>)}
          </div>
        </Row>
      </Card>
    </>
  );
}

// ─── Computer Use ─────────────────────────────────────────────────────────────
function ComputerUseSection() {
  const [enabled, setEnabled] = useState(false);
  const [confirm, setConfirm] = useState(true);
  const [screenshot, setScreenshot] = useState(true);
  return (
    <>
      <STitle label="Computer Use" desc="Allow AI agents to control your Mac — click, type, and take screenshots." />
      <Card>
        <Row label="Enable Computer Use" desc="Grants agents the ability to interact with your desktop. Requires macOS Accessibility permission."><Toggle value={enabled} onChange={setEnabled} /></Row>
        <Row label="Confirm before each action" desc="Show a confirmation dialog before each click or keystroke the agent performs."><Toggle value={confirm} onChange={setConfirm} disabled={!enabled} /></Row>
        <Row label="Allow screenshots" desc="Agent can capture screenshots to understand screen state." last><Toggle value={screenshot} onChange={setScreenshot} disabled={!enabled} /></Row>
      </Card>
      {!enabled && <Card style={{ marginTop: 8, background: `${S.warning}08`, border: `1px solid ${S.warning}28` }}><div style={{ padding: '10px 14px', fontSize: 11, color: S.text2, lineHeight: 1.6 }}>Requires <strong style={{ color: S.text1 }}>System Settings → Privacy & Security → Accessibility</strong>.</div></Card>}
    </>
  );
}

// ─── Voice ────────────────────────────────────────────────────────────────────
function VoiceSection() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'toggle'|'hold'>('toggle');
  const [model, setModel] = useState('whisper-base');
  return (
    <>
      <STitle label="Voice" desc="Local speech-to-text dictation with on-device models." />
      <Card>
        <Row label="Enable Voice" desc="Press ⌘E to dictate text into any focused pane." last><Toggle value={enabled} onChange={setEnabled} /></Row>
      </Card>
      <GLabel label="Toggle / Hold Mode" />
      <Card>
        <Row label="Toggle" desc="Press ⌘E once to start, again to stop."><input type="radio" checked={mode === 'toggle'} onChange={() => setMode('toggle')} style={{ accentColor: S.primary, width: 16, height: 16 }} /></Row>
        <Row label="Hold" desc="Dictate while ⌘E is held." last><input type="radio" checked={mode === 'hold'} onChange={() => setMode('hold')} style={{ accentColor: S.primary, width: 16, height: 16 }} /></Row>
      </Card>
      <GLabel label="Input Device" />
      <Card>
        <Row label="Microphone" desc="Input device used for voice dictation." last>
          <select style={{ background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text2, fontSize: 11, padding: '4px 8px', fontFamily: 'inherit' }}><option>System default</option></select>
        </Row>
      </Card>
      <GLabel label="Select a speech model" />
      <Card>
        {[
          { id: 'whisper-base', label: 'Whisper Base', desc: 'Fast, good accuracy — runs offline', local: true },
          { id: 'whisper-large', label: 'Whisper Large', desc: 'Higher accuracy — runs offline, slower', local: true },
          { id: 'cloud', label: 'Cloud (OpenAI)', desc: 'Requires OpenAI API key', local: false },
        ].map((m, i, arr) => (
          <Row key={m.id} label={m.label} desc={m.desc} last={i === arr.length - 1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {m.local && <Chip label="LOCAL" color={S.success} />}
              <input type="radio" checked={model === m.id} onChange={() => setModel(m.id)} style={{ accentColor: S.primary, width: 16, height: 16 }} />
            </div>
          </Row>
        ))}
      </Card>
    </>
  );
}

// ─── Synaptix Account ──────────────────────────────────────────────────────────
function AccountSection({ connectionStatus, latencyMs }: { connectionStatus: ConnectionStatus; latencyMs: number | null }) {
  const { info, refresh } = useConnectionInfo();
  const isConn = connectionStatus === 'connected';
  const sc = isConn ? S.success : connectionStatus === 'reconnecting' ? S.warning : S.error;
  const sl = isConn ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting…' : 'Offline';
  return (
    <>
      <STitle label="Synaptix Account" desc="Agent connection and authentication." />
      <Card>
        <Row label="Status" desc={info.machineName ?? 'This machine'}><Chip label={sl} color={sc} /></Row>
        <Row label="Latency" desc="WebSocket round-trip" last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: latencyMs == null ? S.text3 : latencyMs < 30 ? S.success : latencyMs < 100 ? S.warning : S.error }}>{latencyMs != null ? `${latencyMs}ms` : '—'}</span>
            <button type="button" onClick={refresh} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${S.border}`, background: 'transparent', color: S.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </Row>
      </Card>
      {info.authUrl && (<><GLabel label="One-Click Access URL" /><Card><div style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: S.text2, marginBottom: 7 }}>Share with trusted devices — auth token embedded.</div><CodeLine text={info.authUrl} /></div></Card></>)}
    </>
  );
}

// ─── General ─────────────────────────────────────────────────────────────────
function GeneralSection() {
  return (
    <>
      <STitle label="General" desc="General Synaptix preferences." />
      <Card>
        <Row label="Language" last>
          <select style={{ background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text2, fontSize: 11, padding: '4px 8px', fontFamily: 'inherit' }}><option>English</option><option>Español</option></select>
        </Row>
      </Card>
      <Card style={{ marginTop: 8 }}>
        <Row label="About Synaptix" desc={`Version ${__APP_VERSION__} — Built by RUD Lab`} last><span style={{ fontSize: 10, color: S.text3 }}>MIT License</span></Row>
      </Card>
    </>
  );
}

// ─── Git ─────────────────────────────────────────────────────────────────────
function GitSection() {
  const [aiCommits, setAiCommits] = useState(false);
  const [autoStage, setAutoStage] = useState(false);
  const [branch, setBranch] = useState('main');
  const [worktrees, setWorktrees] = useState(false);
  return (
    <>
      <STitle label="Git & Source Control" desc="GitHub integration and AI-powered commit messages." />
      <Card>
        <Row label="AI commit messages" desc="Generate commit message from diff via Claude CLI when you run git commit."><Toggle value={aiCommits} onChange={setAiCommits} /></Row>
        <Row label="Auto-stage changes" desc="Stage all modified files automatically before AI commit message generation." last><Toggle value={autoStage} onChange={setAutoStage} /></Row>
      </Card>
      <GLabel label="GitHub" />
      <Card>
        <Row label="Default branch" desc="Used for worktree fan-out base">
          <input type="text" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 80, height: 28, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 6, padding: '0 8px', color: S.text1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: 'none' }} />
        </Row>
        <Row label="Enable worktrees" desc="Fan out agent tasks across Git worktrees for parallel execution." last><Toggle value={worktrees} onChange={setWorktrees} /></Row>
      </Card>
      <GLabel label="CLI Integration" />
      <Card><div style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: S.text2, marginBottom: 7 }}>Install Synaptix git helpers:</div><CodeLine text="synaptix git install-hooks" /></div></Card>
    </>
  );
}

// ─── Terminal ─────────────────────────────────────────────────────────────────
function TerminalSection() {
  const [fontSize, setFontSize] = useState(13);
  const [scrollback, setScrollback] = useState(5000);
  const [blink, setBlink] = useState(true);
  const [bell, setBell] = useState(false);
  const mkRange = (_val: number, _min: number, _max: number, pct: number) => ({
    width: '100%', height: 4, appearance: 'none' as const, background: `linear-gradient(to right,${S.primary} ${pct}%,${S.surface3} ${pct}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none',
  });
  const fsP = ((fontSize - 10) / 10) * 100;
  const sbP = ((scrollback - 1000) / 49000) * 100;
  return (
    <>
      <STitle label="Terminal" desc="Font, scrollback, and terminal behavior." />
      <Card>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Font Size</span><span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono',monospace" }}>{fontSize}px</span></div>
          <input type="range" min={10} max={20} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={mkRange(fontSize, 10, 20, fsP)} />
        </div>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Scrollback Lines</span><span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono',monospace" }}>{scrollback.toLocaleString()}</span></div>
          <input type="range" min={1000} max={50000} step={1000} value={scrollback} onChange={e => setScrollback(+e.target.value)} style={mkRange(scrollback, 1000, 50000, sbP)} />
        </div>
        <Row label="Cursor blink"><Toggle value={blink} onChange={setBlink} /></Row>
        <Row label="Terminal bell" last><Toggle value={bell} onChange={setBell} /></Row>
      </Card>
    </>
  );
}

// ─── Quick Commands ───────────────────────────────────────────────────────────
function QuickCommandsSection() {
  const [cmds, setCmds] = useState(['git status', 'ls -la', 'npm run dev', 'docker ps']);
  const [draft, setDraft] = useState('');
  return (
    <>
      <STitle label="Quick Commands" desc="Frequently used commands available in the Quick Open menu." />
      <Card>
        {cmds.map((c, i) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', borderBottom: i < cmds.length - 1 ? `1px solid ${S.border}` : 'none', gap: 8 }}>
            <code style={{ flex: 1, fontSize: 12, color: S.text2, fontFamily: "'JetBrains Mono',monospace" }}>{c}</code>
            <button type="button" onClick={() => setCmds(cs => cs.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: S.error, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
        <input type="text" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { setCmds(c => [...c, draft.trim()]); setDraft(''); } }} placeholder="Add command…" style={{ flex: 1, height: 34, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 7, padding: '0 9px', color: S.text1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: 'none', boxSizing: 'border-box' }} />
        <button type="button" onClick={() => { if (draft.trim()) { setCmds(c => [...c, draft.trim()]); setDraft(''); } }} style={{ height: 34, padding: '0 13px', borderRadius: 7, border: 'none', background: S.primary, color: S.bg, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
      </div>
    </>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'obsidian', name: 'Obsidian', bg: '#09090b', cursor: '#a78bfa' },
  { id: 'midnight', name: 'Midnight', bg: '#030712', cursor: '#60a5fa' },
  { id: 'forest',   name: 'Forest',   bg: '#0a0f0a', cursor: '#34d399' },
  { id: 'amber',    name: 'Amber',    bg: '#0c0a00', cursor: '#fbbf24' },
];
const SKINS: { id: SkinId; name: string; sub: string }[] = [
  { id: 'macbook-silver', name: 'MacBook Silver', sub: 'Clean aluminum' },
  { id: 'ios-terminal',   name: 'iOS Terminal',   sub: 'Dark glass feel' },
  { id: 'gamer-rgb',      name: 'Hyperion Gamer', sub: 'RGB rainbow' },
  { id: 'custom-painted', name: 'Custom Painted', sub: 'Violet accents' },
  { id: 'amber-retro',    name: 'Retro PTY',      sub: 'Amber nostalgia' },
  { id: 'ice-white',      name: 'Ice White',      sub: 'Bright clean keys' },
];
function AppearanceSection({ skin, onSkinChange }: { skin: SkinId; onSkinChange: (s: SkinId) => void }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('synaptix_theme') ?? 'obsidian');
  const pick = (id: string) => { setTheme(id); localStorage.setItem('synaptix_theme', id); };
  return (
    <>
      <STitle label="Appearance" desc="Terminal theme, keyboard skin, and display preferences." />
      <GLabel label="Terminal Theme" />
      <Card>
        {THEMES.map((t, i) => (
          <button key={t.id} type="button" onClick={() => pick(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < THEMES.length - 1 ? `1px solid ${S.border}` : 'none', background: theme === t.id ? `${S.primary}10` : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ width: 38, height: 22, borderRadius: 5, background: t.bg, border: `1px solid ${S.surface4}`, display: 'flex', alignItems: 'center', paddingLeft: 6, flexShrink: 0 }}><div style={{ width: 3, height: 11, borderRadius: 1, background: t.cursor }} /></div>
            <span style={{ fontSize: 13, fontWeight: theme === t.id ? 600 : 400, color: theme === t.id ? S.text1 : S.text2, flex: 1 }}>{t.name}</span>
            {theme === t.id && <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </Card>
      <GLabel label="Keyboard Skin" />
      <Card>
        {SKINS.map((sk, i) => (
          <button key={sk.id} type="button" onClick={() => onSkinChange(sk.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < SKINS.length - 1 ? `1px solid ${S.border}` : 'none', background: skin === sk.id ? `${S.primary}10` : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: skin === sk.id ? 600 : 400, color: skin === sk.id ? S.text1 : S.text2 }}>{sk.name}</div>
              <div style={{ fontSize: 10, color: S.text3 }}>{sk.sub}</div>
            </div>
            {skin === sk.id && <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        ))}
      </Card>
    </>
  );
}

// ─── Input & Editing ──────────────────────────────────────────────────────────
function InputEditingSection({ keyboardMode, onKeyboardModeChange }: { keyboardMode: KeyboardMode; onKeyboardModeChange: (m: KeyboardMode) => void }) {
  const [haptic, setHaptic] = useState(70);
  const [repeat, setRepeat] = useState(350);
  const [sound, setSound] = useState(false);
  const modes: { id: KeyboardMode; label: string; desc: string }[] = [
    { id: 'custom',   label: 'Virtual',  desc: 'Custom keyboard skins with haptics' },
    { id: 'system',   label: 'Native',   desc: 'Device OS keyboard' },
    { id: 'physical', label: 'Hardware', desc: 'Bluetooth only — no virtual keyboard' },
  ];
  return (
    <>
      <STitle label="Input & Editing" desc="Keyboard mode, haptics, timing, and input preferences." />
      <GLabel label="Input Mode" />
      <Card>
        {modes.map((m, i) => (
          <button key={m.id} type="button" onClick={() => onKeyboardModeChange(m.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < modes.length - 1 ? `1px solid ${S.border}` : 'none', background: keyboardMode === m.id ? `${S.primary}10` : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${keyboardMode === m.id ? S.primary : S.border}`, background: keyboardMode === m.id ? S.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {keyboardMode === m.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.bg }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: keyboardMode === m.id ? 600 : 400, color: keyboardMode === m.id ? S.text1 : S.text2 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: S.text3 }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </Card>
      <GLabel label="Haptics & Timing" />
      <Card>
        <div style={{ padding: '9px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Haptic Intensity</span><span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono',monospace" }}>{haptic}%</span></div>
          <input type="range" min={0} max={100} value={haptic} onChange={e => setHaptic(+e.target.value)} style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right,${S.primary} ${haptic}%,${S.surface3} ${haptic}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }} />
        </div>
        <div style={{ padding: '9px 14px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Key Repeat Delay</span><span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono',monospace" }}>{repeat}ms</span></div>
          <input type="range" min={100} max={800} value={repeat} onChange={e => setRepeat(+e.target.value)} style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right,${S.primary} ${((repeat-100)/700)*100}%,${S.surface3} ${((repeat-100)/700)*100}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }} />
        </div>
        <Row label="Key click sound" last><Toggle value={sound} onChange={setSound} /></Row>
      </Card>
    </>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsSection() {
  const [inApp, setInApp] = useState(true);
  const [os, setOs] = useState(false);
  const [notifPermError, setNotifPermError] = useState(false);
  const [onDone, setOnDone] = useState(true);
  const [onFail, setOnFail] = useState(true);
  const [onWait, setOnWait] = useState(false);
  return (
    <>
      <STitle label="Notifications" desc="Control when and how Synaptix notifies you." />
      <Card>
        <Row label="In-app notifications" desc="Show events in the Notifications tab with unread badge"><Toggle value={inApp} onChange={setInApp} /></Row>
        <Row label="macOS notifications" desc="Native OS notification when a job finishes, even in background" last>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {!os && <button type="button" onClick={() => { void Notification.requestPermission().then(p => { if (p === 'granted') { setOs(true); setNotifPermError(false); } else { setNotifPermError(true); } }); }} style={{ height: 25, padding: '0 9px', borderRadius: 5, border: `1px solid ${S.primary}44`, background: `${S.primary}10`, color: S.primary, fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Enable</button>}
              <Toggle value={os} onChange={v => { setOs(v); if (!v) setNotifPermError(false); }} />
            </div>
            {notifPermError && <span style={{ fontSize: 9, color: S.error }}>Permission denied. Enable in system settings.</span>}
          </div>
        </Row>
      </Card>
      <GLabel label="Events" />
      <Card>
        <Row label="Job completed"><Toggle value={onDone} onChange={setOnDone} /></Row>
        <Row label="Job failed"><Toggle value={onFail} onChange={setOnFail} /></Row>
        <Row label="Agent waiting for input" last><Toggle value={onWait} onChange={setOnWait} /></Row>
      </Card>
    </>
  );
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────
function ShortcutsSection() {
  const SHORTCUTS = [
    { label: 'Settings',          keys: ['⌘', ','] },
    { label: 'Quick Open',        keys: ['⌘', 'K'] },
    { label: 'New Session',       keys: ['⌘', 'N'] },
    { label: 'Close Session',     keys: ['⌘', 'W'] },
    { label: 'Next Session',      keys: ['⌘', ']'] },
    { label: 'Prev Session',      keys: ['⌘', '['] },
    { label: 'Dashboard',         keys: ['⌘', '1'] },
    { label: 'Terminal',          keys: ['⌘', '2'] },
    { label: 'Chat',              keys: ['⌘', '3'] },
    { label: 'Copy',              keys: ['⌘', 'C'] },
    { label: 'Paste',             keys: ['⌘', 'V'] },
    { label: 'Clear',             keys: ['⌘', 'L'] },
    { label: 'Voice dictate',     keys: ['⌘', 'E'] },
    { label: 'Search settings',   keys: ['⌘', 'F'] },
  ];
  return (
    <>
      <STitle label="Shortcuts" desc="Keyboard shortcuts available in Synaptix." />
      <Card>
        {SHORTCUTS.map((s, i) => (
          <Row key={s.label} label={s.label} last={i === SHORTCUTS.length - 1}>
            <div style={{ display: 'flex', gap: 3 }}>
              {s.keys.map(k => <kbd key={k} style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", background: S.surface3, border: `1px solid ${S.surface4}`, borderRadius: 4, padding: '2px 6px', color: S.text2 }}>{k}</kbd>)}
            </div>
          </Row>
        ))}
      </Card>
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsSection({ authToken }: { authToken: string | null }) {
  const [recentJobs, setRecentJobs] = useState<number | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    fetch('/api/cockpit/status', { headers })
      .then(r => { if (!r.ok) throw new Error('bad status'); return r.json() as Promise<{ recentJobs?: number }>; })
      .then(data => setRecentJobs(data.recentJobs ?? null))
      .catch(() => setStatusError(true));
  }, [authToken]);

  const fmt = (v: number | null) => v != null ? String(v) : statusError ? 'N/A' : '—';

  return (
    <>
      <STitle label="Stats & Usage" desc="Session activity and resource usage." />
      <Card>
        <Row label="Sessions today"><span style={{ fontSize: 13, fontWeight: 600, color: recentJobs != null ? S.primary : S.text3, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(recentJobs)}</span></Row>
        <Row label="Commands run"><span style={{ fontSize: 13, color: S.text2, fontFamily: "'JetBrains Mono',monospace" }}>{statusError ? 'N/A' : '—'}</span></Row>
        <Row label="Data transferred" last><span style={{ fontSize: 13, color: S.text2, fontFamily: "'JetBrains Mono',monospace" }}>{statusError ? 'N/A' : '—'}</span></Row>
      </Card>
      {statusError && <Card style={{ marginTop: 8, background: `${S.warning}08`, border: `1px solid ${S.warning}28` }}><div style={{ padding: '10px 14px', fontSize: 11, color: S.text2, lineHeight: 1.6 }}>Could not reach backend — stats unavailable.</div></Card>}
      <Card style={{ marginTop: 8 }}><div style={{ padding: '10px 14px', fontSize: 11, color: S.text3, lineHeight: 1.6 }}>Usage tracking is local-only. No data is sent to any server.</div></Card>
    </>
  );
}

// ─── macOS Permissions ────────────────────────────────────────────────────────
function MacOSPermissionsSection({ authToken }: { authToken: string | null }) {
  const devicesState = useDevices(authToken);
  return (
    <>
      <STitle label="macOS Permissions" desc="Authentication status, active devices, and session management." />
      <GLabel label="Authentication" />
      <Card>
        <Row label="Auth method" desc="Static JWT token — full PTY + WebSocket access"><Chip label="ACTIVE" color={S.success} /></Row>
        <Row label="Rate limiting" desc="Auth endpoints: 10 req / 15 min" last><Chip label="ON" color={S.success} /></Row>
      </Card>
      <GLabel label="Devices" />
      <Card>
        {devicesState.loading && <div style={{ padding: 14, fontSize: 11, color: S.text3, textAlign: 'center' }}>Loading…</div>}
        {!devicesState.loading && devicesState.devices.length === 0 && <div style={{ padding: 14, fontSize: 11, color: S.text3, textAlign: 'center' }}>No devices signed in</div>}
        {devicesState.devices.map((d, i) => (
          <Row key={d.id} label={d.deviceName || 'Unknown device'} desc={`${d.current ? 'This device · ' : ''}Last seen ${formatRelativeTime(d.lastSeen)}`} last={i === devicesState.devices.length - 1}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {d.current && <Chip label="THIS DEVICE" color={S.success} />}
              <button type="button" onClick={() => void devicesState.revoke(d.id)} style={{ height: 25, padding: '0 9px', borderRadius: 5, border: `1px solid ${S.error}44`, background: `${S.error}10`, color: S.error, fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{d.current ? 'Sign out' : 'Revoke'}</button>
            </div>
          </Row>
        ))}
      </Card>
      <button type="button" onClick={() => void devicesState.revokeAll()} style={{ width: '100%', height: 36, borderRadius: 8, marginTop: 4, border: `1px solid ${S.error}44`, background: `${S.error}10`, color: S.error, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out All Devices</button>
    </>
  );
}

// ─── Privacy ──────────────────────────────────────────────────────────────────
function PrivacySection() {
  const [telemetry, setTelemetry] = useState(false);
  const [crash, setCrash] = useState(false);
  return (
    <>
      <STitle label="Privacy & Telemetry" desc="Control what data Synaptix collects and shares." />
      <Card>
        <Row label="Usage telemetry" desc="Anonymous session counts. Never contains terminal content."><Toggle value={telemetry} onChange={setTelemetry} /></Row>
        <Row label="Crash reports" desc="Automatically send crash logs to help fix bugs" last><Toggle value={crash} onChange={setCrash} /></Row>
      </Card>
      <Card style={{ marginTop: 8 }}><div style={{ padding: '10px 14px', fontSize: 11, color: S.text3, lineHeight: 1.6 }}>All API keys are stored only in your browser's localStorage. Synaptix's backend never receives your AI provider credentials.</div></Card>
    </>
  );
}

// ─── Advanced ─────────────────────────────────────────────────────────────────
function AdvancedSection() {
  const [debug, setDebug] = useState(false);
  const [wsFrames, setWsFrames] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  useEffect(() => {
    if (!forceUpdate) return;
    setUpdateResult(null);
    fetch('/api/health')
      .then(r => r.json() as Promise<{ version?: string }>)
      .then(data => {
        setUpdateResult(data.version ? `Backend version: ${data.version}` : 'Backend reachable — up to date.');
      })
      .catch(() => {
        setUpdateResult('Could not reach backend.');
      })
      .finally(() => {
        setTimeout(() => {
          setForceUpdate(false);
          setTimeout(() => setUpdateResult(null), 2000);
        }, 1000);
      });
  }, [forceUpdate]);

  return (
    <>
      <STitle label="Advanced" desc="Advanced configuration options for power users." />
      <Card>
        <Row label="Debug logging" desc="Log verbose WebSocket and agent messages to the browser console"><Toggle value={debug} onChange={setDebug} /></Row>
        <Row label="Show WebSocket frames" desc="Display raw WebSocket frame data in debug output"><Toggle value={wsFrames} onChange={setWsFrames} disabled={!debug} /></Row>
        <Row label="Force update check" desc="Check for updates immediately, ignoring the 4-hour cooldown" last>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <Toggle value={forceUpdate} onChange={setForceUpdate} disabled={forceUpdate} />
            {updateResult && <span style={{ fontSize: 9, color: S.text3 }}>{updateResult}</span>}
          </div>
        </Row>
      </Card>
    </>
  );
}

// ─── Experimental ─────────────────────────────────────────────────────────────
function ExperimentalSection() {
  const [agentDash, setAgentDash] = useState(false);
  const [autoResume, setAutoResume] = useState(false);
  const [pet, setPet] = useState(false);
  const [agentSleep, setAgentSleep] = useState(false);
  const [worktrees, setWorktrees] = useState(false);
  const [sleepAfter, setSleepAfter] = useState(30);
  return (
    <>
      <STitle label="Experimental" desc="New features that are still taking shape. Give them a try." />
      <Card>
        <Row label="Agent Dashboard" desc="Monitor agents that need you, are working, or are done in a dedicated view."><Toggle value={agentDash} onChange={setAgentDash} /></Row>
        <Row label="Auto-resume chats" desc="Automatically resume chats that were working when Synaptix restarts."><Toggle value={autoResume} onChange={setAutoResume} /></Row>
        <Row label="Status bar pet" desc="Shows a small animated pet (Terminito) pinned to the bottom-right corner."><Toggle value={pet} onChange={setPet} /></Row>
        <Row label="Worktree card preview" desc="Preview updated worktree-card layout and status presentation."><Toggle value={worktrees} onChange={setWorktrees} /></Row>
        <Row label="Agent sleep" desc="Stop idle background agent terminals after a timeout and resume when opened." last><Toggle value={agentSleep} onChange={setAgentSleep} /></Row>
      </Card>
      {agentSleep && (
        <Card style={{ marginTop: 8 }}>
          <div style={{ padding: '9px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: S.text1, fontWeight: 500 }}>Sleep after</span><span style={{ fontSize: 12, color: S.primary, fontFamily: "'JetBrains Mono',monospace" }}>{sleepAfter} min</span></div>
            <input type="range" min={5} max={120} step={5} value={sleepAfter} onChange={e => setSleepAfter(+e.target.value)} style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right,${S.primary} ${((sleepAfter-5)/115)*100}%,${S.surface3} ${((sleepAfter-5)/115)*100}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none', border: 'none' }} />
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Plugins ──────────────────────────────────────────────────────────────────
function PluginsSection() {
  const [marketEnabled, setMarketEnabled] = useState(false);
  return (
    <>
      <STitle label="Plugins" desc="Extend Synaptix with community-built plugins." />
      <Card>
        <Row label="Enable plugin marketplace" desc="Access and install community plugins from the Synaptix registry." last><Toggle value={marketEnabled} onChange={setMarketEnabled} /></Row>
      </Card>
      {!marketEnabled && <Card style={{ marginTop: 8 }}><div style={{ padding: '10px 14px', fontSize: 11, color: S.text3, lineHeight: 1.6 }}>Enable the plugin marketplace to browse and install extensions.</div></Card>}
    </>
  );
}

// ─── Chat Section ─────────────────────────────────────────────────────────────
function ChatSection() {
  const [streamResp, setStreamResp] = useState(true);
  const [history, setHistory] = useState(true);
  const [historyDays, setHistoryDays] = useState(30);
  return (
    <>
      <STitle label="Chat" desc="Configure in-app AI chat appearance and behavior." />
      <Card>
        <Row label="Stream responses" desc="Show AI responses as they arrive rather than all at once."><Toggle value={streamResp} onChange={setStreamResp} /></Row>
        <Row label="Save chat history" desc="Persist conversations across sessions."><Toggle value={history} onChange={setHistory} /></Row>
        <Row label="History retention" desc="Days to keep conversation history." last>
          <div style={{ display: 'flex', gap: 4 }}>
            {[7,14,30,90].map(d => <button key={d} type="button" onClick={() => setHistoryDays(d)} style={{ height: 26, padding: '0 9px', borderRadius: 5, border: `1px solid ${historyDays === d ? S.primary : S.border}`, background: historyDays === d ? `${S.primary}15` : 'transparent', color: historyDays === d ? S.primary : S.text3, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{d}d</button>)}
          </div>
        </Row>
      </Card>
    </>
  );
}

// ─── Content router ───────────────────────────────────────────────────────────
function SectionContent({ id, p }: { id: SectionId; p: SettingsViewProps }) {
  switch (id) {
    case 'agents':              return <AgentsSection />;
    case 'providers':           return <ProvidersSection />;
    case 'orchestration':       return <OrchestrationSection />;
    case 'computer-use':        return <ComputerUseSection />;
    case 'voice':               return <VoiceSection />;
    case 'account':             return <AccountSection connectionStatus={p.connectionStatus} latencyMs={p.latencyMs} />;
    case 'general':             return <GeneralSection />;
    case 'integrations':        return <Placeholder label="Integrations" desc="Connect Synaptix with GitHub, Slack, Linear, and other tools." />;
    case 'mobile':              return <Placeholder label="Mobile" desc="Set up the Synaptix mobile companion app." />;
    case 'automations':         return <Placeholder label="Automations" desc="Trigger agent runs automatically based on events." />;
    case 'artifacts':           return <Placeholder label="Artifacts" desc="Create and manage reusable AI-generated assets." />;
    case 'share-skills':        return <Placeholder label="Share Skills" desc="Publish skills to your team." />;
    case 'session-search':      return <Placeholder label="Agent Session Search" desc="Fuzzy search across all agent session outputs." />;
    case 'git':                 return <GitSection />;
    case 'task-sources':        return <Placeholder label="Task Sources" desc="Connect issue trackers: Linear, GitHub Issues, Jira." />;
    case 'terminal':            return <TerminalSection />;
    case 'quick-commands':      return <QuickCommandsSection />;
    case 'browser':             return <Placeholder label="Browser" desc="Configure AI-driven browser automation." />;
    case 'mobile-emulator':     return <Placeholder label="Mobile Emulator" desc="Simulate mobile devices for agent testing." />;
    case 'floating-workspace':  return <Placeholder label="Floating Workspace" desc="Detach sessions into floating windows." />;
    case 'appearance':          return <AppearanceSection skin={p.skin} onSkinChange={p.onSkinChange} />;
    case 'chat':                return <ChatSection />;
    case 'input-editing':       return <InputEditingSection keyboardMode={p.keyboardMode} onKeyboardModeChange={p.onKeyboardModeChange} />;
    case 'notifications':       return <NotificationsSection />;
    case 'shortcuts':           return <ShortcutsSection />;
    case 'stats':               return <StatsSection authToken={p.authToken} />;
    case 'ssh-hosts':           return <Placeholder label="SSH Hosts" desc="Manage SSH connections and remote machine profiles." />;
    case 'remote-servers':      return <Placeholder label="Remote Synaptix Servers" desc="Connect to Synaptix agents running on remote machines." />;
    case 'macos-permissions':   return <MacOSPermissionsSection authToken={p.authToken} />;
    case 'privacy':             return <PrivacySection />;
    case 'advanced':            return <AdvancedSection />;
    case 'experimental':        return <ExperimentalSection />;
    case 'plugins':             return <PluginsSection />;
    default:                    return <AgentsSection />;
  }
}

// ─── project icon colors ──────────────────────────────────────────────────────
const PROJECT_COLORS: Record<string, { bg: string; fg: string; icon?: string }> = {
  'RUD-WEB':           { bg: '#e53e3e', fg: '#fff', icon: 'R' },
  'Synaptix':           { bg: '#3b82f6', fg: '#fff', icon: 'T' },
  'excited-bohr':      { bg: '#8b5cf6', fg: '#fff', icon: 'B' },
  'excited-tesla':     { bg: '#10b981', fg: '#fff', icon: 'T' },
  'intelligent-galileo': { bg: '#f59e0b', fg: '#fff', icon: 'G' },
  'serene-raman':      { bg: '#06b6d4', fg: '#fff', icon: 'R' },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SettingsView(props: SettingsViewProps) {
  const [section, setSection] = useState<SectionId>('agents');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [usageTipDismissed, setUsageTipDismissed] = useState(false);

  const activeLabel = NAV.flatMap(g => g.items).find(i => i.id === section)?.label ?? 'Settings';
  const filtered = query.trim()
    ? NAV.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())) })).filter(g => g.items.length > 0)
    : NAV;

  const go = (id: SectionId) => { setSection(id); setQuery(''); };

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', background: S.bg }}>
      {/* Sidebar */}
      <div style={{ width: collapsed ? 0 : 218, minWidth: collapsed ? 0 : 218, borderRight: `1px solid ${S.border}`, background: S.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 200ms ease,min-width 200ms ease', flexShrink: 0 }}>

        {/* Back to app */}
        {props.onBack && (
          <button type="button" onClick={props.onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px 8px', background: 'transparent', border: 'none', borderBottom: `1px solid ${S.border}`, color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to app
          </button>
        )}

        {/* Search */}
        <div style={{ padding: '9px 9px 5px', flexShrink: 0, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 6, padding: '0 7px', height: 28, gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search settings" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: S.text1, fontSize: 11, fontFamily: 'inherit' }} />
            <kbd style={{ fontSize: 8, color: S.text3, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 3, padding: '0 3px' }}>⌘F</kbd>
          </div>
        </div>

        {/* Onboarding checklist */}
        <button type="button" onClick={() => go('account')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', background: 'transparent', border: 'none', borderBottom: `1px solid ${S.border}`, color: S.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Onboarding checklist
        </button>

        {/* Nav */}
        <div style={{ flex: 1, overflow: 'auto', padding: '3px 7px', scrollbarWidth: 'none' }}>
          {filtered.map(group => (
            <div key={group.title}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, color: S.text3, textTransform: 'uppercase', padding: '9px 4px 3px' }}>{group.title}</div>
              {group.items.map(item => {
                const active = section === item.id && !query;
                return (
                  <button key={item.id} type="button" onClick={() => go(item.id)} style={{ width: '100%', height: 29, display: 'flex', alignItems: 'center', gap: 6, padding: '0 7px', borderRadius: 5, border: 'none', marginBottom: 1, background: active ? 'rgba(255,255,255,0.07)' : 'transparent', color: active ? S.text1 : S.text2, fontSize: 11.5, fontWeight: active ? 500 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', transition: 'all 100ms' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize: 7.5, fontWeight: 700, color: item.badge === 'Beta' ? S.warning : item.badge === 'Optional' ? S.text3 : S.text3, background: item.badge === 'Beta' ? `${S.warning}15` : S.surface3, padding: '1px 4px', borderRadius: 3, border: `1px solid ${item.badge === 'Beta' ? `${S.warning}28` : S.border}`, flexShrink: 0 }}>{item.badge.toUpperCase()}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Projects */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, color: S.text3, textTransform: 'uppercase', padding: '9px 4px 3px' }}>Projects</div>
            {PROJECTS.map(proj => {
              const pc = PROJECT_COLORS[proj];
              return (
                <button key={proj} type="button" onClick={() => go('general')} style={{ width: '100%', height: 29, display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px', borderRadius: 5, border: 'none', marginBottom: 1, background: 'transparent', color: S.text2, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', transition: 'background 80ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${S.border}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  {pc ? (
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: pc.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: pc.fg }}>{pc.icon}</div>
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: S.surface3, border: `1px solid ${S.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj}</span>
                </button>
              );
            })}
          </div>

          <div style={{ height: 16 }} />
        </div>

        {/* Agent usage limits popup */}
        {!usageTipDismissed && (
          <div style={{ margin: '0 8px 8px', borderRadius: 8, background: S.surface2, border: `1px solid ${S.border}`, padding: '10px 12px', flexShrink: 0, position: 'relative' }}>
            <button type="button" onClick={() => setUsageTipDismissed(true)} style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.text1, marginBottom: 4 }}>Agent usage limits</div>
            <div style={{ fontSize: 10, color: S.text3, marginBottom: 8, lineHeight: 1.5 }}>Connect your AI provider accounts to see their usage in real time and easily switch between accounts.</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {['claude', 'gemini', 'openai', 'codex'].map(id => <Logo key={id} id={id} size={20} />)}
            </div>
            <button type="button" onClick={() => go('providers')} style={{ width: '100%', height: 28, borderRadius: 6, border: 'none', background: S.surface3, color: S.text1, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Connect an account
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '6px 13px', borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
          <button type="button" onClick={() => go('stats')} style={{ background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', fontSize: 9, fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Configure usage tracking
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '7px 12px', borderBottom: `1px solid ${S.border}`, background: S.surface, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
          <button type="button" onClick={() => setCollapsed(v => !v)} style={{ background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>
          <span style={{ fontSize: collapsed ? 13 : 12, fontWeight: collapsed ? 600 : 400, color: collapsed ? S.text1 : S.text3 }}>{activeLabel}</span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px 60px' }}>
          <SectionContent id={section} p={props} />
        </div>
      </div>
    </div>
  );
}
