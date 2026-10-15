import { useState, useEffect, useRef } from 'react';
import type { Session } from '../lib/types';
import type { View } from '../lib/types';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#34d399',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface QuickOpenProps {
  sessions: Session[];
  onClose: () => void;
  onSessionSelect: (id: string) => void;
  onNavigate: (view: View) => void;
  onRunCommand: (cmd: string) => void;
}

interface QuickItem {
  id: string;
  type: 'session' | 'nav' | 'cmd';
  label: string;
  sublabel?: string;
  icon: string;
  action: () => void;
}

export function QuickOpen({ sessions, onClose, onSessionSelect, onNavigate, onRunCommand }: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navItems: QuickItem[] = [
    { id: 'nav-dashboard', type: 'nav', label: 'Dashboard', sublabel: 'Stats, sessions overview', icon: '📊', action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'nav-terminal', type: 'nav', label: 'Terminals', sublabel: 'Terminal sessions', icon: '⌨️', action: () => { onNavigate('terminal'); onClose(); } },
    { id: 'nav-tunnels', type: 'nav', label: 'Tunnels', sublabel: 'Expose ports to internet', icon: '🌐', action: () => { onNavigate('tunnels'); onClose(); } },
    { id: 'nav-agents', type: 'nav', label: 'Agents', sublabel: 'Claude Code, OpenCode, Aider', icon: '🤖', action: () => { onNavigate('agents' as View); onClose(); } },
    { id: 'nav-ports', type: 'nav', label: 'Ports', sublabel: 'Scan open ports', icon: '🔌', action: () => { onNavigate('ports' as View); onClose(); } },
    { id: 'nav-settings', type: 'nav', label: 'Settings', sublabel: 'Keyboard, theme, connection', icon: '⚙️', action: () => { onNavigate('settings'); onClose(); } },
  ];

  const quickCmds: QuickItem[] = [
    { id: 'cmd-claude', type: 'cmd', label: 'Run: claude', sublabel: 'Start Claude Code agent', icon: '🤖', action: () => { onRunCommand('claude'); onClose(); } },
    { id: 'cmd-status', type: 'cmd', label: 'Run: git status', sublabel: 'Check repository state', icon: '📋', action: () => { onRunCommand('git status'); onClose(); } },
    { id: 'cmd-htop', type: 'cmd', label: 'Run: htop', sublabel: 'System monitor', icon: '📈', action: () => { onRunCommand('htop'); onClose(); } },
    { id: 'cmd-ls', type: 'cmd', label: 'Run: ls -la', sublabel: 'List files', icon: '📁', action: () => { onRunCommand('ls -la'); onClose(); } },
    { id: 'cmd-npm-dev', type: 'cmd', label: 'Run: npm run dev', sublabel: 'Start dev server', icon: '⚡', action: () => { onRunCommand('npm run dev'); onClose(); } },
  ];

  const sessionItems: QuickItem[] = sessions.map(s => ({
    id: `session-${s.id}`,
    type: 'session' as const,
    label: s.name,
    sublabel: s.cwd,
    icon: s.status === 'run' ? '🟢' : '⚫',
    action: () => { onSessionSelect(s.id); onClose(); },
  }));

  const all = [...sessionItems, ...navItems, ...quickCmds];

  const filtered = query.trim()
    ? all.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : all;

  const safeIndex = Math.min(activeIndex, filtered.length - 1);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    const active = listRef.current?.children[safeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && filtered[safeIndex]) { filtered[safeIndex].action(); return; }
  };

  const typeColor = (type: QuickItem['type']) => {
    if (type === 'session') return S.success;
    if (type === 'cmd') return S.primary;
    return S.text2;
  };

  const typeLabel = (type: QuickItem['type']) => {
    if (type === 'session') return 'SESSION';
    if (type === 'cmd') return 'CMD';
    return 'GO TO';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: '#00000088',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed', top: '12%', left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 520px)',
        background: S.surface, border: `1px solid ${S.border}`,
        borderRadius: 14, overflow: 'hidden',
        zIndex: 201,
        boxShadow: '0 20px 60px #000000bb, 0 0 0 1px #ffffff08',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px', borderBottom: `1px solid ${S.border}`,
          height: 46,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search sessions, navigate, run commands…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: S.text1, fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, color: S.text3, background: S.surface2,
            border: `1px solid ${S.border}`, borderRadius: 4, padding: '2px 6px',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 340, overflow: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: S.text3, fontSize: 12 }}>
              No matches for "{query}"
            </div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.id}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', cursor: 'pointer',
                background: i === safeIndex ? `${S.primary}12` : 'transparent',
                borderBottom: `1px solid ${S.border}`,
                transition: 'background 80ms',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </div>
                {item.sublabel && (
                  <div style={{ fontSize: 10, color: S.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {item.sublabel}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: typeColor(item.type), flexShrink: 0,
                letterSpacing: 0.5,
              }}>
                {typeLabel(item.type)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', gap: 14, padding: '8px 14px',
          borderTop: `1px solid ${S.border}`, background: S.bg,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
            <span key={key} style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{
                background: S.surface2, border: `1px solid ${S.border}`,
                borderRadius: 3, padding: '1px 5px', fontSize: 9, color: S.text2,
              }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
