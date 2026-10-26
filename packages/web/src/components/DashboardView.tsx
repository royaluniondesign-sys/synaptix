import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus, TerminalWSClient } from '../lib/ws-client';
import type { MessageBus } from '../lib/message-bus';
import { useSplitLayout } from '../hooks/useSplitLayout';
import { SplitLayoutControlsView } from './SplitLayoutControls';
import { MultiPaneTerminal } from './MultiPaneTerminal';
import { AgentRegistryPanel } from './AgentRegistryPanel';
import { CAPABILITIES, OVERVIEW_TASK_ID, deriveAgents, deriveTasks, gateSummary, overviewTask, type DotTone, type TaskItem } from '../lib/cockpit-model';

interface DashboardViewProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
  authToken: string | null;
  wsClient: TerminalWSClient | null;
  messageBus: MessageBus;
  getSessionOutput: (sessionId: string) => string[];
}

type IconName = 'terminal' | 'branch' | 'bot' | 'files' | 'search' | 'settings' | 'close' | 'desktop' | 'plus' | 'mobile' | 'github' | 'activity';

type FileItem = { path: string; kind: 'dir' | 'file'; status?: 'modified' | 'new' | 'clean' };
type CockpitStatus = { machine: string; root: string; gates?: string[]; git: { branch: string; dirty: boolean; status: string; lastCommit: string }; agents: Array<{ id: string; name: string; state: string; available: boolean; version?: string }>; worktrees?: Array<{ index: number; path: string; branch: string }>; recentJobs: Array<{ id: string; action: string; status: string; output: string }>; files: { entries: Array<{ name: string; path: string; kind: 'dir' | 'file'; size: number; modifiedAt: string }> } };
type FilePreview = { path: string; size: number; truncated: boolean; binary: boolean; content: string };
type GithubStatus = {
  installed: boolean;
  version: string | null;
  authenticated: boolean;
  account: string | null;
  host: string | null;
  scopes: string[];
  repo: { nameWithOwner: string | null; defaultBranch: string | null };
  branchHints: string[];
  prHints: Array<{ number: number; title: string; headRefName: string; state: string }>;
  notes: string[];
  checkedAt: string;
};


const COMMANDS = ['new terminal', 'spawn agent', 'open file tree', 'run gates', 'capture UI', 'watch CI', 'fan out worktrees', 'list worktrees', 'clean worktrees'];

function Icon({ name }: { name: IconName }) {
  if (name === 'github') return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>;
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
      <div className="tm-oct-window-title">Synaptix</div>
      <div className="tm-oct-tabs"><span className="active">{activeTask.title}</span></div>
    </div>
  );
}

function CommandStrip({ activeCommand, onCommand, onCreateSession }: { activeCommand: string; onCommand: (cmd: string) => void; onCreateSession: () => void }) {
  return (
    <div className="tm-oct-command-strip">
      {COMMANDS.map((cmd) => (
        <button key={cmd} title={cmd} className={cmd === activeCommand ? 'active' : ''} type="button" onClick={() => { onCommand(cmd); if (cmd === 'new terminal') onCreateSession(); }}>
          {cmd === 'new terminal' && <Icon name="plus" />}
          {cmd === 'spawn agent' && <Icon name="bot" />}
          {cmd === 'open file tree' && <Icon name="files" />}
          {cmd === 'run gates' && <Icon name="activity" />}
          {cmd === 'capture UI' && <Icon name="desktop" />}
          {cmd === 'watch CI' && <Icon name="github" />}
          {cmd === 'fan out worktrees' && <Icon name="branch" />}
          {cmd === 'list worktrees' && <Icon name="activity" />}
          {cmd === 'clean worktrees' && <Icon name="close" />}
        </button>
      ))}
    </div>
  );
}

function WorkspaceSidebar({ status, tasks, activeTaskId, activeCommand, onTaskSelect, onCommand, onCreateSession }: { status: CockpitStatus | null; tasks: TaskItem[]; activeTaskId: string; activeCommand: string; onTaskSelect: (id: string) => void; onCommand: (cmd: string) => void; onCreateSession: () => void }) {
  const pinned = status ? [
    { label: status.machine, tag: 'host', tone: 'green' as DotTone },
    { label: status.git.branch || 'detached', tag: status.git.dirty ? 'dirty' : 'clean', tone: (status.git.dirty ? 'orange' : 'green') as DotTone },
  ] : [];
  return (
    <aside className="tm-oct-workspace">
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('run gates')}><Icon name="activity" /> <span>Run gates</span></button>
      <button className="tm-oct-navline button" type="button" onClick={() => onCommand('open file tree')}><Icon name="files" /> <span>Files</span></button>
      <div className="tm-oct-side-section">
        <div className="tm-oct-section-title"><span>Workspace</span><button type="button" aria-label="New terminal" onClick={onCreateSession}><Icon name="plus" /></button></div>
        {pinned.length === 0 && <p className="tm-oct-github-note">Waiting for the agent…</p>}
        {pinned.map((item) => (
          <div className="tm-oct-pin" key={item.label}><Dot tone={item.tone} /><span>{item.label}</span><em>{item.tag}</em></div>
        ))}
      </div>
      <div className="tm-oct-side-section grow">
        <div className="tm-oct-subtitle">Worktrees and jobs <em>{tasks.length}</em></div>
        <div className="tm-oct-task-list">
          {tasks.length === 0 && <p className="tm-oct-github-note">Nothing yet. Write a task prompt under "Control state" and fan out worktrees, or run gates.</p>}
          {tasks.map((task) => (
            <button type="button" className={`tm-oct-task ${task.id === activeTaskId ? 'active' : ''}`} key={task.id} onClick={() => onTaskSelect(task.id)}>
              <div><Dot tone={task.status} /><strong>{task.title}</strong></div>
              <span>{task.meta}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tm-oct-statusbar-mini"><span>cmd: {activeCommand}</span></div>
    </aside>
  );
}

function UtilityPanel({ activeTask, activeCommand, fanoutPrompt, onPromptChange, gates }: { activeTask: TaskItem; activeCommand: string; fanoutPrompt: string; onPromptChange: (value: string) => void; gates: string }) {
  return (
    <section className="tm-oct-utility-pane">
      <div className="tm-oct-pane-head"><div><Icon name="activity" /><strong>Control state</strong></div><span>{activeCommand}</span></div>
      <div className="tm-oct-detail-grid">
        <div><span>Selected</span><strong>{activeTask.title}</strong></div>
        <div><span>Detail</span><strong>{activeTask.meta}</strong></div>
      </div>
      <label className="tm-oct-prompt">
        <span>Task prompt for fan-out</span>
        <textarea id="fanout-prompt" rows={2} placeholder="Describe the task each worktree should work on" value={fanoutPrompt} onChange={(event) => onPromptChange(event.target.value)} />
      </label>
      <p className="tm-oct-github-note">{gates}</p>
    </section>
  );
}


function CapabilityCoverage({ onAction }: { onAction: (action: string) => void }) {
  const visible = CAPABILITIES;
  return (
    <section className="tm-oct-capability-pane">
      <div className="tm-oct-pane-head"><div><Icon name="activity" /><strong>Feature buildout</strong></div><span>{CAPABILITIES.length} surfaces</span></div>
      <div className="tm-oct-capability-grid">
        {visible.map((item) => {
          const ACTION_MAP: Record<string, string> = {
            'Parallel Worktrees': 'list worktrees',
            'GitHub & task workflows': 'github-status',
            'Terminal Splits': 'new terminal',
            'Quick Open': 'quick-open',
            'Notifications/unread': 'notifications',
            'Synaptix CLI': 'run gates',
            'Any CLI Agent': 'spawn agent',
            'Rich Repo Previews': 'open file tree',
            'Mobile Companion': 'mobile',
            'Design Mode': 'capture UI',
            'SSH Worktrees': 'settings-ssh',
            'Annotate AI Diffs': 'github-status',
            'Drag Files to Agents': 'spawn agent',
            'Usage Tracking': 'settings-account',
            'Computer Use': 'settings-computer-use',
          };
          const action = ACTION_MAP[item.name] ?? item.name.toLowerCase().replace(/\s+/g, '-');
          return (
            <button key={item.name} type="button" className={`tm-oct-capability ${item.state}`} onClick={() => onAction(action)}>
              <div><strong>{item.name}</strong><em>{item.state}</em></div>
              <span>{item.detail}</span>
              <small>{item.action}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GithubWorkflowPane({ status, error, onRefresh }: { status: GithubStatus | null; error: string | null; onRefresh: () => void }) {
  return (
    <section className="tm-oct-github-pane">
      <div className="tm-oct-pane-head">
        <div><Icon name="github" /><strong>GitHub workflow</strong></div>
        <button type="button" className="tm-oct-github-refresh" onClick={onRefresh}>Refresh</button>
      </div>
      {error ? (
        <p className="tm-oct-github-note">{error}</p>
      ) : !status ? (
        <p className="tm-oct-github-note">Checking gh CLI…</p>
      ) : (
        <>
          <div className="tm-oct-github-grid">
            <div><span>gh</span><strong>{status.installed ? status.version ?? 'installed' : 'not installed'}</strong></div>
            <div><span>auth</span><strong>{status.authenticated ? status.account ?? 'authenticated' : 'anonymous'}</strong></div>
            <div><span>repo</span><strong>{status.repo.nameWithOwner ?? 'none detected'}</strong></div>
            <div><span>default</span><strong>{status.repo.defaultBranch ?? '—'}</strong></div>
          </div>
          {status.branchHints.length > 0 && (
            <div className="tm-oct-github-hints">
              {status.branchHints.slice(0, 6).map((branch) => <em key={branch}>{branch}</em>)}
            </div>
          )}
          {status.prHints.length > 0 && (
            <div className="tm-oct-github-prs">
              {status.prHints.slice(0, 3).map((pr) => (
                <div key={pr.number}><strong>#{pr.number}</strong><span>{pr.title}</span><em>{pr.state}</em></div>
              ))}
            </div>
          )}
          {status.notes.length > 0 && <p className="tm-oct-github-note">{status.notes[0]}</p>}
        </>
      )}
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

function LiveSessionPane({ sessions, activeSessionId, activeTask, onSessionSelect, onCloseSession, wsClient, messageBus, getSessionOutput }: Pick<DashboardViewProps, 'sessions' | 'activeSessionId' | 'onSessionSelect' | 'onCloseSession' | 'wsClient' | 'messageBus' | 'getSessionOutput'> & { activeTask: TaskItem }) {
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const { layout, setMode, assignActiveSession, clearPane } = useSplitLayout(sessions, activeSessionId);
  const multiPane = layout.mode !== 'single';
  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const displaySessions = sessions;
  const handleClose = useCallback((session: Session) => (event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirmClose === session.id) { onCloseSession(session.id); setConfirmClose(null); } else { setConfirmClose(session.id); }
  }, [confirmClose, onCloseSession]);
  return (
    <section className="tm-oct-live-pane">
      <div className="tm-oct-pane-head"><div><Icon name="terminal" /><strong>{active?.name ?? activeTask.title}</strong></div><span>{sessions.length} session{sessions.length === 1 ? '' : 's'}</span></div>
      <div className="tm-oct-live-tabs">
        {displaySessions.slice(0, 4).map((session) => (
          <button key={session.id} type="button" className={session.id === active?.id ? 'active' : ''} onClick={() => onSessionSelect(session.id)}>
            <Dot tone={session.status === 'run' ? 'green' : 'muted'} /> {session.name}
            {sessions.length > 0 && <i onClick={handleClose(session)}>{confirmClose === session.id ? 'sure?' : '×'}</i>}
          </button>
        ))}
      </div>
      <SplitLayoutControlsView
        layout={layout}
        setMode={setMode}
        assignActiveSession={assignActiveSession}
        clearPane={clearPane}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={onSessionSelect}
      />
      {multiPane ? (
        <MultiPaneTerminal
          layout={layout}
          sessions={sessions}
          activeSessionId={activeSessionId}
          wsClient={wsClient}
          messageBus={messageBus}
          getSessionOutput={getSessionOutput}
          onSessionSelect={onSessionSelect}
          onAssignActiveSession={assignActiveSession}
          onClearPane={clearPane}
        />
      ) : (
        <pre className="tm-oct-terminal main">{sessions.length === 0 ? 'No terminal session yet.\nUse "new terminal" to start one on this machine.' : 'Click a session below to open it in the terminal.'}</pre>
      )}
      <div className="tm-oct-inputbar"><span>›</span><em>Type in a session pane to send input</em></div>
    </section>
  );
}

function FileTreeRail({ title, activeFile, files, onFileSelect, onFileAction }: { title: string; activeFile: string; files: FileItem[]; onFileSelect: (path: string) => void; onFileAction: (action: string) => void }) {
  return (
    <aside className="tm-oct-filetree">
      <div className="tm-oct-file-head"><strong>{title}</strong></div>
      <div className="tm-oct-tree-list operational">
        {files.length === 0 && <p className="tm-oct-github-note">No files listed yet.</p>}
        {files.map((file) => (
          <button type="button" className={file.path === activeFile ? 'selected' : ''} key={file.path} onClick={() => onFileSelect(file.path)}>
            <Icon name={file.kind === 'dir' ? 'files' : 'terminal'} />
            <span>{file.path}</span>
            {file.status && file.status !== 'clean' && <em>{file.status}</em>}
          </button>
        ))}
      </div>
      <div className="tm-oct-file-actions"><button type="button" onClick={() => onFileAction('list-files')}>Refresh</button></div>
    </aside>
  );
}

function PhonePreview({ status, agentCount, taskCount, connectionStatus, latencyMs, activeTask, phoneMode, setPhoneMode, onCreateSession, onAction }: { status: CockpitStatus | null; agentCount: number; taskCount: number; connectionStatus: ConnectionStatus; latencyMs: number | null; activeTask: TaskItem; phoneMode: string; setPhoneMode: (mode: string) => void; onCreateSession: () => void; onAction: (action: string) => void }) {
  const online = connectionStatus === 'connected';
  return (
    <aside className="tm-oct-phone" aria-label="Phone layout preview">
      <div className="tm-phone-brand"><img src={`${import.meta.env.BASE_URL}synaptix-logo.svg`} alt="" /><strong>Synaptix</strong></div>
      <h2>Phone view</h2>
      <div className="tm-phone-mode-tabs">{['desktop', 'agents', 'files'].map((mode) => <button key={mode} type="button" className={phoneMode === mode ? 'active' : ''} onClick={() => { setPhoneMode(mode); onAction(mode === 'files' ? 'list-files' : 'git-status'); }}>{mode}</button>)}</div>
      <div className="tm-phone-stats">
        <div><Icon name="bot" /><strong>{agentCount}</strong><span>Agents</span></div>
        <div><Icon name="activity" /><strong>{taskCount}</strong><span>Tasks</span></div>
        <div><Icon name="branch" /><strong>{status?.gates?.length ?? 0}</strong><span>Gates</span></div>
      </div>
      <label>Machine</label>
      <div className="tm-phone-card"><Icon name="desktop" /><div><strong>{status?.machine ?? '—'}</strong><span><Dot tone={online ? 'green' : 'red'} /> {online ? 'Connected' : 'Offline'} · {latencyMs != null ? `${latencyMs} ms` : '— ms'}</span></div></div>
      <label>Selected</label>
      <div className="tm-phone-card"><Icon name="terminal" /><div><strong>{activeTask.title}</strong><span>{activeTask.meta}</span></div></div>
      <label>Quick actions</label>
      <div className="tm-phone-actions"><button type="button" onClick={onCreateSession}><Icon name="plus" /> Terminal</button><button type="button" onClick={() => onAction('list-files')}><Icon name="files" /> Files</button></div>
    </aside>
  );
}

export function DashboardView({ sessions, activeSessionId, onSessionSelect, onCreateSession, onCloseSession, connectionStatus, latencyMs, authToken, wsClient, messageBus, getSessionOutput }: DashboardViewProps) {
  const [activeTaskId, setActiveTaskId] = useState<string>(OVERVIEW_TASK_ID);
  const [activeFile, setActiveFile] = useState('');
  const [fanoutPrompt, setFanoutPrompt] = useState('');
  const [activeCommand, setActiveCommand] = useState('run gates');
  const [phoneMode, setPhoneMode] = useState('desktop');
  const [cockpitStatus, setCockpitStatus] = useState<CockpitStatus | null>(null);
  const [cockpitError, setCockpitError] = useState<string | null>(null);
  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [lastBackendAction, setLastBackendAction] = useState<string>('status');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [worktreeOutput, setWorktreeOutput] = useState<string | null>(null);
  const [worktreeBusy, setWorktreeBusy] = useState(false);

  const authHeaders = useMemo(() => authToken ? { Authorization: `Bearer ${authToken}` } : undefined, [authToken]);
  const tasks = useMemo(() => deriveTasks(cockpitStatus), [cockpitStatus]);
  const agents = useMemo(() => deriveAgents(cockpitStatus), [cockpitStatus]);
  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) ?? overviewTask(cockpitStatus), [tasks, activeTaskId, cockpitStatus]);

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

  const refreshGithubStatus = useCallback(async () => {
    if (!authHeaders) return;
    try {
      const response = await fetch('/api/cockpit/github', { headers: authHeaders });
      if (!response.ok) throw new Error(`github ${response.status}`);
      setGithubStatus(await response.json() as GithubStatus);
      setGithubError(null);
    } catch (error) {
      setGithubError(error instanceof Error ? error.message : 'github status failed');
    }
  }, [authHeaders]);

  useEffect(() => { void refreshGithubStatus(); }, [refreshGithubStatus]);

  useEffect(() => {
    if (!authHeaders || !activeFile) { setFilePreview(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/cockpit/file?path=${encodeURIComponent(activeFile)}&maxBytes=8000`, { headers: authHeaders });
        if (!response.ok) throw new Error(`file ${response.status}`);
        const preview = await response.json() as FilePreview;
        if (!cancelled) setFilePreview(preview);
      } catch {
        if (!cancelled) setFilePreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [authHeaders, activeFile]);

  const runWorktreeAction = useCallback(async (action: 'create' | 'list' | 'cleanup') => {
    if (!authHeaders || worktreeBusy) return;
    if (action === 'create' && !fanoutPrompt.trim()) {
      setWorktreeOutput('Write a task prompt under "Control state" before fanning out worktrees.');
      return;
    }
    setWorktreeBusy(true);
    setActiveCommand(action === 'create' ? 'fan out worktrees' : action === 'list' ? 'list worktrees' : 'clean worktrees');
    setLastBackendAction(`worktrees:${action}`);
    try {
      if (action === 'create') {
        const response = await fetch('/api/cockpit/worktrees/fanout', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fanoutPrompt.trim(), count: 2 }),
        });
        if (!response.ok) throw new Error(`fanout ${response.status}`);
        const result = await response.json() as { count?: number; worktrees?: Array<{ branch: string; path: string }> };
        const created = result.worktrees ?? [];
        setWorktreeOutput(created.length
          ? `fan-out created (${created.length})\n\n${created.map((w) => `${w.branch}\n  ${w.path}`).join('\n')}`
          : 'fan-out created synchronously');
        setLastBackendAction(`worktrees:fanout:${result.count ?? created.length}`);
      } else if (action === 'list') {
        const response = await fetch('/api/cockpit/worktrees', { headers: authHeaders });
        if (!response.ok) throw new Error(`list ${response.status}`);
        const result = await response.json() as { worktrees?: Array<{ index: number; branch: string; path: string }> };
        const worktrees = result.worktrees ?? [];
        setWorktreeOutput(worktrees.length
          ? `fan-out worktrees (${worktrees.length})\n\n${worktrees.map((w) => `${w.index}. ${w.branch}\n  ${w.path}`).join('\n')}`
          : 'no fan-out worktrees yet — try "fan out worktrees"');
        setLastBackendAction(`worktrees:list:${worktrees.length}`);
      } else {
        const response = await fetch('/api/cockpit/worktrees?force=true', { method: 'DELETE', headers: authHeaders });
        if (!response.ok) throw new Error(`cleanup ${response.status}`);
        const result = await response.json() as { removed?: string[] };
        const removed = result.removed ?? [];
        setWorktreeOutput(`cleaned up ${removed.length} worktree${removed.length === 1 ? '' : 's'}${removed.length ? `\n\n${removed.map((path) => `  ${path}`).join('\n')}` : ''}`);
        setLastBackendAction(`worktrees:cleanup:${removed.length}`);
      }
      await refreshCockpitStatus();
      setCockpitError(null);
    } catch (error) {
      setCockpitError(error instanceof Error ? error.message : 'worktree action failed');
    } finally {
      setWorktreeBusy(false);
    }
  }, [authHeaders, worktreeBusy, fanoutPrompt, refreshCockpitStatus]);

  const runBackendAction = useCallback(async (action: string) => {
    if (action === 'fan out worktrees') { void runWorktreeAction('create'); return; }
    if (action === 'list worktrees') { void runWorktreeAction('list'); return; }
    if (action === 'clean worktrees') { void runWorktreeAction('cleanup'); return; }
    if (action === 'quick-open' || action === 'notifications' || action === 'mobile' ||
        action.startsWith('settings-')) {
      setActiveCommand(action);
      setLastBackendAction(action);
      void refreshCockpitStatus();
      return;
    }
    setActiveCommand(action);
    setLastBackendAction(action);
    if (!authHeaders) return;
    if (action === 'new terminal') { onCreateSession(); return; }
    if (action === 'spawn agent') { void runWorktreeAction('create'); return; }
    const backendAction = action === 'open file tree' ? 'list-files' : action === 'capture UI' ? 'list-files' : action === 'watch CI' ? 'github-status' : action;
    try {
      const response = await fetch('/api/cockpit/actions', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: backendAction, path: '.' }) });
      if (!response.ok) throw new Error(`action ${backendAction} ${response.status}`);
      await response.json();
      await refreshCockpitStatus();
      if (backendAction === 'github-status') void refreshGithubStatus();
      setCockpitError(null);
    } catch (error) {
      setCockpitError(error instanceof Error ? error.message : 'cockpit action failed');
    }
  }, [authHeaders, onCreateSession, refreshCockpitStatus, refreshGithubStatus, runWorktreeAction]);
  const backendFiles: FileItem[] = useMemo(() => cockpitStatus?.files.entries.map((entry) => ({ path: entry.path, kind: entry.kind, status: entry.path === activeFile ? 'modified' : 'clean' })) ?? [], [activeFile, cockpitStatus]);
  const previewText = worktreeOutput ?? (filePreview
    ? `file: ${filePreview.path} · ${filePreview.size} bytes${filePreview.truncated ? ' · truncated' : ''}\n\n${filePreview.binary ? '(binary file — no text preview)' : filePreview.content}`
    : activeFile ? `Could not load ${activeFile}.` : 'Select a file in the tree to preview it.');

  return (
    <div className="tm-orca-stage">
      <WindowChrome activeTask={activeTask} />
      <CommandStrip activeCommand={activeCommand} onCommand={runBackendAction} onCreateSession={onCreateSession} />
      <div className="tm-orca-grid operational">
        <WorkspaceSidebar status={cockpitStatus} tasks={tasks} activeTaskId={activeTask.id} activeCommand={activeCommand} onTaskSelect={setActiveTaskId} onCommand={runBackendAction} onCreateSession={onCreateSession} />
        <main className="tm-orca-center operational">
          <LiveSessionPane sessions={sessions} activeSessionId={activeSessionId} activeTask={activeTask} onSessionSelect={onSessionSelect} onCloseSession={onCloseSession} wsClient={wsClient} messageBus={messageBus} getSessionOutput={getSessionOutput} />
          <div className="tm-oct-split-stack operational">
            <UtilityPanel activeTask={activeTask} activeCommand={`${activeCommand} · backend ${lastBackendAction}${cockpitError ? ` · ${cockpitError}` : ''}`} fanoutPrompt={fanoutPrompt} onPromptChange={setFanoutPrompt} gates={gateSummary(cockpitStatus)} />
            <AgentRegistryPanel authToken={authToken} />
            <CapabilityCoverage onAction={runBackendAction} />
            <GithubWorkflowPane status={githubStatus} error={githubError} onRefresh={() => void refreshGithubStatus()} />
            <TerminalPane title="selected file / run output" subtitle={activeFile || 'none selected'} active>
{previewText}
            </TerminalPane>
          </div>
        </main>
        <FileTreeRail title={cockpitStatus ? cockpitStatus.root.split('/').filter(Boolean).pop() ?? 'files' : 'files'} activeFile={activeFile} files={backendFiles} onFileSelect={setActiveFile} onFileAction={runBackendAction} />
      </div>
      <div className="tm-oct-bottom"><span>task: {activeTask.title}</span><span>worktrees: {cockpitStatus?.worktrees?.length ?? 0}</span><span>file: {activeFile ? activeFile.split('/').pop() : 'none'}</span><span>cmd: {activeCommand}</span></div>
      <PhonePreview status={cockpitStatus} agentCount={agents.length} taskCount={tasks.length} connectionStatus={connectionStatus} latencyMs={latencyMs} activeTask={activeTask} phoneMode={phoneMode} setPhoneMode={setPhoneMode} onCreateSession={onCreateSession} onAction={runBackendAction} />
    </div>
  );
}
