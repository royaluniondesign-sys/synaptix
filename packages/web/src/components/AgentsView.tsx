import { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus, TerminalWSClient } from '../lib/ws-client';
import type { MessageBus } from '../lib/message-bus';
import { T as S } from '../lib/design';

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
  icon: ReactNode;
  color: string;
  detectFn: (s: Session) => boolean;
}

// SVG icon components — all use currentColor so they inherit the container's color.

const IconCircuitBrain = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="1.5" x2="9" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="12.5" x2="9" y2="16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1.5" y1="9" x2="5.5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12.5" y1="9" x2="16.5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9" cy="1.5" r="1" fill="currentColor" />
    <circle cx="9" cy="16.5" r="1" fill="currentColor" />
    <circle cx="1.5" cy="9" r="1" fill="currentColor" />
    <circle cx="16.5" cy="9" r="1" fill="currentColor" />
  </svg>
);

const IconTerminal = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <polyline points="5,7.5 8.5,10.5 5,13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <line x1="10" y1="13.5" x2="14" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconCodeBrackets = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polyline points="6,5 2,9 6,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <polyline points="12,5 16,9 12,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <line x1="10.5" y1="3" x2="7.5" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M9 2L10.3 7H16L11.5 10.4L13.1 15.5L9 12.5L4.9 15.5L6.5 10.4L2 7H7.7L9 2Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
    />
  </svg>
);

const IconMonitor = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1.5" y="2" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconMonitorLarge = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="5" width="34" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M13 35h14M20 29v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="17" r="5" stroke="currentColor" strokeWidth="2" />
    <line x1="20" y1="7" x2="20" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="23" x2="20" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="26" y1="17" x2="30" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="7" r="1.5" fill="currentColor" />
    <circle cx="20" cy="27" r="1.5" fill="currentColor" />
    <circle cx="10" cy="17" r="1.5" fill="currentColor" />
    <circle cx="30" cy="17" r="1.5" fill="currentColor" />
  </svg>
);

const KNOWN_AGENTS: AgentInfo[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    icon: <IconCircuitBrain />,
    color: '#a78bfa',
    detectFn: (s) => s.shell === 'claude' || s.name.toLowerCase().includes('claude'),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: <IconTerminal />,
    color: '#60a5fa',
    detectFn: (s) => s.name.toLowerCase().includes('opencode') || s.preview.includes('opencode'),
  },
  {
    id: 'aider',
    name: 'Aider',
    icon: <IconCodeBrackets />,
    color: '#34d399',
    detectFn: (s) => s.name.toLowerCase().includes('aider') || s.preview.includes('aider'),
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    icon: <IconSparkle />,
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
        <span style={{
          color: agent ? agent.color : S.text2,
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}>
          {agent ? agent.icon : <IconMonitor />}
        </span>
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
    { label: 'Claude Code', cmd: 'claude', icon: <IconCircuitBrain />, color: S.primary },
    { label: 'OpenCode', cmd: 'opencode', icon: <IconTerminal />, color: S.info },
    { label: 'Aider', cmd: 'aider', icon: <IconCodeBrackets />, color: S.success },
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
            <span style={{ display: 'flex', alignItems: 'center' }}>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentsView({ sessions, connectionStatus, wsClient, onSessionSelect, onCreateSession }: AgentsViewProps) {
  const stats = useAgentStats(sessions);
  const isConnected = connectionStatus === 'connected';

  // Pending launch: store the command here, fire it when sessions.length grows.
  const pendingCommandRef = useRef<string | null>(null);
  const prevSessionsLengthRef = useRef(sessions.length);

  useEffect(() => {
    if (
      pendingCommandRef.current !== null &&
      sessions.length > prevSessionsLengthRef.current
    ) {
      const newSession = sessions[sessions.length - 1];
      if (newSession && wsClient) {
        wsClient.send({ type: 'stdin', sessionId: newSession.id, data: pendingCommandRef.current + '\n' });
      }
      pendingCommandRef.current = null;
    }
    prevSessionsLengthRef.current = sessions.length;
  }, [sessions, wsClient]);

  const handleLaunch = (cmd: string) => {
    pendingCommandRef.current = cmd;
    onCreateSession();
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: S.text3 }}>
              <IconMonitorLarge />
            </div>
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
