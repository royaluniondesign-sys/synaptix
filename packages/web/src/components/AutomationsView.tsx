import { useState } from 'react';
import { T as S } from '../lib/design';

interface AgentTask {
  id: string;
  title: string;
  subtitle: string;
  status: 'needs_you' | 'working' | 'done';
  tags: string[];
  time: string;
}

const SAMPLE_TASKS: AgentTask[] = [
  { id: '1', title: 'Fix CI lint errors', subtitle: 'claude / main — 3 errors in packages/agent', status: 'needs_you', tags: ['lint', 'ci'], time: '2m ago' },
  { id: '2', title: 'Review PR #69 changes', subtitle: 'claude/sidebar-redesign — 8 files changed', status: 'needs_you', tags: ['review', 'ui'], time: '5m ago' },
  { id: '3', title: 'Refactor auth middleware', subtitle: 'claude / feat-auth — Running typecheck', status: 'working', tags: ['backend', 'auth'], time: '12m ago' },
  { id: '4', title: 'Add pagination to tasks API', subtitle: 'claude / feat-pagination — Building...', status: 'working', tags: ['backend', 'api'], time: '18m ago' },
  { id: '5', title: 'Update README.md badges', subtitle: 'claude / docs — Committed & pushed', status: 'done', tags: ['docs'], time: '1h ago' },
  { id: '6', title: 'Fix TunnelsView warning color', subtitle: 'claude / sidebar-redesign — Merged #68', status: 'done', tags: ['ui', 'fix'], time: '2h ago' },
];

const COLUMNS = [
  { key: 'needs_you' as const, label: 'Needs You', color: S.warning },
  { key: 'working' as const, label: 'Working', color: S.info },
  { key: 'done' as const, label: 'Done', color: S.success },
];

function AgentCard({ task, onMove }: { task: AgentTask; onMove: (id: string, status: AgentTask['status']) => void }) {
  return (
    <div style={{
      background: S.surface,
      border: `1px solid ${S.border}`,
      borderRadius: 9, padding: '11px 13px',
      marginBottom: 6, cursor: 'pointer',
      transition: 'border-color 100ms',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = S.border2; (e.currentTarget as HTMLDivElement).style.background = S.surface2; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = S.border; (e.currentTarget as HTMLDivElement).style.background = S.surface; }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: S.text1, marginBottom: 4, lineHeight: 1.4 }}>{task.title}</div>
      <div style={{ fontSize: 10, color: S.text3, marginBottom: 8, lineHeight: 1.4 }}>{task.subtitle}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {task.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: S.surface3, color: S.text3,
            border: `1px solid ${S.border}`,
          }}>{tag}</span>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: S.text3 }}>{task.time}</span>
      </div>
      {/* Quick move actions */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {COLUMNS.filter(c => c.key !== task.status).map(col => (
          <button key={col.key} type="button"
            onClick={e => { e.stopPropagation(); onMove(task.id, col.key); }}
            style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              background: 'transparent',
              border: `1px solid ${S.border}`,
              color: S.text3, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 80ms',
            }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = col.color; b.style.color = col.color; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = S.border; b.style.color = S.text3; }}
          >→ {col.label}</button>
        ))}
      </div>
    </div>
  );
}

export function AutomationsView() {
  const [tasks, setTasks] = useState<AgentTask[]>(SAMPLE_TASKS);
  const [search, setSearch] = useState('');

  const moveTask = (id: string, newStatus: AgentTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filtered = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 7,
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 7, padding: '0 10px', height: 32,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search worktree, project, or agent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              color: S.text1, fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Filter */}
        <button type="button" style={{
          height: 32, padding: '0 12px', borderRadius: 7,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filter
        </button>

        {/* Runs button */}
        <button type="button" style={{
          height: 32, padding: '0 12px', borderRadius: 7,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Runs
        </button>

        {/* New Automation */}
        <button type="button" style={{
          height: 32, padding: '0 12px', borderRadius: 7,
          border: `1px solid ${S.border}`, background: S.surface2,
          color: S.text1, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Automation
        </button>
      </div>

      {/* Kanban */}
      <div style={{
        flex: 1, display: 'flex', gap: 0, overflow: 'hidden',
      }}>
        {COLUMNS.map((col, ci) => {
          const colTasks = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              borderRight: ci < COLUMNS.length - 1 ? `1px solid ${S.border}` : 'none',
              overflow: 'hidden',
            }}>
              {/* Column header */}
              <div style={{
                padding: '12px 16px 10px',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{col.label}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: S.surface2, border: `1px solid ${S.border}`,
                  borderRadius: 5, color: S.text3, padding: '0 4px',
                }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
                {colTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: S.text3, fontSize: 12 }}>None</div>
                ) : (
                  colTasks.map(task => <AgentCard key={task.id} task={task} onMove={moveTask} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
