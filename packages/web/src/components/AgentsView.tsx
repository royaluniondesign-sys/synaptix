import { useEffect, useRef, useState } from 'react';
import { T as S } from '../lib/design';
import { AgentIcon } from '../lib/agent-icons';

interface AgentSession {
  id: string;
  title: string;
  preview: string;
  agent: string;
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
  { id: 's9', title: 'Auth middleware security review', preview: 'Agent: The JWT verification path has a subtle timing issue on token expiry boundary...', agent: 'copilot', msgs: 31, time: '5d ago', model: 'gpt-4o', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's10', title: 'Refactor API routes to REST', preview: 'Agent: Here is the proposed endpoint map — POST /api/sessions, GET /api/sessions/:id...', agent: 'codex', msgs: 17, time: '6d ago', model: 'codex-1', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's11', title: 'Kilo: build script optimisation', preview: 'Agent: Parallelising the type-check and build steps saves ~40 s on a 16-core machine...', agent: 'kilo', msgs: 9, time: '8d ago', model: 'kilo-3', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's12', title: 'Gemini code review pass', preview: 'Agent: Found 3 potential null-dereference paths in the worktree fanout logic...', agent: 'gemini', msgs: 22, time: '9d ago', model: 'gemini-2.5-pro', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's13', title: 'Migrate legacy auth to JWT', preview: 'Agent: Removed session cookie in favour of short-lived HS256 token signed with the env secret...', agent: 'aider', msgs: 58, time: '11d ago', model: 'claude-3-7', worktree: 'feat/jwt-auth', dir: 'Users/whitemelonis11' },
  { id: 's14', title: 'Hermes Telegram bot command refactor', preview: 'Agent: Extracted all slash-command handlers into a flat dispatch table — O(1) lookup...', agent: 'hermes', msgs: 34, time: '13d ago', model: 'gpt-5', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's15', title: 'Grok: database query optimiser', preview: 'Agent: Replaced full-table scan on sessions with a composite index on (status, updated_at)...', agent: 'grok', msgs: 11, time: '15d ago', model: 'grok-3', worktree: null, dir: 'Users/whitemelonis11' },
  { id: 's16', title: 'Goose: onboarding flow UX pass', preview: 'Agent: Consolidated the 4-step wizard to 2 screens. Pairing code entry now auto-advances on fill...', agent: 'goose', msgs: 19, time: '17d ago', model: 'goose-2.5', worktree: 'ux/onboarding-v2', dir: 'Users/whitemelonis11' },
];


function SessionCard({ session, onSelect, onContextMenu }: { session: AgentSession; onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onContextMenu={onContextMenu}
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

function SessionDetail({ session, onClose }: { session: AgentSession; onClose: () => void }) {
  return (
    <div style={{
      width: '40%', flexShrink: 0, borderLeft: `1px solid ${S.border}`,
      background: S.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '12px 14px 10px', borderBottom: `1px solid ${S.border}`, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.text1, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <AgentIcon agent={session.agent} />
            <span style={{ fontSize: 10, color: S.text3 }}>{session.model}</span>
            <span style={{ fontSize: 10, color: S.text3 }}>·</span>
            <span style={{ fontSize: 10, color: S.text3 }}>{session.time}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{
          background: 'none', border: 'none', color: S.text3, cursor: 'pointer',
          padding: 4, display: 'flex', flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Meta */}
      <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: S.text3 }}>Messages</span>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
            background: S.surface3, color: S.text2,
          }}>{session.msgs}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 4,
            border: `1px solid ${S.border}`, color: S.text3, background: S.surface3,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
            {session.dir}
          </span>
          {session.worktree ? (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 4,
              border: `1px solid ${S.border}`, color: S.text3, background: S.surface3,
            }}>{session.worktree}</span>
          ) : (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 4,
              border: `1px solid ${S.border}`, color: S.text3, background: S.surface3,
            }}>Unavailable worktree</span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: S.text3, lineHeight: 1.6 }}>{session.preview}</div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 14px',
        borderTop: `1px solid ${S.border}`, flexShrink: 0,
      }}>
        <button type="button" style={{
          flex: 1, height: 30, borderRadius: 6, border: `1px solid ${S.border}`,
          background: S.surface2, color: S.text2, fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          Open in Terminal
        </button>
        <button type="button" style={{
          height: 30, padding: '0 12px', borderRadius: 6, border: `1px solid ${S.border}`,
          background: S.surface2, color: S.text2, fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy path
        </button>
      </div>
    </div>
  );
}

interface CtxMenu { x: number; y: number; session: AgentSession }

function SessionContextMenu({ menu, onClose, onAction }: {
  menu: CtxMenu;
  onClose: () => void;
  onAction: (a: string, s: AgentSession) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const item = (label: string, icon: React.ReactNode, action: string, danger?: boolean) => (
    <button key={action} type="button"
      onClick={() => { onAction(action, menu.session); onClose(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        width: '100%', padding: '5px 10px', border: 'none', background: 'none',
        color: danger ? S.error : S.text2, fontSize: 11, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ color: S.text3, display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
  const sep = () => <div style={{ height: 1, margin: '3px 0', background: S.border }} />;

  const I = (d: string) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );

  return (
    <div ref={ref} style={{
      position: 'fixed', zIndex: 9999,
      left: menu.x, top: menu.y,
      background: S.surface2, border: `1px solid ${S.border}`,
      borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      padding: '4px 0', minWidth: 200, overflow: 'hidden',
    }}>
      <div style={{ padding: '3px 10px 5px', fontSize: 10, color: S.text3, fontWeight: 500 }}>Session</div>
      {item('Rename', I('M3 12h18M3 6h18M3 18h18'), 'rename')}
      {item('Open in terminal', I('M4 17l6-6-6-6M12 19h8'), 'open-terminal')}
      {item('Copy session path', I('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'), 'copy-path')}
      {item('Copy session name', I('M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'), 'copy-name')}
      {sep()}
      {item('Pin session', I('M12 2l3 9h-6z M12 11v11'), 'pin')}
      {item('Mark as unread', I('M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0'), 'mark-unread')}
      {sep()}
      {item('Delete session', I('M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2'), 'delete', true)}
    </div>
  );
}

function FilterDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    hideSleeping: false,
    hideDefault: false,
    hideAutomation: false,
    hideCli: false,
  });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const toggle = (key: keyof typeof filters) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  const filterRow = (label: string, key: keyof typeof filters, icon: string) => (
    <button key={key} type="button"
      onClick={() => toggle(key)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '5px 12px', border: 'none', background: 'none',
        color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{
        width: 14, height: 14, borderRadius: 3,
        border: `1.5px solid ${filters[key] ? S.primary : S.border}`,
        background: filters[key] ? S.primary : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 100ms',
      }}>
        {filters[key] && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </span>
    </button>
  );

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 999, right: 0, top: '100%', marginTop: 4,
      background: S.surface2, border: `1px solid ${S.border}`,
      borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      padding: '4px 0', minWidth: 220,
    }}>
      <div style={{ padding: '4px 12px 6px', fontSize: 10, color: S.text3, fontWeight: 500 }}>Filter sessions</div>
      {filterRow('Hide sleeping sessions', 'hideSleeping', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z')}
      {filterRow('Hide default branch sessions', 'hideDefault', 'M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16')}
      {filterRow('Hide automation sessions', 'hideAutomation', 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z')}
      {filterRow('Hide CLI-created sessions', 'hideCli', 'M4 17l6-6-6-6M12 19h8')}
      {activeCount > 0 && (
        <>
          <div style={{ height: 1, margin: '3px 0', background: S.border }} />
          <button type="button"
            onClick={() => setFilters({ hideSleeping: false, hideDefault: false, hideAutomation: false, hideCli: false })}
            style={{
              display: 'flex', width: '100%', padding: '5px 12px', border: 'none',
              background: 'none', color: S.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Reset filters</button>
        </>
      )}
    </div>
  );
}

function SearchFeatureModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, borderRadius: 16, border: `1px solid ${S.border}`,
          background: S.surface, boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Left: text */}
          <div style={{ flex: 1, padding: '22px 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                background: S.primary, color: '#fff', letterSpacing: '0.05em',
              }}>NEW</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: S.text1, lineHeight: 1.25, marginBottom: 10 }}>
              Search every agent session
            </div>
            <div style={{ fontSize: 12, color: S.text2, lineHeight: 1.6, marginBottom: 14 }}>
              Find any past conversation by what was said in it, then pick up where the agent left off. Your agents can search it too.
            </div>
            <div style={{ fontSize: 11, color: S.primary, marginBottom: 16 }}>
              Settings → Agent Session Search
            </div>
            <button type="button" style={{
              width: '100%', height: 40, borderRadius: 8,
              border: `1px solid ${S.border}`, background: S.surface2,
              color: S.text2, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Turn on session search
            </button>
          </div>

          {/* Right: preview card */}
          <div style={{
            width: 200, flexShrink: 0, background: S.surface2,
            borderLeft: `1px solid ${S.border}`,
            padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {/* Mini toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
              {[
                <path key="copy" d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"/>,
                <polyline key="grid" points="3 3 21 3 21 21 3 21"/>,
                <polyline key="expand" points="15 3 21 3 21 9"/>,
                <circle key="settings" cx="12" cy="12" r="3"/>,
              ].map((path, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
                  {path}
                </svg>
              ))}
            </div>

            {/* Heading */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: S.text1 }}>Agent Session History</div>
              <div style={{ fontSize: 9, color: S.text3 }}>Indexed history</div>
            </div>

            {/* Local Mac pill */}
            <span style={{
              alignSelf: 'flex-start', fontSize: 9, padding: '2px 7px', borderRadius: 10,
              border: `1px solid ${S.border}`, background: S.surface3, color: S.text3,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
              Local Mac
            </span>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 3, background: S.surface, borderRadius: 5, padding: 2 }}>
              {['Workspace', 'Project', 'All'].map((t, i) => (
                <div key={t} style={{
                  flex: 1, height: 18, borderRadius: 3, fontSize: 8, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i === 2 ? S.surface3 : 'transparent',
                  color: i === 2 ? S.text2 : S.text3, cursor: 'default',
                }}>{t}</div>
              ))}
            </div>

            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: S.surface, border: `1px solid ${S.border}`,
              borderRadius: 5, padding: '3px 7px', height: 22,
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span style={{ fontSize: 9, color: S.text3 }}>login timeout</span>
            </div>

            {/* Result rows */}
            {[
              { title: 'Fix flaky auth redirect', preview: ['login timeout'], agent: 'Claude', msgs: 64, time: '3d' },
              { title: 'Session refresh after sleep', preview: ['login', 'timeout'], agent: 'Codex', msgs: 27, time: '1w' },
            ].map((r, i) => (
              <div key={i} style={{
                padding: '5px 6px', background: S.surface, borderRadius: 5,
                border: `1px solid ${S.border}`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: S.text2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 8, color: S.text3, marginBottom: 3 }}>
                  {r.preview.map((word, wi) => (
                    <span key={wi}>
                      {wi > 0 && ' '}
                      <span style={{ background: `${S.primary}33`, color: S.primary, borderRadius: 2, padding: '0 1px' }}>{word}</span>
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 8, color: S.text3 }}>{r.agent} · {r.msgs} msgs · {r.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Close button */}
        <button type="button" onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', color: S.text3, cursor: 'pointer', padding: 4, display: 'flex',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

interface Group { label: string; count: number; sessions: AgentSession[] }

export function AgentsView() {
  const [tab, setTab] = useState<'workspace' | 'project' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<AgentSession | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const handleContextMenu = (e: React.MouseEvent, session: AgentSession) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, session });
  };

  const handleCtxAction = (action: string, _session: AgentSession) => {
    if (action === 'open-terminal') setSelected(_session);
  };

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
    if (next.has(label)) { next.delete(label); } else { next.add(label); }
    return next;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg, position: 'relative' }}>
      {showSearchModal && <SearchFeatureModal onClose={() => setShowSearchModal(false)} />}
      {ctxMenu && <SessionContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} onAction={handleCtxAction} />}
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
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setShowFilter(v => !v)} style={{
              background: showFilter ? S.surface3 : 'none', border: 'none',
              color: showFilter ? S.text1 : S.text3, cursor: 'pointer', display: 'flex',
              borderRadius: 4, padding: 3,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            {showFilter && <FilterDropdown onClose={() => setShowFilter(false)} />}
          </div>
          <button type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex', borderRadius: 4, padding: 3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button type="button" style={{
            height: 26, padding: '0 10px', borderRadius: 6,
            border: 'none', background: S.primary,
            color: '#fff', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New session
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

      {/* Session list + detail panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: selected ? '0 0 60%' : '1 1 100%', overflowY: 'auto', transition: 'flex 150ms' }}>
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
              {!collapsed.has(group.label) && group.sessions.map(s => (
                <SessionCard key={s.id} session={s} onSelect={() => setSelected(s)} onContextMenu={e => handleContextMenu(e, s)} />
              ))}
            </div>
          ))}

          {/* Show more */}
          <div style={{ padding: '12px 14px', textAlign: 'center' }}>
            <button type="button" style={{ background: 'none', border: 'none', color: S.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Show more sessions
            </button>
          </div>
        </div>
        {selected && <SessionDetail session={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
