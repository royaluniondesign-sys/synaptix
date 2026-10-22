import { useState } from 'react';
import { T as S } from '../lib/design';

interface AgentTask {
  id: string;
  title: string;
  branch: string;
  project: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  time: string;
  icon: 'terminal' | 'agent' | 'folder';
}

const SAMPLE_TASKS: AgentTask[] = [
  { id: '1', title: 'Fix CI lint errors',        branch: 'main',                  project: 'Termora',  status: 'in_progress', time: '2m',  icon: 'terminal' },
  { id: '2', title: 'Sidebar redesign PR',        branch: 'claude/sidebar-redesign', project: 'Termora',status: 'in_progress', time: '5m',  icon: 'agent' },
  { id: '3', title: 'Refactor auth middleware',   branch: 'master',                project: 'RUD-WEB',  status: 'in_progress', time: '12m', icon: 'terminal' },
  { id: '4', title: 'Add pagination API',         branch: 'master',                project: 'RUD-WEB',  status: 'in_progress', time: '18m', icon: 'terminal' },
  { id: '5', title: 'Setup repo',                 branch: 'master',                project: 'antigravity', status: 'in_progress', time: '1h', icon: 'folder' },
  { id: '6', title: 'Initial commit',             branch: 'main',                  project: 'Termora',  status: 'in_progress', time: '2h', icon: 'agent' },
  { id: '7', title: 'Update README badges',       branch: 'main',                  project: 'Termora',  status: 'done',       time: '3h', icon: 'folder' },
  { id: '8', title: 'Fix TunnelsView color',      branch: 'claude/sidebar-redesign', project: 'Termora',status: 'done',        time: '4h', icon: 'agent' },
];

const COLUMNS = [
  { key: 'todo'        as const, label: 'Todo',        dot: 'empty'  },
  { key: 'in_progress' as const, label: 'In progress', dot: 'orange' },
  { key: 'in_review'   as const, label: 'In review',   dot: 'green'  },
  { key: 'done'        as const, label: 'Done',        dot: 'filled' },
];

const DOT_COLORS: Record<string, string> = {
  empty: S.text3,
  orange: S.warning,
  green: S.success,
  filled: S.text2,
};

const IcFolder   = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const IcTerminal = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IcAgent    = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/></svg>;
const IcBranch   = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>;

const icMap: Record<AgentTask['icon'], React.ReactNode> = {
  folder: IcFolder,
  terminal: IcTerminal,
  agent: IcAgent,
};

function StatusDot({ dot }: { dot: string }) {
  const color = DOT_COLORS[dot];
  if (dot === 'filled') {
    return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />;
  }
  return <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${color}`, background: dot === 'orange' ? `${color}22` : 'transparent', flexShrink: 0, display: 'inline-block' }} />;
}

function TaskRow({ task }: { task: AgentTask }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', height: 40, cursor: 'pointer',
        borderBottom: `1px solid ${S.border2}`,
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 60ms',
      }}
    >
      {/* Status arrow (clock/sync icon) */}
      <span style={{ color: S.text3, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </span>
      {/* File/agent icon */}
      <span style={{ color: S.text3, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icMap[task.icon]}</span>
      {/* Branch + project */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <span style={{ fontSize: 12, color: hovered ? S.text1 : S.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.branch}
        </span>
        <span style={{ color: S.text3, flexShrink: 0, display: 'flex' }}>{IcBranch}</span>
      </div>
      {/* "primary" badge */}
      <span style={{
        fontSize: 9, fontWeight: 500, padding: '1px 6px',
        borderRadius: 4, background: S.surface3, color: S.text3,
        border: `1px solid ${S.border}`, flexShrink: 0, whiteSpace: 'nowrap',
      }}>primary</span>
      {/* Time */}
      {hovered && (
        <span style={{ fontSize: 9, color: S.text3, flexShrink: 0 }}>{task.time}</span>
      )}
    </div>
  );
}

export function AutomationsView() {
  const [tasks] = useState<AgentTask[]>(SAMPLE_TASKS);
  const [search, setSearch] = useState('');

  const filtered = tasks.filter(t =>
    !search || t.branch.toLowerCase().includes(search.toLowerCase()) || t.project.toLowerCase().includes(search.toLowerCase()) || t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: S.text1, marginRight: 8 }}>Workspace board</span>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 6, padding: '0 8px', height: 28, minWidth: 180,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', background: 'transparent',
              color: S.text1, fontSize: 11, fontFamily: 'inherit', outline: 'none', width: '100%',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Icon buttons */}
        {[
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        ].map((icon, i) => (
          <button key={i} type="button" style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text3, cursor: 'pointer',
          }}>{icon}</button>
        ))}

        {/* Runs */}
        <button type="button" style={{
          height: 28, padding: '0 10px', borderRadius: 6,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Runs
        </button>

        {/* New Automation */}
        <button type="button" style={{
          height: 28, padding: '0 10px', borderRadius: 6,
          border: `1px solid ${S.primaryBorder}`, background: S.primaryAlpha,
          color: S.primary, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Automation
        </button>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {COLUMNS.map((col, ci) => {
          const colTasks = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              borderRight: ci < COLUMNS.length - 1 ? `1px solid ${S.border}` : 'none',
              overflow: 'hidden', minWidth: 0,
            }}>
              {/* Column header */}
              <div style={{
                padding: '10px 12px 8px',
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                borderBottom: `1px solid ${S.border}`,
              }}>
                <StatusDot dot={col.dot} />
                <span style={{ fontSize: 12, fontWeight: 500, color: S.text2 }}>{col.label}</span>
                <span style={{
                  fontSize: 9, fontWeight: 600, minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: S.surface3, borderRadius: 4, color: S.text3, padding: '0 4px',
                }}>{colTasks.length}</span>
                <div style={{ flex: 1 }} />
                <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 2, display: 'flex' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>

              {/* Rows */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {colTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: S.text3, fontSize: 12 }}>Empty</div>
                ) : (
                  colTasks.map(task => <TaskRow key={task.id} task={task} />)
                )}
                {/* Add row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px', height: 36, cursor: 'pointer', color: S.text3,
                  borderTop: colTasks.length > 0 ? `1px solid ${S.border2}` : 'none',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = S.text2; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = S.text3; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{ fontSize: 11 }}>Add item</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
