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

const AgentIcon = ({ agent }: { agent: string }) => {
  if (agent === 'claude') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97757" fillRule="nonzero" style={{ flexShrink: 0 }}>
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
    </svg>
  );
  if (agent === 'opencode') return (
    <svg width="14" height="14" viewBox="0 0 512 512" fill="none" style={{ flexShrink: 0, color: S.text2 }}>
      <path d="M320 224V352H192V224H320Z" fill="currentColor" fillOpacity="0.28" />
      <path fillRule="evenodd" clipRule="evenodd" d="M384 416H128V96H384V416ZM320 160H192V352H320V160Z" fill="currentColor" />
    </svg>
  );
  if (agent === 'aider') return (
    <svg width="14" height="14" viewBox="0 0 436 436" style={{ flexShrink: 0, color: S.text2 }}>
      <g transform="translate(0,436) scale(0.1,-0.1)" fill="currentColor" stroke="none">
        <path d="M0 2180 l0 -2180 2180 0 2180 0 0 2180 0 2180 -2180 0 -2180 0 0 -2180z m2705 1818 c20 -20 28 -121 30 -398 l2 -305 216 -5 c118 -3 218 -8 222 -12 3 -3 10 -46 15 -95 5 -48 16 -126 25 -172 17 -86 17 -81 -17 -233 -14 -67 -13 -365 2 -438 21 -100 22 -159 5 -247 -24 -122 -24 -363 1 -458 23 -88 23 -213 1 -330 -9 -49 -17 -109 -17 -132 l0 -43 203 0 c111 0 208 -4 216 -9 10 -6 18 -51 27 -148 8 -76 16 -152 20 -168 7 -39 -23 -361 -37 -387 -10 -18 -21 -19 -214 -16 -135 2 -208 7 -215 14 -22 22 -33 301 -21 501 6 102 8 189 5 194 -8 13 -417 12 -431 -2 -12 -12 -8 -146 8 -261 8 -55 8 -95 1 -140 -6 -35 -14 -99 -17 -143 -9 -123 -14 -141 -41 -154 -18 -8 -217 -11 -679 -11 l-653 0 -11 33 c-31 97 -43 336 -27 533 5 56 6 113 2 128 l-6 26 -194 0 c-211 0 -252 4 -261 28 -12 33 -17 392 -6 522 15 186 -2 174 260 180 115 3 213 8 217 12 4 4 1 52 -5 105 -7 54 -17 130 -22 168 -7 56 -5 91 11 171 10 55 22 130 26 166 4 36 10 72 15 79 7 12 128 15 665 19 l658 5 8 30 c5 18 4 72 -3 130 -12 115 -7 346 11 454 10 61 10 75 -1 82 -8 5 -300 9 -650 9 l-636 0 -27 25 c-18 16 -26 34 -26 57 0 18 -5 87 -10 153 -10 128 5 449 22 472 5 7 26 13 46 15 78 6 1281 3 1287 -4z" />
        <path d="M1360 1833 c0 -5 -1 -164 -3 -356 l-2 -347 625 -1 c704 -1 708 -1 722 7 5 4 7 20 4 38 -29 141 -32 491 -6 595 9 38 8 45 -7 57 -15 11 -139 13 -675 14 -362 0 -658 -3 -658 -7z" />
      </g>
    </svg>
  );
  // Fallback: letter icon matching Orca's AgentLetterIcon
  const letter = (agent[0] ?? '?').toUpperCase();
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, color: S.text3 }}>
      <rect width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.2" />
      <text x="7" y="10.5" textAnchor="middle" fontSize="8.5" fill="currentColor" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">{letter}</text>
    </svg>
  );
};

function SessionCard({ session, onSelect }: { session: AgentSession; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
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
  const [showSearchModal, setShowSearchModal] = useState(true);

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
                <SessionCard key={s.id} session={s} onSelect={() => setSelected(s)} />
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
