import { useState } from 'react';
import { T as S } from '../lib/design';

interface AgentSession {
  id: string;
  title: string;
  preview: string;
  agent: 'claude' | 'opencode' | 'aider';
  msgs: number;
  time: string;
  model: string;
  worktree: string | null;
  dir: string;
}

const SESSIONS: AgentSession[] = [
  { id: 's1', title: 'Termora project versioning and...', preview: 'You: dist-demo/assets/geist-latin-400-normal-B40WzpMT.woff2 12.96 kB dist-demo/assets/geist-...', agent: 'claude', msgs: 3106, time: 'Just now', model: 'claude-sonnet', worktree: null, dir: 'whitemelonis11/Documents' },
  { id: 's2', title: 'Hermes desktop update handoff', preview: 'Agent: Hermes quedó actualizado y funcionando (dice "5 commits behind" solo porque hay commits nuevos...', agent: 'claude', msgs: 159, time: '22d ago', model: 'claude-sonnet-5', worktree: null, dir: 'whitemelonis11/Documents' },
  { id: 's3', title: 'Mejor modelo local para OpenClaw', preview: 'Agent: **Tu equipo:** MacBook Pro 2016 (i5 dual-core 3.1 GHz, 16 GB RAM, Iris 550, macOS 12.7.6) — sin Apple...', agent: 'opencode', msgs: 4, time: '3d ago', model: 'big-pickle', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's4', title: 'Análisis del repositorio OpenCreator', preview: 'Agent: # Análisis de OpenCreator (ex-KrillinAI) **URL:** https://github.com/krillinai/OpenCreator]...', agent: 'opencode', msgs: 5, time: '3d ago', model: 'big-pickle', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's5', title: 'Reparar Hermes que no responde', preview: 'Agent: Listo. Fallback válido configurado y verificado en vivo. **Estado final** - Primario: `gpt-5`...', agent: 'opencode', msgs: 82, time: '7d ago', model: 'big-pickle', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's6', title: 'New session - 2026-10-...', preview: 'Agent: BIG_PICKLE_READY_NEXT_PHASE', agent: 'opencode', msgs: 2, time: '10d ago', model: 'big-pickle', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's7', title: 'QuickOpen UI fix sprint', preview: 'You: Replace emoji icons in QuickOpen.tsx with SVG icons matching sidebar style...', agent: 'claude', msgs: 48, time: '1d ago', model: 'claude-sonnet-5', worktree: 'claude/ui-fixes', dir: 'Users/whitemelonis11' },
  { id: 's8', title: 'Sidebar redesign PR #69', preview: 'Agent: All 8 CI checks passed. PR merged to main.', agent: 'claude', msgs: 220, time: '2d ago', model: 'claude-sonnet-5', worktree: null, dir: 'Users/whitemelonis11' },
];

const AgentIcon = ({ agent }: { agent: AgentSession['agent'] }) => {
  if (agent === 'claude') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={S.warning} stroke="none"><circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  );
};

function SessionCard({ session }: { session: AgentSession }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 14px', cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderBottom: `1px solid ${S.border2}`,
        transition: 'background 60ms',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.title}
        </span>
        <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity 60ms' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity 60ms' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>

      {/* Preview */}
      <div style={{
        fontSize: 11, color: S.text3, lineHeight: 1.5, marginBottom: 7,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {session.preview}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <AgentIcon agent={session.agent} />
        <span style={{ fontSize: 10, color: S.text3 }}>{session.msgs} msgs</span>
        <span style={{ fontSize: 10, color: S.text3 }}>·</span>
        <span style={{ fontSize: 10, color: S.text3 }}>{session.time}</span>
        <span style={{ fontSize: 10, color: S.text3 }}>·</span>
        <span style={{ fontSize: 10, color: S.text3 }}>{session.model}</span>
        <div style={{ flex: 1 }} />
        {!session.worktree && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 4,
            border: `1px solid ${S.border}`, color: S.text3,
            background: S.surface3,
          }}>Unavailable worktree</span>
        )}
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 4,
          border: `1px solid ${S.border}`, color: S.text3,
          background: S.surface3, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
          {session.dir}
        </span>
      </div>
    </div>
  );
}

interface Group { label: string; count: number; sessions: AgentSession[] }

export function AgentsView() {
  const [tab, setTab] = useState<'workspace' | 'project' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = SESSIONS.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.preview.toLowerCase().includes(search.toLowerCase())
  );

  const groups: Group[] = Object.entries(
    filtered.reduce<Record<string, AgentSession[]>>((acc, s) => {
      (acc[s.dir] ??= []).push(s);
      return acc;
    }, {})
  ).map(([label, sessions]) => ({ label, count: sessions.length, sessions }));

  const toggle = (label: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>Agent Session History</div>
            <div style={{ fontSize: 10, color: S.text3 }}>Indexed history</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 10, fontWeight: 500, color: S.text2,
            padding: '2px 8px', borderRadius: 6,
            border: `1px solid ${S.border}`, background: S.surface2,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
            Local Mac
          </span>
          <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
          <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: S.surface2, borderRadius: 7, padding: 2 }}>
          {(['workspace', 'project', 'all'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              flex: 1, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer',
              background: tab === t ? S.surface3 : 'transparent',
              color: tab === t ? S.text1 : S.text3,
              fontSize: 11, fontWeight: tab === t ? 600 : 400, fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, margin: '8px 10px',
        background: S.surface2, border: `1px solid ${S.border}`,
        borderRadius: 7, padding: '0 10px', height: 30, flexShrink: 0,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search sessions"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', color: S.text1, fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      {/* Count row */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 14px 8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: S.text3 }}>{filtered.length} sessions</span>
        <div style={{ flex: 1 }} />
        <button type="button" style={{ background: 'none', border: 'none', color: S.text3, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
          Last updated
          <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(group => (
          <div key={group.label}>
            {/* Group header */}
            <div
              onClick={() => toggle(group.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', cursor: 'pointer',
                background: S.surface,
                borderBottom: `1px solid ${S.border}`,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round"
                style={{ transform: collapsed.has(group.label) ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, color: S.text2 }}>{group.label}</span>
              <span style={{
                fontSize: 9, fontWeight: 600, minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: S.surface3, borderRadius: 4, color: S.text3, padding: '0 4px',
              }}>{group.count}</span>
            </div>

            {/* Sessions */}
            {!collapsed.has(group.label) && group.sessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        ))}

        {/* Show more */}
        <div style={{ padding: '12px 14px', textAlign: 'center' }}>
          <button type="button" style={{ background: 'none', border: 'none', color: S.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            Show more sessions
          </button>
        </div>
      </div>
    </div>
  );
}
