import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';
import { T as S } from '../lib/design';

interface TasksViewProps {
  sessions: Session[];
  connectionStatus: ConnectionStatus;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  authToken: string | null;
  onNavigate?: (view: string) => void;
}

type TabId = 'sessions' | 'tasks' | 'github';

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

// Extended sample data type
type ExtIssue = GhIssue & { kind: 'issue' | 'pr'; author: string; createdAt: string };

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

const SAMPLE_ISSUES: ExtIssue[] = [
  {
    kind: 'issue', number: 142,
    title: 'WebSocket reconnect drops pending session state on backend restart',
    state: 'OPEN', labels: ['bug', 'backend'],
    author: 'mcarrasco', createdAt: hoursAgo(3), updatedAt: hoursAgo(1),
  },
  {
    kind: 'pr', number: 141,
    title: 'feat: add PTY resize passthrough for dynamic terminal windows',
    state: 'OPEN', labels: ['enhancement'],
    headRefName: 'feat/pty-resize',
    author: 'whitemelonis', createdAt: hoursAgo(8), updatedAt: hoursAgo(2),
  },
  {
    kind: 'issue', number: 139,
    title: 'Agent registry loses entries when SYNAPTIX_AGENTS_FILE is unset',
    state: 'OPEN', labels: ['bug'],
    author: 'tluna', createdAt: hoursAgo(24), updatedAt: hoursAgo(5),
  },
  {
    kind: 'pr', number: 138,
    title: 'refactor: extract cockpit action dispatch into standalone module',
    state: 'OPEN', labels: ['refactor'],
    headRefName: 'refactor/cockpit-dispatch',
    author: 'whitemelonis', createdAt: hoursAgo(30), updatedAt: hoursAgo(6),
  },
  {
    kind: 'issue', number: 136,
    title: 'Add keyboard shortcut to focus filter input from any view',
    state: 'OPEN', labels: ['enhancement', 'ux'],
    author: 'jestrada', createdAt: hoursAgo(48), updatedAt: hoursAgo(12),
  },
  {
    kind: 'pr', number: 135,
    title: 'fix: ensure auth guard rejects missing bearer tokens on all routes',
    state: 'MERGED', labels: ['bug', 'security'],
    headRefName: 'fix/auth-guard-missing-token',
    author: 'mcarrasco', createdAt: hoursAgo(60), updatedAt: hoursAgo(24),
  },
  {
    kind: 'issue', number: 133,
    title: 'Tunnel reconnect loop causes CPU spike when agent host is unreachable',
    state: 'CLOSED', labels: ['bug', 'performance'],
    author: 'mcarrasco', createdAt: hoursAgo(72), updatedAt: hoursAgo(36),
  },
  {
    kind: 'issue', number: 128,
    title: 'Sessions tab should persist scroll position across re-renders',
    state: 'OPEN', labels: ['ux'],
    author: 'jestrada', createdAt: hoursAgo(120), updatedAt: hoursAgo(72),
  },
];

const LABEL_COLORS: Record<string, string> = {
  bug: S.error,
  enhancement: S.primary,
  feature: S.info,
  documentation: S.warning,
  refactor: '#94a3b8',
  performance: S.warning,
  ux: S.info,
  backend: '#a78bfa',
  security: S.error,
};

function getLabelColor(label: string): string {
  return LABEL_COLORS[label] ?? S.text3;
}

function IssueCircleIcon({ kind, state }: { kind: 'issue' | 'pr'; state: string }) {
  if (kind === 'pr') {
    const color = state === 'MERGED' ? '#a78bfa' : state === 'CLOSED' ? S.text3 : '#a78bfa';
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4.5" cy="4" r="1.75" stroke={color} strokeWidth="1.5" />
        <circle cx="11.5" cy="12" r="1.75" stroke={color} strokeWidth="1.5" />
        <path d="M4.5 5.75V12" stroke={color} strokeWidth="1.5" />
        <path d="M11.5 3L11.5 10.25" stroke={color} strokeWidth="1.5" />
        <path d="M9 5.5L11.5 3L14 5.5" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  const color = state === 'OPEN' ? S.success : S.text3;
  if (state !== 'OPEN') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.5" />
        <path d="M5.5 8l2 2 3-3" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" fill={color} />
    </svg>
  );
}

function FilterChip({ chip, onRemove }: { chip: string; onRemove: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 22, padding: '0 8px', borderRadius: 11,
        background: hovered ? S.surface3 : S.surface2,
        border: `1px solid ${hovered ? S.border2 : S.border}`,
        color: S.text2, fontSize: 10, fontFamily: S.fontMono,
        cursor: 'pointer', userSelect: 'none', transition: 'background 100ms',
        flexShrink: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onRemove}
    >
      {chip}
      {hovered && (
        <svg width="9" height="9" viewBox="0 0 12 12" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
          <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
        </svg>
      )}
    </span>
  );
}

function IssueRow({
  issue, hovered, onMouseEnter, onMouseLeave, onClick,
}: {
  issue: ExtIssue;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        borderBottom: `1px solid ${S.border2}`,
        background: hovered ? S.surface2 : 'transparent',
        cursor: 'pointer', transition: 'background 80ms',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Icon + number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, width: 74 }}>
        <IssueCircleIcon kind={issue.kind} state={issue.state} />
        <span style={{ fontSize: 11, color: S.text3, fontFamily: S.fontMono }}>#{issue.number}</span>
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: S.text1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {issue.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {issue.labels.map(l => (
            <Tag key={l} label={l} color={getLabelColor(l)} />
          ))}
          <span style={{ fontSize: 10, color: S.text3 }}>
            opened {timeAgo(issue.createdAt)} by {issue.author}
          </span>
        </div>
      </div>

      {/* Right: branch + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {issue.headRefName && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 4,
            background: S.surface3, border: `1px solid ${S.border}`,
            color: S.text3, fontFamily: S.fontMono,
            maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {issue.headRefName}
          </span>
        )}
        <span style={{ fontSize: 10, color: S.text3, minWidth: 46, textAlign: 'right' }}>
          {timeAgo(issue.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function SessionRow({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const statusColor = session.status === 'run' ? S.success : S.text3;
  const cwd = session.cwd.replace(/^\/Users\/[^/]+/, '~');
  const shellColor: Record<string, string> = { claude: S.primary, tmux: S.warning, zsh: S.text2 };
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px',
        borderBottom: `1px solid ${S.border2}`,
        background: hovered ? S.surface2 : 'transparent',
        cursor: 'pointer', transition: 'background 80ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, width: 74 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.25" stroke={statusColor} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.5" fill={statusColor} />
        </svg>
        <span style={{ fontSize: 11, color: S.text3, fontFamily: S.fontMono }}>
          {session.status === 'run' ? 'run' : 'idle'}
        </span>
      </div>

      {/* Name + path */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: S.text1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.name}
          </span>
          <Tag label={session.shell} color={shellColor[session.shell] ?? S.text2} />
        </div>
        <div style={{ fontSize: 10, color: S.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cwd}
        </div>
      </div>

      {/* Open button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpen(); }}
        style={{
          height: 28, padding: '0 12px', borderRadius: 6,
          border: `1px solid ${S.primaryBorder}`, background: S.primaryAlpha,
          color: S.primary, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}
      >
        Open
        <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'github', label: 'Issues' },
  { id: 'tasks', label: 'Pull Requests' },
  { id: 'sessions', label: 'Sessions' },
];

export function TasksView({ sessions, connectionStatus, onSessionSelect, onCreateSession, authToken, onNavigate }: TasksViewProps) {
  const [tab, setTab] = useState<TabId>('github');
  const [filterSearch, setFilterSearch] = useState('');
  const [chips, setChips] = useState<string[]>(['is:open', 'is:issue', 'assigned:me']);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [ghIssues, setGhIssues] = useState<GhIssue[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghRepo, setGhRepo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);


  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

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
    if (tab === 'github' && authToken) void fetchGithub();
  }, [tab, fetchGithub, authToken]);

  const removeChip = useCallback((chip: string) => setChips(cs => cs.filter(c => c !== chip)), []);

  const displayIssues = useMemo<ExtIssue[]>(() => {
    // Prefer real API issues when loaded; fall back to sample data
    const apiIssues: ExtIssue[] = ghIssues.map((i: GhIssue) => ({
      ...i,
      kind: (i.headRefName ? 'pr' : 'issue') as 'issue' | 'pr',
      author: 'github',
      createdAt: i.updatedAt ?? new Date().toISOString(),
    }));
    const source = apiIssues.length > 0 ? apiIssues : SAMPLE_ISSUES;

    let filtered: ExtIssue[];
    if (tab === 'github') {
      filtered = source.filter(i => i.kind === 'issue');
    } else if (tab === 'tasks') {
      filtered = source.filter(i => i.kind === 'pr');
    } else {
      return [];
    }
    if (chips.includes('is:open')) {
      filtered = filtered.filter(i => i.state === 'OPEN');
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        String(i.number).includes(q) ||
        i.author.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [tab, filterSearch, chips, ghIssues]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: S.bg, position: 'relative',
      fontFamily: S.fontSans,
    }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 48, flexShrink: 0,
        borderBottom: `1px solid ${S.border}`,
        background: S.surface,
      }}>
        {/* Title */}
        <span style={{ fontSize: 14, fontWeight: 600, color: S.text1, flexShrink: 0 }}>Tasks</span>

        {/* Search input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 6,
          height: 30, padding: '0 10px',
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 7, maxWidth: 380,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={filterRef}
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="is:issue is:open"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: S.text1, fontSize: 11, fontFamily: S.fontMono,
            }}
          />
          {filterSearch && (
            <button type="button" onClick={() => setFilterSearch('')} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: S.text3, display: 'flex', alignItems: 'center', padding: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round">
                <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Filter button */}
        <button type="button" style={{
          height: 30, padding: '0 10px', borderRadius: 6,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.text2, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filter
        </button>

        {/* Sync button */}
        <button
          type="button"
          onClick={() => { void fetchGithub(); showToast('Syncing…'); }}
          title="Sync"
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* New Task */}
        <button type="button" onClick={onCreateSession} style={{
          height: 30, padding: '0 12px', borderRadius: 6,
          border: 'none', background: S.primary,
          color: '#fff', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      </div>

      {/* Tab strip */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 0,
        padding: '0 16px', height: 38, flexShrink: 0,
        borderBottom: `1px solid ${S.border}`,
        background: S.surface,
      }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                height: 38, padding: '0 14px', border: 'none',
                borderBottom: active ? `2px solid ${S.primary}` : '2px solid transparent',
                background: 'transparent',
                color: active ? S.text1 : S.text3,
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 120ms, border-color 120ms',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filter chips row */}
      {chips.length > 0 && tab !== 'sessions' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 16px',
          borderBottom: `1px solid ${S.border2}`,
          background: S.surface, flexShrink: 0, flexWrap: 'wrap',
        }}>
          {chips.map(chip => (
            <FilterChip key={chip} chip={chip} onRemove={() => removeChip(chip)} />
          ))}
          <button
            type="button"
            onClick={() => setChips([])}
            style={{
              height: 22, padding: '0 8px', borderRadius: 11,
              border: `1px solid transparent`, background: 'transparent',
              color: S.text3, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'sessions' ? (
          sessions.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 12, color: S.text3,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9h6M9 12h6M9 15h4" />
              </svg>
              <p style={{ fontSize: 13, margin: 0, color: S.text3 }}>
                {connectionStatus !== 'connected' ? 'Connect to agent to view sessions' : 'No active sessions'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={onCreateSession} style={{
                  height: 32, padding: '0 16px', borderRadius: 7,
                  border: 'none', background: S.primary, color: '#fff',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  New Terminal
                </button>
                {onNavigate && (
                  <button type="button" onClick={() => onNavigate('agents')} style={{
                    height: 32, padding: '0 14px', borderRadius: 7,
                    border: `1px solid ${S.border}`, background: S.surface2,
                    color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Open Agents
                  </button>
                )}
              </div>
            </div>
          ) : (
            sessions.map(s => (
              <SessionRow key={s.id} session={s} onOpen={() => onSessionSelect(s.id)} />
            ))
          )
        ) : ghLoading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10, color: S.text3,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${S.surface3}`, borderTopColor: S.primary,
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 12 }}>Syncing with GitHub{ghRepo ? ` — ${ghRepo}` : ''}…</span>
          </div>
        ) : ghError ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10, color: S.text3,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" stroke={S.error} fill="none" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.7 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: 12, margin: 0, color: S.error }}>{ghError}</p>
            <button type="button" onClick={() => void fetchGithub()} style={{
              height: 28, padding: '0 12px', borderRadius: 6,
              border: `1px solid ${S.border}`, background: S.surface2,
              color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}>Retry</button>
          </div>
        ) : displayIssues.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12, color: S.text3,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: 13, margin: 0, color: S.text3 }}>
              {ghRepo ? `No issues found in ${ghRepo}` : 'No issues found'}
            </p>
            <button
              type="button"
              onClick={() => { void fetchGithub(); showToast('Connecting…'); }}
              style={{
                height: 30, padding: '0 14px', borderRadius: 6,
                border: `1px solid ${S.primaryBorder}`, background: S.primaryAlpha,
                color: S.primary, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={S.primary}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Connect GitHub
            </button>
          </div>
        ) : (
          displayIssues.map((issue, idx) => (
            <IssueRow
              key={issue.number}
              issue={issue}
              hovered={hoveredRow === idx}
              onMouseEnter={() => setHoveredRow(idx)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => { onCreateSession(); showToast(`Starting task for #${issue.number}`); }}
            />
          ))
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Status footer */}
      {connectionStatus !== 'connected' && (
        <div style={{
          padding: '7px 16px', borderTop: `1px solid ${S.border}`,
          background: S.surface, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: S.text3,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.error, flexShrink: 0 }} />
          Not connected to agent
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: '7px 14px',
          fontSize: 12, color: S.text1, pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
