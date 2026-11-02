import { useState, useEffect, useRef } from 'react';
import type { Session } from '../lib/types';
import type { View } from '../lib/types';
import { T as S } from '../lib/design';

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
  icon: React.ReactNode;
  action: () => void;
}

const Ic = {
  dashboard: <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  terminal:  <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  tunnels:   <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  agents:    <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/></svg>,
  ports:     <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  settings:  <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  tasks:     <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  chat:      <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  run:       <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  session:   <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="7 10 12 15 17 10"/></svg>,
};

export function QuickOpen({ sessions, onClose, onSessionSelect, onNavigate, onRunCommand }: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const navItems: QuickItem[] = [
    { id: 'nav-dashboard',  type: 'nav', label: 'Cockpit',          sublabel: 'Stats, sessions overview',       icon: Ic.dashboard, action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'nav-terminal',   type: 'nav', label: 'Terminals',        sublabel: 'Terminal sessions',               icon: Ic.terminal,  action: () => { onNavigate('terminal'); onClose(); } },
    { id: 'nav-agents',     type: 'nav', label: 'Agent Dashboard',  sublabel: 'Claude Code, OpenCode, Aider',   icon: Ic.agents,    action: () => { onNavigate('agents' as View); onClose(); } },
    { id: 'nav-tasks',      type: 'nav', label: 'Tasks',            sublabel: 'GitHub issues and PRs',          icon: Ic.tasks,     action: () => { onNavigate('tasks' as View); onClose(); } },
    { id: 'nav-tunnels',    type: 'nav', label: 'Tunnels',          sublabel: 'Expose ports to internet',       icon: Ic.tunnels,   action: () => { onNavigate('tunnels'); onClose(); } },
    { id: 'nav-ports',      type: 'nav', label: 'Ports',            sublabel: 'Scan open ports',                icon: Ic.ports,     action: () => { onNavigate('ports' as View); onClose(); } },
    { id: 'nav-chat',       type: 'nav', label: 'Chat',             sublabel: 'AI chat with local models',      icon: Ic.chat,      action: () => { onNavigate('chat' as View); onClose(); } },
    { id: 'nav-settings',   type: 'nav', label: 'Settings',         sublabel: 'Keyboard, theme, connection',    icon: Ic.settings,  action: () => { onNavigate('settings'); onClose(); } },
  ];

  const quickCmds: QuickItem[] = [
    { id: 'cmd-claude',   type: 'cmd', label: 'claude',                sublabel: 'Start Claude Code agent',  icon: Ic.run, action: () => { onRunCommand('claude'); onClose(); } },
    { id: 'cmd-status',   type: 'cmd', label: 'git status',            sublabel: 'Check repository state',   icon: Ic.run, action: () => { onRunCommand('git status'); onClose(); } },
    { id: 'cmd-htop',     type: 'cmd', label: 'htop',                  sublabel: 'System monitor',           icon: Ic.run, action: () => { onRunCommand('htop'); onClose(); } },
    { id: 'cmd-ls',       type: 'cmd', label: 'ls -la',                sublabel: 'List files',               icon: Ic.run, action: () => { onRunCommand('ls -la'); onClose(); } },
    { id: 'cmd-npm-dev',  type: 'cmd', label: 'npm run dev',           sublabel: 'Start dev server',         icon: Ic.run, action: () => { onRunCommand('npm run dev'); onClose(); } },
  ];

  const sessionItems: QuickItem[] = sessions.map(s => ({
    id: `session-${s.id}`,
    type: 'session' as const,
    label: s.name,
    sublabel: s.cwd,
    icon: Ic.session,
    action: () => { onSessionSelect(s.id); onClose(); },
  }));

  const all = [...sessionItems, ...navItems, ...quickCmds];

  const filtered = query.trim()
    ? all.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : all;

  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

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

  const typeTag = (type: QuickItem['type']) => {
    if (type === 'session') return { label: 'session', color: S.success };
    if (type === 'cmd') return { label: 'run', color: S.text3 };
    return { label: 'view', color: S.text3 };
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: '14%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(92vw, 520px)',
        background: S.surface, border: `1px solid ${S.border}`,
        borderRadius: 12, overflow: 'hidden',
        zIndex: 201,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px', borderBottom: `1px solid ${S.border}`, height: 44,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
            fontSize: 9, color: S.text3, background: S.surface2,
            border: `1px solid ${S.border}`, borderRadius: 4, padding: '2px 6px',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 340, overflow: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: S.text3, fontSize: 12 }}>
              No matches for "{query}"
            </div>
          )}
          {filtered.map((item, i) => {
            const tag = typeTag(item.type);
            return (
              <div
                key={item.id}
                onClick={item.action}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', cursor: 'pointer',
                  background: i === safeIndex ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderBottom: `1px solid ${S.border2}`,
                  transition: 'background 60ms',
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span style={{ color: S.text3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: i === safeIndex ? S.text1 : S.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.type === 'cmd' ? <code style={{ fontFamily: S.fontMono, fontSize: 11 }}>{item.label}</code> : item.label}
                  </div>
                  {item.sublabel && (
                    <div style={{ fontSize: 10, color: S.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                      {item.sublabel}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: tag.color, flexShrink: 0, letterSpacing: 0.3, opacity: 0.8 }}>
                  {tag.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 14, padding: '7px 14px',
          borderTop: `1px solid ${S.border}`, background: S.bg,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
            <span key={key} style={{ fontSize: 10, color: S.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 3, padding: '1px 5px', fontSize: 9, color: S.text2 }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
