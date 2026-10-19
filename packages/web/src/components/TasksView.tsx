import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

interface TasksViewProps {
  sessions: Session[];
  connectionStatus: ConnectionStatus;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  authToken: string | null;
}

type TabId = 'sessions' | 'tasks' | 'github';

const S = {
  bg: '#09090b', surface: '#111113', surface2: '#1c1c1f', surface3: '#2a2a2e',
  border: 'rgba(255,255,255,0.07)', primary: '#7170ff', success: '#10b981',
  error: '#ef4444', warning: '#f59e0b', text1: '#f4f4f5', text2: '#a1a1aa', text3: '#52525b',
} as const;

const PROJECTS = ['All projects', 'RUD-WEB', 'Termora', 'excited-bohr', 'excited-tesla', 'intelligent-galileo', 'serene-raman'];

interface GhIssue { number: number; title: string; headRefName?: string; state: string; labels: string[]; updatedAt?: string }

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Tag({ label, color }: { label: string; color?: string }) {
  const c = color ?? S.surface3;
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 4,
      background: `${c}22`, border: `1px solid ${c}44`,
      color: c, fontWeight: 500, flexShrink: 0, lineHeight: '16px',
    }}>{label}</span>
  );
}

function SessionRow({ session, index, onOpen }: { session: Session; index: number; onOpen: () => void }) {
  const statusColor = session.status === 'run' ? S.success : S.text3;
  const shellColor: Record<string, string> = { claude: S.primary, tmux: S.warning, zsh: S.text2 };
  const cwd = session.cwd.replace(/^\/Users\/[^/]+/, '~');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 1fr 100px 110px 90px 80px',
      alignItems: 'center', gap: 0,
      borderBottom: `1px solid ${S.border}`,
      padding: '0 16px', minHeight: 52,
      cursor: 'pointer', transition: 'background 100ms',
    }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = S.surface2; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ fontSize: 12, color: S.text3, fontFamily: "'JetBrains Mono', monospace" }}>#{index + 1}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: S.text1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{session.name}</span>
          <Tag label={session.shell} color={shellColor[session.shell] ?? S.text2} />
        </div>
        <div style={{ fontSize: 11, color: S.text3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cwd}</div>
      </div>
      <div style={{ fontSize: 12, color: S.text3 }}>—</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 500, color: statusColor,
          background: `${statusColor}15`, border: `1px solid ${statusColor}30`,
          padding: '2px 8px', borderRadius: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          {session.status === 'run' ? 'Running' : 'Idle'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: S.text3 }}>just now</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={e => { e.stopPropagation(); onOpen(); }} style={{
          height: 28, padding: '0 12px', borderRadius: 6,
          border: `1px solid ${S.primary}40`, background: `${S.primary}10`,
          color: S.primary, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Open
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

function GithubRow({ issue, onStart }: { issue: GhIssue; index: number; onStart: () => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 1fr 100px 110px 90px 80px',
      alignItems: 'center', gap: 0,
      borderBottom: `1px solid ${S.border}`,
      padding: '0 16px', minHeight: 52,
    }}>
      <div style={{ fontSize: 12, color: S.text3, fontFamily: "'JetBrains Mono', monospace" }}>#{issue.number}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: S.text1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{issue.title}</span>
          {issue.labels.map(l => <Tag key={l} label={l} />)}
        </div>
        {issue.headRefName && (
          <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>{issue.headRefName}</div>
        )}
      </div>
      <div style={{ fontSize: 12, color: S.text3 }}>—</div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 500, color: S.success,
          background: `${S.success}15`, border: `1px solid ${S.success}30`,
          padding: '2px 8px', borderRadius: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.success, flexShrink: 0 }} />
          {issue.state === 'OPEN' ? 'Open' : issue.state}
        </span>
      </div>
      <div style={{ fontSize: 11, color: S.text3 }}>{timeAgo(issue.updatedAt)}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onStart} style={{
          height: 28, padding: '0 12px', borderRadius: 6,
          border: `1px solid ${S.primary}40`, background: `${S.primary}10`,
          color: S.primary, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Start
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

const COLUMN_HEADERS = ['ID', 'TITLE / CONTEXT', 'ASSIGNEES', 'STATUS', 'UPDATED', ''];

export function TasksView({ sessions, connectionStatus, onSessionSelect, onCreateSession, authToken }: TasksViewProps) {
  const [tab, setTab] = useState<TabId>('sessions');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'open' | 'all'>('open');
  const [filterAssigned, setFilterAssigned] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('All projects');
  const [ghIssues, setGhIssues] = useState<GhIssue[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghRepo, setGhRepo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchGithub = useCallback(async () => {
    if (!authToken) return;
    setGhLoading(true);
    setGhError(null);
    try {
      const r = await fetch('/api/cockpit/actions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'github-status', path: '.' }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json() as { prHints?: GhIssue[]; nameWithOwner?: string };
      setGhIssues(d.prHints ?? []);
      setGhRepo(d.nameWithOwner ?? null);
    } catch (e) {
      setGhError(e instanceof Error ? e.message : 'GitHub unavailable');
    } finally {
      setGhLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (tab === 'github') void fetchGithub();
  }, [tab, fetchGithub]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setFilterMenuOpen(false);
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) setProjectMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStartIssue = (issue: GhIssue) => {
    onCreateSession();
    showToast(`Starting terminal for #${issue.number}: ${issue.title.slice(0, 40)}`);
  };

  const clearFilters = () => {
    setFilterStatus('open');
    setFilterAssigned(false);
    setFilterSearch('');
    showToast('Filters cleared');
  };

  const filteredSessions = sessions.filter(s => {
    if (filterSearch && !s.name.toLowerCase().includes(filterSearch.toLowerCase()) && !s.cwd.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const activeFiltersCount = (filterAssigned ? 1 : 0);
  const machineName = 'MacBook-Pro.local';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg, position: 'relative' }}>

      {/* Breadcrumb / project bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={S.text2}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        <span style={{ fontSize: 12, color: S.text2 }}>
          <span style={{ color: S.text1, fontWeight: 600 }}>Termora</span>
          <span style={{ color: S.text3, margin: '0 4px' }}>·</span>
          <span>{machineName}</span>
          <span style={{ color: S.text3, margin: '0 4px' }}>·</span>
          <span>{sessions.length} project{sessions.length !== 1 ? 's' : ''}</span>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button type="button" onClick={onCreateSession} style={{
            height: 28, padding: '0 10px', borderRadius: 6,
            border: `1px solid ${S.border}`, background: S.surface2,
            color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New terminal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0, gap: 2,
      }}>
        {([
          { id: 'sessions' as TabId, label: 'Sessions', count: sessions.length },
          { id: 'tasks' as TabId, label: 'Tasks', count: null },
          { id: 'github' as TabId, label: 'GitHub Issues', count: ghIssues.length || null },
        ]).map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            height: 38, padding: '0 12px', border: 'none',
            borderBottom: tab === t.id ? `2px solid ${S.primary}` : '2px solid transparent',
            background: 'transparent', color: tab === t.id ? S.text1 : S.text3,
            fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'color 120ms',
          }}>
            {t.label}
            {t.count !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: tab === t.id ? `${S.primary}25` : S.surface2,
                color: tab === t.id ? S.primary : S.text3,
                padding: '1px 5px', borderRadius: 8, minWidth: 18, textAlign: 'center',
              }}>{t.count}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />

        {/* All projects dropdown */}
        <div style={{ position: 'relative' }} ref={projectMenuRef}>
          <button type="button" onClick={() => setProjectMenuOpen(v => !v)} style={{
            height: 28, padding: '0 10px', borderRadius: 6,
            border: `1px solid ${projectMenuOpen ? S.primary : S.border}`,
            background: projectMenuOpen ? `${S.primary}10` : 'transparent',
            color: projectMenuOpen ? S.primary : S.text2,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {selectedProject}
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {projectMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 60,
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 9, padding: '4px 0', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}>
              {PROJECTS.map(p => (
                <button key={p} type="button" onClick={() => { setSelectedProject(p); setProjectMenuOpen(false); }} style={{
                  width: '100%', height: 32, padding: '0 12px',
                  border: 'none', background: selectedProject === p ? `${S.primary}15` : 'transparent',
                  color: selectedProject === p ? S.primary : S.text2,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {selectedProject === p && <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  <span style={{ marginLeft: selectedProject === p ? 0 : 16 }}>{p}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => { void fetchGithub(); showToast('Refreshing…'); }} style={{
          width: 28, height: 28, borderRadius: 6,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text2, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        {/* Filters menu */}
        <div style={{ position: 'relative' }} ref={filterMenuRef}>
          <button type="button" onClick={() => setFilterMenuOpen(v => !v)} style={{
            height: 28, padding: '0 10px', borderRadius: 6,
            border: `1px solid ${filterMenuOpen || activeFiltersCount > 0 ? S.primary : S.border}`,
            background: filterMenuOpen ? S.surface2 : activeFiltersCount > 0 ? `${S.primary}10` : 'transparent',
            color: filterMenuOpen || activeFiltersCount > 0 ? S.primary : S.text2,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
            Filters
            {activeFiltersCount > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, minWidth: 14, textAlign: 'center',
                background: S.primary, color: '#fff', padding: '0 4px', borderRadius: 6,
              }}>{activeFiltersCount}</span>
            )}
          </button>

          {filterMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 60,
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 10, padding: '6px 0', minWidth: 220,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {[
                { label: 'Show assigned to me', key: 'assigned' as const },
              ].map(item => (
                <button key={item.label} type="button" onClick={() => {
                  if (item.key === 'assigned') setFilterAssigned(v => !v);
                  setFilterMenuOpen(false);
                }} style={{
                  width: '100%', height: 34, padding: '0 14px',
                  border: 'none', background: 'transparent',
                  color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" stroke={filterAssigned ? S.primary : 'transparent'} fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${S.border}`, margin: '4px 0' }} />
              <div style={{ padding: '4px 14px 2px', fontSize: 10, fontWeight: 700, color: S.text3, letterSpacing: 0.5 }}>STATUS</div>
              {(['open', 'all'] as const).map(s => (
                <button key={s} type="button" onClick={() => { setFilterStatus(s); setFilterMenuOpen(false); }} style={{
                  width: '100%', height: 32, padding: '0 14px',
                  border: 'none', background: 'transparent',
                  color: filterStatus === s ? S.primary : S.text2,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" stroke={filterStatus === s ? S.primary : 'transparent'} fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {s === 'open' ? 'Open only' : 'Show all'}
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${S.border}`, margin: '4px 0' }} />
              <button type="button" onClick={() => { clearFilters(); setFilterMenuOpen(false); }} style={{
                width: '100%', height: 32, padding: '0 14px',
                border: 'none', background: 'transparent',
                color: S.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Open status filter */}
        <button type="button" onClick={() => setFilterStatus(v => v === 'open' ? 'all' : 'open')} style={{
          height: 28, padding: '0 10px', borderRadius: 6,
          border: `1px solid ${filterStatus === 'all' ? S.border : S.border}`,
          background: filterStatus === 'all' ? `${S.text3}10` : 'transparent',
          color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.success }} />
          {filterStatus === 'open' ? 'Open' : 'All'}
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {/* Assigned to me */}
        <button type="button" onClick={() => setFilterAssigned(v => !v)} style={{
          height: 28, padding: '0 10px', borderRadius: 6,
          border: `1px solid ${filterAssigned ? S.primary : S.border}`,
          background: filterAssigned ? `${S.primary}10` : 'transparent',
          color: filterAssigned ? S.primary : S.text2,
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Assigned to me
        </button>

        {/* Search box */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 6, padding: '0 10px', height: 28 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder={`is:${tab === 'github' ? 'issue' : 'session'} is:open`}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: S.text1, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>

        {/* Clear × */}
        <button type="button" onClick={clearFilters} title="Clear filters" style={{
          width: 28, height: 28, borderRadius: 6,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text3, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1,
        }}>×</button>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '52px 1fr 100px 110px 90px 80px',
        gap: 0, padding: '0 16px',
        borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        {COLUMN_HEADERS.map((h, i) => (
          <div key={i} style={{
            height: 34, display: 'flex', alignItems: 'center',
            fontSize: 10, fontWeight: 700, color: S.text3,
            letterSpacing: 0.6, textTransform: 'uppercase',
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'sessions' && (
          filteredSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: S.text3 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
              <p style={{ fontSize: 13, margin: '0 0 16px' }}>
                {connectionStatus !== 'connected' ? 'Connect to agent to view sessions' : filterSearch ? 'No sessions match your search' : 'No active sessions'}
              </p>
              {!filterSearch && (
                <button type="button" onClick={onCreateSession} style={{
                  height: 36, padding: '0 16px', borderRadius: 8,
                  border: 'none', background: S.primary, color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  New terminal
                </button>
              )}
            </div>
          ) : (
            filteredSessions.map((s, i) => (
              <SessionRow key={s.id} session={s} index={i} onOpen={() => onSessionSelect(s.id)} />
            ))
          )
        )}

        {tab === 'tasks' && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: S.text3 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }}>
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <p style={{ fontSize: 13, margin: '0 0 16px' }}>No tasks yet. Fan out worktrees in Agent Dashboard.</p>
            <button type="button" onClick={() => setTab('sessions')} style={{
              height: 32, padding: '0 14px', borderRadius: 7,
              border: `1px solid ${S.border}`, background: S.surface2,
              color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              View Sessions
            </button>
          </div>
        )}

        {tab === 'github' && (
          ghLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: S.text3, fontSize: 13 }}>
              <div style={{ display: 'inline-block', width: 20, height: 20, border: `2px solid ${S.surface3}`, borderTopColor: S.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 10 }} />
              <p style={{ margin: 0 }}>Checking gh CLI…</p>
            </div>
          ) : ghError ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: S.text3 }}>
              <p style={{ fontSize: 13, margin: '0 0 8px', color: S.error }}>{ghError}</p>
              <button type="button" onClick={() => void fetchGithub()} style={{ height: 32, padding: '0 14px', borderRadius: 6, border: `1px solid ${S.border}`, background: S.surface2, color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
            </div>
          ) : ghIssues.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: S.text3, fontSize: 13 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill={S.text3} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              <p style={{ margin: 0 }}>{ghRepo ? `No open issues in ${ghRepo}` : 'No GitHub repo detected — run gh auth login first'}</p>
            </div>
          ) : (
            ghIssues.map((issue, i) => <GithubRow key={issue.number} issue={issue} index={i} onStart={() => handleStartIssue(issue)} />)
          )
        )}
      </div>

      {/* Footer */}
      {connectionStatus !== 'connected' && (
        <div style={{
          padding: '8px 16px', borderTop: `1px solid ${S.border}`,
          background: S.surface, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: S.text3,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.error, flexShrink: 0 }} />
          Not connected to agent — sessions will appear when connected
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: '8px 14px',
          fontSize: 12, color: S.text1, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
