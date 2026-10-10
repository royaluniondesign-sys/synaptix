import { useCallback, useEffect, useMemo, useState } from 'react';
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
  authToken: string | null;
}

type IconName = 'terminal' | 'branch' | 'bot' | 'files' | 'search' | 'settings' | 'close' | 'desktop' | 'plus' | 'mobile' | 'github' | 'activity';
type DotTone = 'green' | 'orange' | 'red' | 'muted';

type TaskItem = { id: string; title: string; meta: string; status: DotTone; agent: string; next: string; command: string };
type AgentItem = { id: string; name: string; state: 'thinking' | 'running' | 'queued' | 'blocked'; work: string; tone: DotTone };
type FileItem = { path: string; kind: 'dir' | 'file'; status?: 'modified' | 'new' | 'clean' };
type CockpitStatus = { machine: string; root: string; git: { branch: string; dirty: boolean; status: string; lastCommit: string }; agents: Array<{ id: string; name: string; state: string; available: boolean; version?: string }>; recentJobs: Array<{ id: string; action: string; status: string; output: string }>; files: { entries: Array<{ name: string; path: string; kind: 'dir' | 'file'; size: number; modifiedAt: string }> } };


const TASKS: TaskItem[] = [
  { id: 'ui-shell', title: 'UI shell parity', meta: 'multi-pane workspace + phone control', status: 'orange', agent: 'Hermes', next: 'verify responsive splits', command: 'npm run build' },
  { id: 'workers', title: 'Agent workers', meta: 'queue, lanes, model routing', status: 'green', agent: 'OpenCode', next: 'spawn short review worker', command: 'opencode run --pure' },
  { id: 'files', title: 'SFTP/file utility', meta: 'right rail tree + file actions', status: 'green', agent: 'Hermes Linux', next: 'wire remote file browser', command: 'termora files open' },
  { id: 'mobile', title: 'Mobile control', meta: 'pair, resume, quick actions', status: 'green', agent: 'Termora Mobile', next: 'promote actions to real routes', command: 'termora pair' },
  { id: 'verify', title: 'Verification gates', meta: 'lint/typecheck/test/build/CI', status: 'muted', agent: 'CI', next: 'watch latest GitHub run', command: 'gh run watch' },
];

const AGENTS: AgentItem[] = [
  { id: 'hermes', name: 'Hermes', state: 'thinking', work: 'orchestrating layout + gates', tone: 'orange' },
  { id: 'opencode', name: 'OpenCode', state: 'queued', work: 'short isolated implementation lane', tone: 'green' },
  { id: 'linux', name: 'Linux Hermes', state: 'running', work: 'server capture + verification', tone: 'green' },
  { id: 'ci', name: 'GitHub CI', state: 'blocked', work: 'waits for push', tone: 'muted' },
];

const FILES: FileItem[] = [
  { path: '.github/workflows/ci.yml', kind: 'file', status: 'clean' },
  { path: 'docs/images/desktop-dashboard.png', kind: 'file', status: 'modified' },
  { path: 'docs/images/phone-dashboard.png', kind: 'file', status: 'modified' },
  { path: 'packages/web/src/App.tsx', kind: 'file', status: 'clean' },
  { path: 'packages/web/src/components/DashboardView.tsx', kind: 'file', status: 'modified' },
  { path: 'packages/web/src/components/TerminalView.tsx', kind: 'file', status: 'clean' },
  { path: 'packages/web/src/index.css', kind: 'file', status: 'modified' },
  { path: 'packages/agent/src/index.ts', kind: 'file', status: 'clean' },
  { path: 'README.md', kind: 'file', status: 'clean' },
];

const COMMANDS = ['new terminal', 'spawn agent', 'open file tree', 'run gates', 'capture UI', 'watch CI'];

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

function Dot({ tone = 'green' }: { tone?: DotTone }) {
  return <span className={`tm-oct-dot ${tone}`} />;
}

function WindowChrome({ activeTask }: { activeTask: TaskItem }) {
  return (
    <div className="tm-oct-windowbar">
      <div className="tm-oct-lights"><i /><i /><i /></div>
      <div className="tm-oct-window-title">Termora</div>
      <div className="tm-oct-tabs">
        <span className="active">{activeTask.title}</span>
        <span>Agents</span>
        <span>Files</span>
        <span>Terminal</span>
        <span>Mobile</span>
      </div>
      <div className="tm-oct-window-actions">⌘K · ⌥A · ⇧Tab</div>
    </div>
  );
}

function CommandStrip({ activeCommand, onCommand, onCreateSession }: { activeCommand: string; onCommand: (cmd: string) => void; onCreateSession: () => void }) {
  return (
    <div className="tm-oct-command-strip">
      {COMMANDS.map((cmd) => (
        <button key={cmd} className={cmd === activeCommand ? 'active' : ''} type="button" onClick={() => { onCommand(cmd); if (cmd === 'new terminal') onCreateSession(); }}>
          {cmd === 'new terminal' && <Icon name="plus" />}
          {cmd === 'spawn agent' && <Icon name="bot" />}
          {cmd === 'open file tree' && <Icon name="files" />}
          {cmd === 'run gates' && <Icon name="activity" />}
          {cmd === 'capture UI' && <Icon name="desktop" />}
          {cmd === 'watch CI' && <Icon name="github" />}
          <span>{cmd}</span>
        </button>
      ))}
    </div>
  );
}

function WorkspaceSidebar({ activeTaskId, activeCommand, onTaskSelect, onCommand, onCreateSession }: { activeTaskId: string; activeCommand: string; onTaskSelect: (id: string) => void; onCommand: (cmd: string) => void; onCreateSession: () => void }) {
  const pinned = ['rud-server', 'termora/main', 'worktrees', 'captures'];
  return (
    <aside className="tm-oct-workspace">
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('run gates')}><Icon name="activity" /> <span>Mission Control</span></button>
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('spawn agent')}><Icon name="bot" /> <span>Agents</span></button>
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('open file tree')}><Icon name="files" /> <span>SFTP / Files</span></button>
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('capture UI')}><Icon name="mobile" /> <span>Mobile Control</span></button>
      <div className="tm-oct-side-section">
        <div className="tm-oct-section-title"><span>Workspaces</span><button type="button" onClick={onCreateSession}><Icon name="plus" /></button></div>
        <div className="tm-oct-subtitle">Pinned <em>{pinned.length}</em></div>
        {pinned.map((item, idx) => (
          <button type="button" className="tm-oct-pin" key={item} onClick={() => onCommand(idx < 2 ? 'new terminal' : 'open file tree')}><Dot tone={idx === 1 ? 'orange' : 'green'} /><span>{item}</span><em>{idx === 1 ? 'main' : 'live'}</em></button>
        ))}
      </div>
      <div className="tm-oct-side-section grow">
        <div className="tm-oct-subtitle">In progress <em>{TASKS.length}</em></div>
        <div className="tm-oct-task-list">
          {TASKS.map((task) => (
            <button type="button" className={`tm-oct-task ${task.id === activeTaskId ? 'active' : ''}`} key={task.id} onClick={() => onTaskSelect(task.id)}>
              <div><Dot tone={task.status} /><strong>{task.title}</strong></div>
              <span>{task.meta}</span>
              <div className="tm-oct-task-icons"><Icon name="github" /><Icon name="bot" /><Icon name="terminal" /></div>
            </button>
          ))}
        </div>
      </div>
      <div className="tm-oct-statusbar-mini"><span>cmd: {activeCommand}</span><span>ssh live</span></div>
    </aside>
  );
}

function UtilityPanel({ activeTask, activeCommand }: { activeTask: TaskItem; activeCommand: string }) {
  return (
    <section className="tm-oct-utility-pane">
      <div className="tm-oct-pane-head"><div><Icon name="activity" /><strong>Control state</strong></div><span>{activeCommand}</span></div>
      <div className="tm-oct-detail-grid">
        <div><span>Owner</span><strong>{activeTask.agent}</strong></div>
        <div><span>Next action</span><strong>{activeTask.next}</strong></div>
        <div><span>Command</span><strong>{activeTask.command}</strong></div>
        <div><span>Mode</span><strong>operate · inspect</strong></div>
      </div>
      <div className="tm-oct-gates">
        {['lint', 'typecheck', 'test', 'build', 'capture', 'ci'].map((gate, idx) => <span key={gate} className={idx < 4 ? 'done' : idx === 4 ? 'active' : ''}><Dot tone={idx < 5 ? 'green' : 'muted'} />{gate}</span>)}
      </div>
    </section>
  );
}

function AgentQueue({ activeAgentId, onAgentSelect }: { activeAgentId: string; onAgentSelect: (id: string) => void }) {
  return (
    <section className="tm-oct-agent-pane">
      <div className="tm-oct-pane-head"><div><Icon name="bot" /><strong>Agent queue</strong></div><span>4 lanes</span></div>
      <div className="tm-oct-agent-list">
        {AGENTS.map((agent) => (
          <button type="button" key={agent.id} className={agent.id === activeAgentId ? 'active' : ''} onClick={() => onAgentSelect(agent.id)}>
            <Dot tone={agent.tone} />
            <div><strong>{agent.name}</strong><span>{agent.work}</span></div>
            <em>{agent.state}</em>
            {agent.state === 'thinking' && <i className="tm-oct-thinking"><b /><b /><b /></i>}
          </button>
        ))}
      </div>
    </section>
  );
}

function TerminalPane({ title, subtitle, children, active = false }: { title: string; subtitle?: string; children: React.ReactNode; active?: boolean }) {
  return (
    <section className={`tm-oct-pane ${active ? 'active' : ''}`}>
      <div className="tm-oct-pane-head"><div><Icon name="terminal" /><strong>{title}</strong></div>{subtitle && <span>{subtitle}</span>}</div>
      <pre className="tm-oct-terminal">{children}</pre>
    </section>
  );
}

function LiveSessionPane({ sessions, activeSessionId, activeTask, activeAgent, onSessionSelect, onCloseSession }: Pick<DashboardViewProps, 'sessions' | 'activeSessionId' | 'onSessionSelect' | 'onCloseSession'> & { activeTask: TaskItem; activeAgent: AgentItem }) {
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const displaySessions = sessions.length ? sessions : [{ id: 'demo', name: activeTask.title, cwd: '/home/rud/termora', status: 'run', snapshot: '' } as Session];
  const handleClose = useCallback((session: Session) => (event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirmClose === session.id) { onCloseSession(session.id); setConfirmClose(null); } else { setConfirmClose(session.id); }
  }, [confirmClose, onCloseSession]);
  const fallback = `<span style="color:#ff8f66">${activeAgent.name}</span> · ${activeAgent.state}\n<span style="color:#8f8f9d">/home/rud/termora · ${activeTask.id}</span>\n\nTask: ${activeTask.title}\nUtility: ${activeTask.meta}\nNext: ${activeTask.next}\nCommand: ${activeTask.command}\n\n$ ${activeTask.command}\n<span style="color:#8f8f9d">output streams here while the sidebars remain usable…</span>`;
  return (
    <section className="tm-oct-live-pane">
      <div className="tm-oct-pane-head"><div><Icon name="terminal" /><strong>{active?.name ?? activeTask.title}</strong></div><span>{activeAgent.name} · {activeAgent.state}</span></div>
      <div className="tm-oct-live-tabs">
        {displaySessions.slice(0, 4).map((session) => (
          <button key={session.id} type="button" className={session.id === active?.id ? 'active' : ''} onClick={() => onSessionSelect(session.id)}>
            <Dot tone={session.status === 'run' ? 'green' : 'muted'} /> {session.name}
            {sessions.length > 0 && <i onClick={handleClose(session)}>{confirmClose === session.id ? 'sure?' : '×'}</i>}
          </button>
        ))}
      </div>
      <pre className="tm-oct-terminal main" dangerouslySetInnerHTML={{ __html: fallback }} />
      <div className="tm-oct-inputbar"><span>›</span><em>Actions remain live: tasks, file tree, agents, mobile resume</em></div>
    </section>
  );
}

function FileTreeRail({ activeFile, files, onFileSelect, onFileAction }: { activeFile: string; files: FileItem[]; onFileSelect: (path: string) => void; onFileAction: (action: string) => void }) {
  return (
    <aside className="tm-oct-filetree">
      <div className="tm-oct-file-head"><strong>termora</strong><div><Icon name="search" /><Icon name="settings" /></div></div>
      <div className="tm-oct-file-search"><Icon name="search" /><span>filter files / SFTP paths</span></div>
      <div className="tm-oct-tree-list operational">
        {files.map((file) => (
          <button type="button" className={file.path === activeFile ? 'selected' : ''} key={file.path} onClick={() => onFileSelect(file.path)}>
            <Icon name={file.kind === 'dir' ? 'files' : 'terminal'} />
            <span>{file.path}</span>
            {file.status && file.status !== 'clean' && <em>{file.status}</em>}
          </button>
        ))}
      </div>
      <div className="tm-oct-file-actions"><button type="button" onClick={() => onFileAction('list-files')}>Open</button><button type="button" onClick={() => onFileAction('git-status')}>Stage</button><button type="button" onClick={() => onFileAction('git-status')}>Upload</button></div>
    </aside>
  );
}

function PhonePreview({ connectionStatus, latencyMs, activeTask, phoneMode, setPhoneMode, onCreateSession, onAction }: { connectionStatus: ConnectionStatus; latencyMs: number | null; activeTask: TaskItem; phoneMode: string; setPhoneMode: (mode: string) => void; onCreateSession: () => void; onAction: (action: string) => void }) {
  const online = connectionStatus === 'connected';
  return (
    <aside className="tm-oct-phone">
      <div className="tm-phone-status"><span>3:53</span><span>⌁ ◒ 44</span></div>
      <div className="tm-phone-brand"><img src="/termora-logo.svg" alt="" /><strong>Termora</strong><Icon name="settings" /></div>
      <h2>Control from mobile</h2>
      <div className="tm-phone-mode-tabs">{['desktop', 'agents', 'files'].map((mode) => <button key={mode} type="button" className={phoneMode === mode ? 'active' : ''} onClick={() => { setPhoneMode(mode); onAction(mode === 'files' ? 'list-files' : mode === 'agents' ? 'opencode-smoke' : 'git-status'); }}>{mode}</button>)}</div>
      <div className="tm-phone-stats">
        <div><Icon name="bot" /><strong>{AGENTS.length}</strong><span>Agent lanes</span></div>
        <div><Icon name="activity" /><strong>{TASKS.length}</strong><span>Tasks live</span></div>
        <div><Icon name="branch" /><strong>6</strong><span>Gates</span></div>
      </div>
      <label>Desktop</label>
      <div className="tm-phone-card"><Icon name="desktop" /><div><strong>RUD-SERVER</strong><span><Dot tone={online ? 'green' : 'red'} /> {online ? 'Connected' : 'Offline'} · {latencyMs ?? 47}ms</span></div><em>›</em></div>
      <label>Resume task</label>
      <div className="tm-phone-card"><Icon name="terminal" /><div><strong>{activeTask.title}</strong><span>{activeTask.next}</span></div><em>›</em></div>
      <label>Quick actions</label>
      <div className="tm-phone-actions"><button type="button" onClick={() => onAction('git-status')}><Icon name="desktop" /> Pair</button><button type="button" onClick={onCreateSession}><Icon name="plus" /> Terminal</button></div>
      <div className="tm-phone-actions"><button type="button" onClick={() => onAction('opencode-smoke')}><Icon name="bot" /> Agent</button><button type="button" onClick={() => onAction('list-files')}><Icon name="files" /> Files</button></div>
      <div className="tm-phone-home" />
    </aside>
  );
}

export function DashboardView({ sessions, activeSessionId, onSessionSelect, onCreateSession, onCloseSession, connectionStatus, latencyMs, authToken }: DashboardViewProps) {
  const [activeTaskId, setActiveTaskId] = useState(TASKS[0].id);
  const [activeAgentId, setActiveAgentId] = useState(AGENTS[0].id);
  const [activeFile, setActiveFile] = useState('packages/web/src/components/DashboardView.tsx');
  const [activeCommand, setActiveCommand] = useState('run gates');
  const [phoneMode, setPhoneMode] = useState('desktop');
  const [cockpitStatus, setCockpitStatus] = useState<CockpitStatus | null>(null);
  const [cockpitError, setCockpitError] = useState<string | null>(null);
  const [lastBackendAction, setLastBackendAction] = useState<string>('status');

  const authHeaders = useMemo(() => authToken ? { Authorization: `Bearer ${authToken}` } : undefined, [authToken]);

  const refreshCockpitStatus = useCallback(async () => {
    if (!authHeaders) return;
    try {
      const response = await fetch('/api/cockpit/status', { headers: authHeaders });
      if (!response.ok) throw new Error(`status ${response.status}`);
      setCockpitStatus(await response.json() as CockpitStatus);
      setCockpitError(null);
    } catch (error) {
      setCockpitError(error instanceof Error ? error.message : 'cockpit status failed');
    }
  }, [authHeaders]);

  useEffect(() => { void refreshCockpitStatus(); }, [refreshCockpitStatus]);

  const runBackendAction = useCallback(async (action: string) => {
    setActiveCommand(action);
    setLastBackendAction(action);
    if (!authHeaders) return;
    if (action === 'new terminal') { onCreateSession(); return; }
    const backendAction = action === 'spawn agent' ? 'opencode-smoke' : action === 'open file tree' ? 'list-files' : action === 'capture UI' ? 'git-status' : action === 'watch CI' ? 'git-status' : action;
    try {
      const response = await fetch('/api/cockpit/actions', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: backendAction, path: '.' }) });
      if (!response.ok) throw new Error(`action ${backendAction} ${response.status}`);
      await response.json();
      await refreshCockpitStatus();
      setCockpitError(null);
    } catch (error) {
      setCockpitError(error instanceof Error ? error.message : 'cockpit action failed');
    }
  }, [authHeaders, onCreateSession, refreshCockpitStatus]);
  const activeTask = useMemo(() => TASKS.find((task) => task.id === activeTaskId) ?? TASKS[0], [activeTaskId]);
  const activeAgent = useMemo(() => AGENTS.find((agent) => agent.id === activeAgentId) ?? AGENTS[0], [activeAgentId]);
  const backendFiles: FileItem[] = useMemo(() => cockpitStatus?.files.entries.map((entry) => ({ path: entry.path, kind: entry.kind, status: entry.path === activeFile ? 'modified' : 'clean' })) ?? FILES, [activeFile, cockpitStatus]);
  const backendAgent = cockpitStatus?.agents.find((agent) => agent.id === activeAgentId);
  const effectiveAgent = backendAgent ? { ...activeAgent, state: backendAgent.state === 'ready' ? 'queued' as const : activeAgent.state, work: backendAgent.available ? 'backend connected' : 'backend unavailable' } : activeAgent;

  return (
    <div className="tm-orca-stage">
      <WindowChrome activeTask={activeTask} />
      <CommandStrip activeCommand={activeCommand} onCommand={runBackendAction} onCreateSession={onCreateSession} />
      <div className="tm-orca-grid operational">
        <WorkspaceSidebar activeTaskId={activeTaskId} activeCommand={activeCommand} onTaskSelect={setActiveTaskId} onCommand={runBackendAction} onCreateSession={onCreateSession} />
        <main className="tm-orca-center operational">
          <LiveSessionPane sessions={sessions} activeSessionId={activeSessionId} activeTask={activeTask} activeAgent={effectiveAgent} onSessionSelect={onSessionSelect} onCloseSession={onCloseSession} />
          <div className="tm-oct-split-stack operational">
            <UtilityPanel activeTask={activeTask} activeCommand={`${activeCommand} · backend ${lastBackendAction}${cockpitError ? ` · ${cockpitError}` : ''}`} />
            <AgentQueue activeAgentId={activeAgentId} onAgentSelect={setActiveAgentId} />
            <TerminalPane title="selected file / run output" subtitle={activeFile} active>
{`file: ${activeFile}
status: ${FILES.find((f) => f.path === activeFile)?.status ?? 'clean'}

command: ${activeTask.command}
next: ${activeTask.next}

This pane is the operational inspector: selecting tasks, agents or files changes what the operator sees without leaving the cockpit.`}
            </TerminalPane>
          </div>
        </main>
        <FileTreeRail activeFile={activeFile} files={backendFiles} onFileSelect={setActiveFile} onFileAction={runBackendAction} />
      </div>
      <div className="tm-oct-bottom"><span><Dot tone="orange" /> task: {activeTask.title}</span><span>agent: {activeAgent.name}</span><span>file: {activeFile.split('/').pop()}</span><span>cmd: {activeCommand}</span></div>
      <PhonePreview connectionStatus={connectionStatus} latencyMs={latencyMs} activeTask={activeTask} phoneMode={phoneMode} setPhoneMode={setPhoneMode} onCreateSession={onCreateSession} onAction={runBackendAction} />
    </div>
  );
}
