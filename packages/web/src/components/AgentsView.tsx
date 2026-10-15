import type { Session } from '../lib/types';
import type { ConnectionStatus, TerminalWSClient } from '../lib/ws-client';
import type { MessageBus } from '../lib/message-bus';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  info: '#60a5fa',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface AgentsViewProps {
  sessions: Session[];
  connectionStatus: ConnectionStatus;
  wsClient: TerminalWSClient | null;
  messageBus: MessageBus | null;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
}

interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  detectFn: (s: Session) => boolean;
}

const KNOWN_AGENTS: AgentInfo[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    icon: '🤖',
    color: '#a78bfa',
    detectFn: (s) => s.shell === 'claude' || s.name.toLowerCase().includes('claude'),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: '⚡',
    color: '#60a5fa',
    detectFn: (s) => s.name.toLowerCase().includes('opencode') || s.preview.includes('opencode'),
  },
  {
    id: 'aider',
    name: 'Aider',
    icon: '🔧',
    color: '#34d399',
    detectFn: (s) => s.name.toLowerCase().includes('aider') || s.preview.includes('aider'),
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    icon: '🌟',
    color: '#fbbf24',
    detectFn: (s) => s.name.toLowerCase().includes('codex') || s.preview.includes('codex'),
  },
];

function detectAgent(session: Session): AgentInfo | null {
  return KNOWN_AGENTS.find(a => a.detectFn(session)) ?? null;
}

interface AgentStats {
  totalSessions: number;
  runningSessions: number;
  agentSessions: number;
}

function useAgentStats(sessions: Session[]): AgentStats {
  return {
    totalSessions: sessions.length,
    runningSessions: sessions.filter(s => s.status === 'run').length,
    agentSessions: sessions.filter(s => detectAgent(s) !== null).length,
  };
}

function KPITile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      flex: 1, background: S.surface2, border: `1px solid ${S.border}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Geist Mono', monospace", letterSpacing: -0.5 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: S.text3, marginTop: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}

function AgentCard({ session, onSelect }: { session: Session; onSelect: (id: string) => void }) {
  const agent = detectAgent(session);
  const isRunning = session.status === 'run';
  const statusColor = isRunning ? S.success : S.text3;

  return (
    <div
      onClick={() => onSelect(session.id)}
      style={{
        background: S.surface2, border: `1px solid ${agent ? agent.color + '30' : S.border}`,
        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
        transition: 'border-color 120ms, background 120ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = S.surface3;
        (e.currentTarget as HTMLDivElement).style.borderColor = agent ? agent.color + '50' : S.border;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = S.surface2;
        (e.currentTarget as HTMLDivElement).style.borderColor = agent ? agent.color + '30' : S.border;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{agent ? agent.icon : '🖥️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: S.text1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {session.name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, flexShrink: 0,
              background: isRunning ? `${S.success}15` : `${S.text3}10`,
              color: statusColor, border: `1px solid ${statusColor}25`,
              padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {isRunning ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2, fontFamily: "'Geist Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.cwd}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {agent && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: `${agent.color}10`, color: agent.color,
          border: `1px solid ${agent.color}20`,
          fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 5,
        }}>
          {agent.name}
        </div>
      )}
    </div>
  );
}

function QuickLaunchRow({ onLaunch }: { onLaunch: (cmd: string) => void }) {
  const agents = [
    { label: 'Claude Code', cmd: 'claude', icon: '🤖', color: S.primary },
    { label: 'OpenCode', cmd: 'opencode', icon: '⚡', color: S.info },
    { label: 'Aider', cmd: 'aider', icon: '🔧', color: S.success },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: S.text3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        Quick Launch
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {agents.map(a => (
          <button
            key={a.cmd}
            type="button"
            onClick={() => onLaunch(a.cmd)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              height: 32, padding: '0 12px', borderRadius: 8,
              border: `1px solid ${a.color}30`, background: `${a.color}08`,
              color: a.color, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${a.color}18`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${a.color}08`;
            }}
          >
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentsView({ sessions, connectionStatus, wsClient, onSessionSelect, onCreateSession }: AgentsViewProps) {
  const stats = useAgentStats(sessions);
  const isConnected = connectionStatus === 'connected';

  const handleLaunch = (cmd: string) => {
    onCreateSession();
    // Command will be sent after session opens — stored in pending command in App
    setTimeout(() => {
      const lastSession = sessions[sessions.length - 1];
      if (lastSession) wsClient?.send({ type: 'stdin', sessionId: lastSession.id, data: cmd + '\n' });
    }, 500);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 10px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Agents</h2>
        <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
          Claude Code, OpenCode, Aider and more
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {/* KPI row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <KPITile label="Sessions" value={stats.totalSessions} color={S.text1} />
          <KPITile label="Running" value={stats.runningSessions} color={S.success} />
          <KPITile label="Agents" value={stats.agentSessions} color={S.primary} />
        </div>

        {/* Quick launch */}
        {isConnected && <QuickLaunchRow onLaunch={handleLaunch} />}

        {/* Sessions list */}
        {sessions.length > 0 ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: S.text3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Active Sessions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <AgentCard key={s.id} session={s} onSelect={onSessionSelect} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: S.text1, marginBottom: 6 }}>No agents running</div>
            <div style={{ fontSize: 12, color: S.text3, marginBottom: 16, lineHeight: 1.5 }}>
              Launch Claude Code, OpenCode, or Aider from Quick Launch above.
            </div>
            {isConnected && (
              <button
                type="button"
                onClick={onCreateSession}
                style={{
                  height: 36, padding: '0 18px', borderRadius: 8,
                  border: 'none', background: S.primary, color: S.bg,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                New Session
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
