import { useState, useCallback } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

const S = {
  bg: '#15141a',
  shell: '#0f0f14',
  sidebar: '#18181b',
  sidebar2: '#1c1b22',
  panel: '#1f1e26',
  panel2: '#25242d',
  panel3: '#2d2b36',
  border: '#33313d',
  border2: '#454250',
  text1: '#fbfbfe',
  text2: '#cfcfd8',
  text3: '#8f8f9d',
  text4: '#5f5d6b',
  accent: '#fcbb00',
  accent2: '#f99c00',
  violet: '#8d54ff',
  blue: '#75beff',
  cyan: '#00cadb',
  green: '#00bb7f',
  red: '#ff2357',
  amberBg: '#332817',
  greenBg: '#0f2a21',
  blueBg: '#152535',
} as const;

interface DashboardViewProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
}

type Tone = 'live' | 'next' | 'planned' | 'warn' | 'muted';

function toneColor(tone: Tone) {
  switch (tone) {
    case 'live': return S.green;
    case 'next': return S.accent;
    case 'warn': return S.red;
    case 'planned': return S.blue;
    default: return S.text3;
  }
}

function StatusPill({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  const color = toneColor(tone);
  return (
    <span className="tm-status-pill" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      <span className="tm-status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function Icon({ name, color = 'currentColor' }: { name: 'terminal' | 'branch' | 'bot' | 'files' | 'preview' | 'github' | 'linear' | 'jira' | 'slack' | 'activity' | 'settings' | 'close'; color?: string }) {
  const stroke = color;
  if (name === 'github') return <span className="tm-brand-icon" style={{ color }}>GH</span>;
  if (name === 'linear') return <span className="tm-brand-icon" style={{ color }}>LN</span>;
  if (name === 'jira') return <span className="tm-brand-icon" style={{ color }}>JR</span>;
  if (name === 'slack') return <span className="tm-brand-icon" style={{ color }}>SL</span>;
  const paths: Record<string, JSX.Element> = {
    terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 5h3a3 3 0 0 1 3 3v8a3 3 0 0 0 3 3" /><path d="M6 7v10" /><circle cx="6" cy="19" r="2" /></>,
    bot: <><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /><path d="M9 17h6" /></>,
    files: <><path d="M4 4h6l2 3h8v13H4z" /><path d="M4 10h16" /></>,
    preview: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 10h8M8 14h5" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" /></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Sidebar({ sessionCount, connectionStatus, onCreateSession }: { sessionCount: number; connectionStatus: ConnectionStatus; onCreateSession: () => void }) {
  const online = connectionStatus === 'connected';
  const nav = [
    { label: 'Overview', icon: 'activity' as const, active: true, badge: online ? 'live' : 'off' },
    { label: 'Terminals', icon: 'terminal' as const, badge: String(sessionCount) },
    { label: 'Agents', icon: 'bot' as const, badge: 'next' },
    { label: 'Worktrees', icon: 'branch' as const, badge: 'next' },
    { label: 'Files', icon: 'files' as const, badge: 'plan' },
    { label: 'Previews', icon: 'preview' as const, badge: 'plan' },
  ];
  return (
    <aside className="tm-cockpit-sidebar">
      <div className="tm-app-mark">
        <img src="/termora-logo.svg" alt="" />
        <div>
          <strong>termora</strong>
          <span>machine cockpit</span>
        </div>
      </div>
      <button className="tm-primary-button" onClick={onCreateSession} type="button">
        <Icon name="terminal" color={S.shell} /> New terminal
      </button>
      <div className="tm-nav-stack">
        {nav.map((item) => (
          <div key={item.label} className={`tm-nav-item ${item.active ? 'active' : ''}`}>
            <Icon name={item.icon} color={item.active ? S.accent : S.text3} />
            <span>{item.label}</span>
            <em>{item.badge}</em>
          </div>
        ))}
      </div>
      <div className="tm-sidebar-footer">
        <span>INTEGRATIONS</span>
        <div className="tm-integration-strip">
          <Icon name="github" color={S.text2} />
          <Icon name="linear" color={S.blue} />
          <Icon name="jira" color={S.accent} />
          <Icon name="slack" color={S.green} />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ sessionCount, connectionStatus, latencyMs }: { sessionCount: number; connectionStatus: ConnectionStatus; latencyMs: number | null }) {
  const status = connectionStatus === 'connected' ? 'connected' : connectionStatus === 'reconnecting' ? 'syncing' : 'offline';
  return (
    <header className="tm-topbar">
      <div>
        <span className="tm-eyebrow">RUD-SERVER / Termora</span>
        <h1>Operations cockpit</h1>
      </div>
      <div className="tm-top-actions">
        <StatusPill label={status} tone={connectionStatus === 'connected' ? 'live' : 'warn'} />
        <StatusPill label={`${sessionCount} sessions`} tone="muted" />
        {latencyMs !== null && <StatusPill label={`${latencyMs} ms`} tone={latencyMs < 80 ? 'live' : 'next'} />}
      </div>
    </header>
  );
}

function MetricCard({ label, value, suffix, tone, bars }: { label: string; value: string; suffix?: string; tone: Tone; bars: number[] }) {
  const color = toneColor(tone);
  return (
    <div className="tm-metric-card">
      <div className="tm-card-head">
        <span>{label}</span>
        <StatusPill label={tone} tone={tone} />
      </div>
      <div className="tm-metric-value"><strong>{value}</strong>{suffix && <em>{suffix}</em>}</div>
      <div className="tm-bars" aria-hidden="true">
        {bars.map((b, i) => <i key={i} style={{ height: `${Math.max(12, b)}%`, background: i === bars.length - 1 ? color : `${color}55` }} />)}
      </div>
    </div>
  );
}

function AgentChatFeed() {
  const rows = [
    { who: 'Hermes', text: 'Planning next build gate and checking repo state.', tone: 'live' as Tone },
    { who: 'OpenCode', text: 'Worker lane ready for short isolated tasks.', tone: 'next' as Tone },
    { who: 'Claude-style cue', text: 'Thinking while command output streams…', tone: 'planned' as Tone },
  ];
  return (
    <section className="tm-panel tm-chat-panel">
      <div className="tm-section-title"><span>Agent activity</span><StatusPill label="animated" tone="live" /></div>
      {rows.map((row) => (
        <div className="tm-chat-row" key={row.who}>
          <div className="tm-avatar" style={{ borderColor: `${toneColor(row.tone)}66`, color: toneColor(row.tone) }}>{row.who.slice(0, 1)}</div>
          <div className="tm-bubble">
            <strong>{row.who}</strong>
            <p>{row.text}</p>
            <div className="tm-thinking"><i /><i /><i /></div>
          </div>
        </div>
      ))}
    </section>
  );
}

function WorktreeBoard({ sessionCount }: { sessionCount: number }) {
  const columns = [
    { title: 'Inbox', count: 2, tone: 'muted' as Tone, rows: ['Capture UI debt', 'Define cockpit shell'] },
    { title: 'Running', count: Math.max(1, sessionCount), tone: 'live' as Tone, rows: ['Live PTY session', 'CI monitor'] },
    { title: 'Next', count: 4, tone: 'next' as Tone, rows: ['Agents UI', 'SFTP pane', 'Preview lane'] },
  ];
  return (
    <section className="tm-board">
      {columns.map((col) => (
        <div className="tm-board-col" key={col.title}>
          <div className="tm-board-head"><span>{col.title}</span><StatusPill label={String(col.count)} tone={col.tone} /></div>
          {col.rows.map((row) => <div className="tm-task-card" key={row}>{row}<span /></div>)}
        </div>
      ))}
    </section>
  );
}

function SessionCard({ session, isActive, onSelect, onClose }: { session: Session; isActive: boolean; onSelect: (id: string) => void; onClose: (id: string) => void }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const handleCloseClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setConfirmClose(true); }, []);
  const handleConfirm = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onClose(session.id); setConfirmClose(false); }, [onClose, session.id]);
  const handleCancel = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setConfirmClose(false); }, []);
  const running = session.status === 'run';
  return (
    <div className={`tm-session-card ${isActive ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => onSelect(session.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}>
      <div className="tm-session-head">
        <Icon name="terminal" color={running ? S.green : S.text3} />
        <div><strong>{session.name}</strong><span>{session.cwd.split('/').slice(-2).join('/') || session.cwd}</span></div>
        <StatusPill label={running ? 'live' : 'idle'} tone={running ? 'live' : 'muted'} />
        <button className="tm-icon-button" type="button" onClick={handleCloseClick}><Icon name="close" color={S.text3} /></button>
      </div>
      <pre className="tm-terminal-preview" dangerouslySetInnerHTML={{ __html: session.snapshot || `<span style="color:${S.accent}">$</span> <span style="color:${S.text3}">awaiting command…</span>` }} />
      {confirmClose && (
        <div className="tm-confirm" onClick={(e) => e.stopPropagation()}>
          <span>Close {session.name}?</span>
          <div><button onClick={handleConfirm} type="button">Close</button><button onClick={handleCancel} type="button">Cancel</button></div>
        </div>
      )}
    </div>
  );
}

function SessionStrip({ sessions, activeSessionId, onSessionSelect, onCreateSession, onCloseSession }: Pick<DashboardViewProps, 'sessions' | 'activeSessionId' | 'onSessionSelect' | 'onCreateSession' | 'onCloseSession'>) {
  return (
    <section className="tm-panel tm-sessions-panel">
      <div className="tm-section-title"><span>Live terminals</span><button type="button" onClick={onCreateSession}>New</button></div>
      {sessions.length === 0 ? (
        <div className="tm-empty-state">
          <Icon name="terminal" color={S.text3} />
          <strong>No active sessions</strong>
          <p>Start a terminal to attach real command output to this cockpit.</p>
          <button className="tm-primary-button compact" onClick={onCreateSession} type="button">Create terminal</button>
        </div>
      ) : (
        <div className="tm-session-list">
          {sessions.map((session) => <SessionCard key={session.id} session={session} isActive={session.id === activeSessionId} onSelect={onSessionSelect} onClose={onCloseSession} />)}
        </div>
      )}
    </section>
  );
}

export function DashboardView({ sessions, activeSessionId, onSessionSelect, onCreateSession, onCloseSession, connectionStatus, latencyMs }: DashboardViewProps) {
  return (
    <div className="tm-cockpit-shell">
      <Sidebar sessionCount={sessions.length} connectionStatus={connectionStatus} onCreateSession={onCreateSession} />
      <main className="tm-cockpit-main">
        <TopBar sessionCount={sessions.length} connectionStatus={connectionStatus} latencyMs={latencyMs} />
        <div className="tm-cockpit-scroll">
          <div className="tm-metrics-grid">
            <MetricCard label="CPU load" value="12" suffix="%" tone="live" bars={[18, 30, 22, 42, 28, 36, 25, 48, 31, 40, 29, 24]} />
            <MetricCard label="Memory" value="4.2" suffix="GB" tone="next" bars={[40, 43, 38, 46, 49, 51, 48, 55, 52, 57, 53, 50]} />
            <MetricCard label="Workers" value="3" tone="planned" bars={[22, 18, 35, 45, 28, 52, 48, 42, 64, 58, 50, 46]} />
          </div>
          <div className="tm-content-grid">
            <div className="tm-left-flow">
              <WorktreeBoard sessionCount={sessions.length} />
              <SessionStrip sessions={sessions} activeSessionId={activeSessionId} onSessionSelect={onSessionSelect} onCreateSession={onCreateSession} onCloseSession={onCloseSession} />
            </div>
            <div className="tm-right-flow">
              <AgentChatFeed />
              <section className="tm-panel">
                <div className="tm-section-title"><span>Utility lanes</span><StatusPill label="roadmap" tone="next" /></div>
                <div className="tm-utility-list">
                  <div><Icon name="files" color={S.blue} /><span>SFTP + file tree</span><em>planned</em></div>
                  <div><Icon name="branch" color={S.accent} /><span>Git/worktrees</span><em>next</em></div>
                  <div><Icon name="preview" color={S.green} /><span>Preview/log panes</span><em>planned</em></div>
                  <div><Icon name="settings" color={S.text2} /><span>Verification gates</span><em>next</em></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
