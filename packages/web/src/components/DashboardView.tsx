import { useCallback, useState } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

interface DashboardViewProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
}

type IconName = 'terminal' | 'branch' | 'bot' | 'files' | 'search' | 'settings' | 'close' | 'desktop' | 'plus' | 'mobile' | 'github' | 'activity';

function Icon({ name }: { name: IconName }) {
  if (name === 'github') return <span className="tm-oct-icon-text">GH</span>;
  const paths: Record<Exclude<IconName, 'github'>, JSX.Element> = {
    terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 5h3a3 3 0 0 1 3 3v8a3 3 0 0 0 3 3" /><path d="M6 7v10" /><circle cx="6" cy="19" r="2" /></>,
    bot: <><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /><path d="M9 17h6" /></>,
    files: <><path d="M4 4h6l2 3h8v13H4z" /><path d="M4 10h16" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" /></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    desktop: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    mobile: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  };
  return <svg className="tm-oct-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Dot({ tone = 'green' }: { tone?: 'green' | 'orange' | 'red' | 'muted' }) {
  return <span className={`tm-oct-dot ${tone}`} />;
}

function WindowChrome() {
  return (
    <div className="tm-oct-windowbar">
      <div className="tm-oct-lights"><i /><i /><i /></div>
      <div className="tm-oct-window-title">Termora</div>
      <div className="tm-oct-tabs">
        <span className="active">Claude Code</span>
        <span>Analyze</span>
        <span>Improve README</span>
        <span>Terminal 3</span>
        <span>grok</span>
      </div>
      <div className="tm-oct-window-actions">⌘ · ⌥ · ⌃</div>
    </div>
  );
}

function WorkspaceSidebar({ onCreateSession }: { onCreateSession: () => void }) {
  const pinned = ['.claude', 'main', 'master'];
  const inProgress = [
    { title: 'improve-readme', meta: 'RUD-SERVER · termora redesign', hot: true },
    { title: '[Bug]: Rename project panes', meta: 'layout/sidebar/window splits', hot: false },
    { title: '[Feature]: Add file tree rail', meta: 'right inspector + source tree', hot: false },
    { title: '[Feature]: Mobile overlay', meta: 'phone card + quick actions', hot: false },
    { title: 'Agent thinking details', meta: 'typing dots + run status', hot: false },
  ];
  return (
    <aside className="tm-oct-workspace">
      <div className="tm-oct-navline"><Icon name="activity" /> <span>Tasks</span></div>
      <div className="tm-oct-navline"><Icon name="bot" /> <span>Automations</span></div>
      <div className="tm-oct-navline"><Icon name="mobile" /> <span>Termora Mobile</span></div>
      <div className="tm-oct-navline"><Icon name="search" /> <span>Search</span></div>
      <div className="tm-oct-side-section">
        <div className="tm-oct-section-title"><span>Workspaces</span><button type="button" onClick={onCreateSession}><Icon name="plus" /></button></div>
        <div className="tm-oct-subtitle">Pinned <em>3</em></div>
        {pinned.map((item, idx) => (
          <div className="tm-oct-pin" key={item}><Dot tone={idx === 0 ? 'orange' : 'green'} /><span>{item}</span><em>{idx === 1 ? 'primary' : 'folder'}</em></div>
        ))}
      </div>
      <div className="tm-oct-side-section grow">
        <div className="tm-oct-subtitle">In progress <em>{inProgress.length}</em></div>
        <div className="tm-oct-task-list">
          {inProgress.map((task) => (
            <div className={`tm-oct-task ${task.hot ? 'active' : ''}`} key={task.title}>
              <div><Dot tone={task.hot ? 'orange' : 'green'} /><strong>{task.title}</strong></div>
              <span>{task.meta}</span>
              <div className="tm-oct-task-icons"><Icon name="github" /><Icon name="bot" /><Icon name="terminal" /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="tm-oct-statusbar-mini"><span>78% sh</span><span>94% wk</span><span>100% ssh</span></div>
    </aside>
  );
}

function TerminalPane({ title, subtitle, children, active = false }: { title: string; subtitle?: string; children: React.ReactNode; active?: boolean }) {
  return (
    <section className={`tm-oct-pane ${active ? 'active' : ''}`}>
      <div className="tm-oct-pane-head">
        <div><Icon name="terminal" /><strong>{title}</strong></div>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <pre className="tm-oct-terminal">{children}</pre>
    </section>
  );
}

function LiveSessionPane({ sessions, activeSessionId, onSessionSelect, onCloseSession }: Pick<DashboardViewProps, 'sessions' | 'activeSessionId' | 'onSessionSelect' | 'onCloseSession'>) {
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const handleClose = useCallback((session: Session) => (event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirmClose === session.id) {
      onCloseSession(session.id);
      setConfirmClose(null);
    } else {
      setConfirmClose(session.id);
    }
  }, [confirmClose, onCloseSession]);
  return (
    <section className="tm-oct-live-pane">
      <div className="tm-oct-pane-head">
        <div><Icon name="terminal" /><strong>{active?.name ?? 'Claude Code'}</strong></div>
        <span>high · /effort</span>
      </div>
      <div className="tm-oct-live-tabs">
        {(sessions.length ? sessions : [{ id: 'demo', name: 'improve-readme', cwd: '/home/rud/termora', status: 'run', snapshot: '' } as Session]).slice(0, 4).map((session) => (
          <button key={session.id} type="button" className={session.id === active?.id ? 'active' : ''} onClick={() => onSessionSelect(session.id)}>
            <Dot tone={session.status === 'run' ? 'green' : 'muted'} /> {session.name}
            {sessions.length > 0 && <i onClick={handleClose(session)}>{confirmClose === session.id ? 'sure?' : '×'}</i>}
          </button>
        ))}
      </div>
      <pre className="tm-oct-terminal main" dangerouslySetInnerHTML={{ __html: active?.snapshot || `<span style="color:#ff8f66">Claude Code v2.1.17</span>\n<span style="color:#8f8f9d">/home/rud/termora · /orchestrate</span>\n\n<span style="color:#ff8f66">Termora is live:</span> redesigning window distribution, sidebars and split panes.\n\n$ git status --short\n$ npm run build\n\n<span style="color:#8f8f9d">waiting for next agent output…</span>` }} />
      <div className="tm-oct-inputbar"><span>›</span><em>type permissions on shift+tab to cycle / ↑ for agents</em></div>
    </section>
  );
}

function FileTreeRail() {
  const groups = ['.agents', '.claude', '.github', '.grok', '.husky', 'config', 'docs', 'mobile', 'packages', 'scripts'];
  return (
    <aside className="tm-oct-filetree">
      <div className="tm-oct-file-head"><strong>termora</strong><div><Icon name="search" /><Icon name="settings" /></div></div>
      <div className="tm-oct-tree-list">
        {groups.map((item, index) => (
          <div className={index === 7 ? 'selected' : ''} key={item}><Icon name="files" /><span>{item}</span></div>
        ))}
      </div>
    </aside>
  );
}

function PhonePreview({ connectionStatus, latencyMs, onCreateSession }: { connectionStatus: ConnectionStatus; latencyMs: number | null; onCreateSession: () => void }) {
  const online = connectionStatus === 'connected';
  return (
    <aside className="tm-oct-phone">
      <div className="tm-phone-status"><span>3:53</span><span>⌁ ◒ 44</span></div>
      <div className="tm-phone-brand"><img src="/termora-logo.svg" alt="" /><strong>Termora</strong><Icon name="settings" /></div>
      <h2>Welcome back</h2>
      <div className="tm-phone-stats">
        <div><Icon name="bot" /><strong>5,065</strong><span>Agents spawned</span></div>
        <div><Icon name="activity" /><strong>26d 10h</strong><span>Agent time</span></div>
        <div><Icon name="branch" /><strong>359</strong><span>PRs created</span></div>
      </div>
      <label>Desktops</label>
      <div className="tm-phone-card"><Icon name="desktop" /><div><strong>RUD-SERVER</strong><span><Dot tone={online ? 'green' : 'red'} /> {online ? 'Connected' : 'Offline'} · {latencyMs ?? 47}ms</span></div><em>›</em></div>
      <label>Resume</label>
      <div className="tm-phone-card"><Icon name="terminal" /><div><strong>improve-readme</strong><span>termora · redesign</span></div><em>›</em></div>
      <label>Account usage</label>
      <div className="tm-phone-usage"><strong>rud@termora</strong><span><i style={{ width: '93%' }} /></span><span><i style={{ width: '100%' }} /></span></div>
      <label>Quick actions</label>
      <div className="tm-phone-actions"><button type="button"><Icon name="desktop" /> Pair Desktop</button><button type="button" onClick={onCreateSession}><Icon name="plus" /> New Worktree</button></div>
      <div className="tm-phone-home" />
    </aside>
  );
}

export function DashboardView({ sessions, activeSessionId, onSessionSelect, onCreateSession, onCloseSession, connectionStatus, latencyMs }: DashboardViewProps) {
  return (
    <div className="tm-orca-stage">
      <WindowChrome />
      <div className="tm-orca-grid">
        <WorkspaceSidebar onCreateSession={onCreateSession} />
        <main className="tm-orca-center">
          <LiveSessionPane sessions={sessions} activeSessionId={activeSessionId} onSessionSelect={onSessionSelect} onCloseSession={onCloseSession} />
          <div className="tm-oct-split-stack">
            <TerminalPane title="OpenAI Codex" subtitle="v0.139.0">
{`model: gpt-5.5 medium /model to change
directory: ~/termora/workspaces/improve-readme
permissions: YOLO mode

Tip: run paired agents while Termora records output.`}
            </TerminalPane>
            <TerminalPane title="build output" subtitle="npm install" active>
{`warning unsupported engine: wanted node >=24
Lockfile is up to date
resolution step skipped

Ignored build scripts: agent-browser, electron-installer.
Run verification before publishing.`}
            </TerminalPane>
            <TerminalPane title="grok / analyzer" subtitle="agent lane">
{`analyzing ui distribution…
✓ left workspace rail
✓ split terminal grid
✓ right source tree
✓ mobile preview overlay

ready for visual QA`}
            </TerminalPane>
          </div>
        </main>
        <FileTreeRail />
      </div>
      <div className="tm-oct-bottom"><span><Dot tone="orange" /> 78% sh</span><span>94% wk</span><span>100% ssh</span><span>80% pending</span></div>
      <PhonePreview connectionStatus={connectionStatus} latencyMs={latencyMs} onCreateSession={onCreateSession} />
    </div>
  );
}
