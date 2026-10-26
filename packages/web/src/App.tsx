import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DashboardView } from './components/DashboardView';
import { TerminalView } from './components/TerminalView';
import { TunnelsView } from './components/TunnelsView';
import { SettingsView } from './components/SettingsView';
import { NotificationsView } from './components/NotificationsView';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { StatusBar } from './components/StatusBar';
import { PortsView } from './components/PortsView';
import { AgentsView } from './components/AgentsView';
import { QuickOpen } from './components/QuickOpen';
import { ChatView } from './components/ChatView';
import { UpdateNotification } from './components/UpdateNotification';
import { TasksView } from './components/TasksView';
import { AutomationsView } from './components/AutomationsView';
import { MobileView } from './components/MobileView';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { useSkin } from './hooks/useSkin';
import { useLatency } from './hooks/useLatency';
import { useNotifications } from './hooks/useNotifications';
import { useOnboarding } from './hooks/useOnboarding';
import { usePorts } from './hooks/usePorts';
import { resolveAppSurface } from './lib/app-model';
import { T as S } from './lib/design';
import type { View } from './lib/types';
import type { ConnectionStatus, TerminalWSClient } from './lib/ws-client';

const TAB_CONFIG = [
  {
    id: 'dashboard' as const,
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: 'terminal' as const,
    label: 'Terminals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: 'tunnels' as const,
    label: 'Tunnels',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: 'notifications' as const,
    label: 'Notifications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: 'chat' as const,
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'agents' as const,
    label: 'Agents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="8" width="14" height="10" rx="3" />
        <path d="M12 4v4" />
        <circle cx="9" cy="13" r="1" />
        <circle cx="15" cy="13" r="1" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
  {
    id: 'settings' as const,
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function BottomTabBar({ current, onChange, sessionBadge, unreadBadge }: {
  current: View;
  onChange: (v: View) => void;
  sessionBadge: string | null;
  unreadBadge: string | null;
}) {
  return (
    <div style={{
      display: 'flex',
      borderTop: `1px solid ${S.border}`,
      background: S.surface,
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
    }}>
      {TAB_CONFIG.map((tab) => {
        const active = current === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 54,
              padding: '7px 4px',
              border: 'none',
              background: 'transparent',
              color: active ? S.primary : S.text3,
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'color 120ms ease-out',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: 0.1 }}>
              {tab.label}
            </span>
            {tab.id === 'terminal' && sessionBadge !== null && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: '50%',
                transform: 'translateX(10px)',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: S.primary,
                color: S.bg,
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {sessionBadge}
              </span>
            )}
            {tab.id === 'notifications' && unreadBadge !== null && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: '50%',
                transform: 'translateX(10px)',
                minWidth: 14,
                height: 14,
                padding: '0 3px',
                boxSizing: 'border-box',
                borderRadius: 8,
                background: S.error,
                color: '#fff',
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FABButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute',
        bottom: 70,
        right: 16,
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: S.primary,
        border: 'none',
        color: S.bg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        zIndex: 20,
        boxShadow: `0 3px 12px ${S.primary}55`,
        transition: 'transform 120ms ease-out',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.90)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}


function NavItem({ label, icon, active, badge, badgeColor, onClick }: {
  label: string;
  icon: React.ReactNode;
  active: boolean; badge?: string | null; badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', height: 32, display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 10px 0 12px', border: 'none',
        borderRadius: 0,
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: active ? S.text1 : S.text2,
        fontSize: 13,
        fontFamily: 'inherit', cursor: 'pointer',
        transition: 'background 80ms',
        textAlign: 'left', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <span style={{ color: S.text3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 9, fontWeight: 600, minWidth: 14, textAlign: 'center',
          background: S.surface3,
          color: badgeColor ?? S.text2,
          padding: '1px 5px', borderRadius: 10,
        }}>{badge}</span>
      )}
    </button>
  );
}

interface Project { id: string; name: string; branches: { name: string; badge: string }[] }
const PROJECTS: Project[] = [
  { id: 'documents', name: 'Documents', branches: [] },
  { id: 'rud-web',   name: 'RUD-WEB',   branches: [{ name: 'claude/eloquent-maxwe...', badge: 'primary' }] },
  { id: 'termora',   name: 'Termora',   branches: [{ name: 'main', badge: 'primary' }] },
  { id: 'antigravity', name: 'antigravity', branches: [{ name: 'excited-bohr', badge: '' }, { name: 'excited-tesla', badge: '' }, { name: 'intelligent-galileo', badge: '' }, { name: 'serene-raman', badge: '' }] },
];

function CreateWorktreeModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'smart'|'github'|'branch'|'name'>('smart');
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('Termora');

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(94vw,480px)', background: S.surface,
        border: `1px solid ${S.border}`, borderRadius: 12,
        zIndex: 301, boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px 14px', borderBottom: `1px solid ${S.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: S.text1, flex: 1 }}>Create worktree</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Project */}
          <div>
            <div style={{ fontSize: 11, color: S.text3, marginBottom: 6 }}>Project</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 7, padding: '0 10px', height: 36,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
              <span style={{ flex: 1, fontSize: 12, color: S.text1 }}>{project}</span>
              <span style={{ fontSize: 10, color: S.text3, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 4, padding: '1px 6px' }}>Project</span>
              <svg width="10" height="10" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Run on */}
          <div>
            <div style={{ fontSize: 11, color: S.text3, marginBottom: 6 }}>Run on</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: S.surface2, border: `1px solid ${S.border}`,
              borderRadius: 7, padding: '0 10px', height: 36,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
              <span style={{ fontSize: 12, color: S.text1, fontWeight: 500 }}>Local Mac</span>
              <span style={{ fontSize: 10, color: S.text3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/Users/whitemelonis11/Documents/Termora</span>
              <svg width="10" height="10" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Create From */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 11, color: S.text3 }}>Create From <span style={{ opacity: 0.5 }}>[Optional]</span></span>
              <div style={{ flex: 1 }} />
              <span style={{
                fontSize: 10, color: S.text3, background: S.surface2,
                border: `1px solid ${S.border}`, borderRadius: 4, padding: '1px 7px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                master
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, marginBottom: 10 }}>
              {(['smart','github','branch','name'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTab(t)} style={{
                  padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'inherit',
                  color: tab === t ? S.text1 : S.text3,
                  borderBottom: tab === t ? `2px solid ${S.primary}` : '2px solid transparent',
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {t === 'smart' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
                  {t === 'github' && <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>}
                  {t === 'branch' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>}
                  {t === 'name' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: S.bg, border: `1px solid ${S.border}`,
              borderRadius: 7, padding: '0 10px', height: 34,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type a name, #1234, branch, GitHub, GitLab, or Jira URL"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: S.text1, fontSize: 12, fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ padding: '16px 0 4px', textAlign: 'center', color: S.text3, fontSize: 11 }}>
              {query ? `No results for "${query}"` : 'Start typing to create a name or find a source.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 18px', borderTop: `1px solid ${S.border}`,
          gap: 12,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{
              width: 32, height: 18, borderRadius: 9, background: S.surface3,
              border: `1px solid ${S.border}`, position: 'relative',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: S.text3, position: 'absolute', top: 2, left: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: S.text3 }}>Create more</span>
          </label>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={{
            height: 32, padding: '0 16px', borderRadius: 7,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button type="button" onClick={() => { setProject(project); onClose(); }} style={{
            height: 32, padding: '0 14px', borderRadius: 7, border: 'none',
            background: S.text1, color: S.bg,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            Create worktree
            <kbd style={{ fontSize: 9, opacity: 0.5, fontFamily: 'inherit' }}>⌘↵</kbd>
          </button>
        </div>
      </div>
    </>
  );
}

function DesktopSidebar({ current, onChange, onNewSession, onQuickOpen, sessionBadge, unreadBadge, connectionStatus }: {
  current: View;
  onChange: (v: View) => void;
  onNewSession: () => void;
  onQuickOpen: () => void;
  sessionBadge: string | null;
  unreadBadge: string | null;
  connectionStatus: ConnectionStatus;
}) {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [showWorktree, setShowWorktree] = useState(false);
  const toggleProject = (id: string) => setCollapsedProjects(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusLabel = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting' : 'Offline';

  const I = {
    cockpit:  <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
    terminal: <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    agents:   <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/></svg>,
    tasks:    <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    tunnels:  <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    ports:    <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
    chat:     <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    bell:     <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    settings: <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    mobile:      <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
    automations: <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    plus:        <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  };

  const iconSearch = <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

  return (
    <div style={{
      width: 216,
      background: S.surface,
      borderRight: `1px solid ${S.border}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 12px 10px',
        borderBottom: `1px solid ${S.border2}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: S.surface3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>Synaptix</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor, flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: S.text3 }}>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Nav — flat list, no section dividers */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4 }}>


        {/* Search shortcut */}
        <button
          type="button"
          onClick={onQuickOpen}
          style={{
            width: '100%', height: 32, display: 'flex', alignItems: 'center',
            gap: 8, padding: '0 10px 0 12px', border: 'none',
            borderRadius: 0, background: 'transparent',
            color: S.text3, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            textAlign: 'left', transition: 'background 80ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <span style={{ color: S.text3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{iconSearch}</span>
          <span style={{ flex: 1 }}>Search</span>
          <span style={{ fontSize: 10, color: S.text3, opacity: 0.6, letterSpacing: 0 }}>⌘K</span>
        </button>

        <NavItem label="Cockpit" icon={I.cockpit} active={current === 'dashboard'} onClick={() => onChange('dashboard')} />
        <NavItem label="Terminals" icon={I.terminal} active={current === 'terminal'}
          badge={sessionBadge}
          onClick={() => onChange('terminal')} />
        <NavItem label="Agent Dashboard" icon={I.agents} active={current === 'agents'} onClick={() => onChange('agents')} />
        <NavItem label="Tasks" icon={I.tasks} active={current === 'tasks'} onClick={() => onChange('tasks')} />
        <NavItem label="Automations" icon={I.automations} active={current === 'automations'} onClick={() => onChange('automations')} />
        <NavItem label="Tunnels" icon={I.tunnels} active={current === 'tunnels'} onClick={() => onChange('tunnels')} />
        <NavItem label="Ports" icon={I.ports} active={current === 'ports'} onClick={() => onChange('ports')} />
        <NavItem label="Chat" icon={I.chat} active={current === 'chat'} onClick={() => onChange('chat')} />
        <NavItem label="Notifications" icon={I.bell} active={current === 'notifications'}
          badge={unreadBadge}
          onClick={() => onChange('notifications')} />
        <NavItem label="Synaptix Mobile" icon={I.mobile} active={current === 'mobile'} onClick={() => onChange('mobile')} />

        {/* Projects section */}
        <div style={{ marginTop: 8, borderTop: `1px solid ${S.border}` }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 4px 12px', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: S.text3, flex: 1, letterSpacing: 0.2 }}>Projects</span>
            {[
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
            ].map((icon, i) => (
              <button key={i} type="button" style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = S.text2; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = S.text3; }}
              >{icon}</button>
            ))}
            <button type="button" onClick={() => setShowWorktree(true)} style={{ background: 'none', border: 'none', color: S.text3, cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = S.text2; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = S.text3; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          {/* Project items */}
          {PROJECTS.map(proj => (
            <div key={proj.id}>
              <div
                onClick={() => toggleProject(proj.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '4px 10px 4px 12px', cursor: 'pointer',
                  height: 28,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: collapsedProjects.has(proj.id) ? 'rotate(-90deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: 12, color: S.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
              </div>
              {!collapsedProjects.has(proj.id) && proj.branches.map(branch => (
                <div key={branch.name} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '3px 10px 3px 30px', height: 26, cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={S.text3} strokeWidth="1.75" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                  </svg>
                  <span style={{ fontSize: 11, color: S.text3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch.name}</span>
                  {branch.badge && (
                    <span style={{ fontSize: 9, color: S.text3, background: S.surface3, border: `1px solid ${S.border}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{branch.badge}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {showWorktree && <CreateWorktreeModal onClose={() => setShowWorktree(false)} />}

      {/* Bottom icon row — icon row: ⚙ · ℹ · ↺ · ⊞  |  user avatar */}
      <div style={{
        borderTop: `1px solid ${S.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 6px',
        height: 36, flexShrink: 0,
        gap: 2,
      }}>
        {([
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
            title: 'Settings',
            active: current === 'settings',
            action: () => onChange('settings'),
          },
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
            title: 'Help & keyboard shortcuts',
            active: false,
            action: onQuickOpen,
          },
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
            title: 'Refresh connection',
            active: false,
            action: () => onChange('reconnect' as View),
          },
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
            title: 'New Terminal ⌘T',
            active: false,
            action: onNewSession,
          },
        ] as const).map((btn, i) => (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            title={btn.title}
            style={{
              width: 30, height: 30, border: 'none', borderRadius: 5, flexShrink: 0,
              background: btn.active ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: btn.active ? S.text1 : S.text3,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { if (!btn.active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = S.text2; }}
            onMouseLeave={e => { if (!btn.active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = btn.active ? S.text1 : S.text3; }}
          >
            {btn.icon}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* User avatar */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: S.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer',
          fontSize: 10, fontWeight: 700, color: '#fff',
        }}
          title="Account"
          onClick={() => onChange('settings')}
        >
          C
        </div>
      </div>
    </div>
  );
}

function TerminalEmpty({ onNewSession, onRunCommand, sessionCount }: {
  onNewSession: () => void;
  onRunCommand: (cmd: string) => void;
  sessionCount: number;
}) {
  const quickCmds = [
    { cmd: 'claude', desc: 'Start Claude Code agent', color: S.primary },
    { cmd: 'claude --dangerously-skip-permissions', desc: 'Auto-approve mode', color: S.primary },
    { cmd: 'git status', desc: 'Check repo state', color: S.success },
    { cmd: 'git log --oneline -20', desc: 'Last 20 commits', color: S.success },
    { cmd: 'npm run dev', desc: 'Start dev server', color: '#7170ff' },
    { cmd: 'htop', desc: 'System monitor', color: S.text2 },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        background: S.surface,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Terminals</h2>
        <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
          {sessionCount > 0
            ? `${sessionCount} session${sessionCount > 1 ? 's' : ''} running — select from Dashboard`
            : 'No active sessions'}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
        {sessionCount === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: S.surface2, border: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <p style={{ fontSize: 12, color: S.text3, margin: '0 0 14px' }}>No active sessions</p>
            <button type="button" onClick={onNewSession} style={{
              height: 38, padding: '0 18px', borderRadius: 8,
              border: 'none', background: S.primary, color: S.bg,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              New Terminal
            </button>
          </div>
        )}

        <div style={{
          fontSize: 10, fontWeight: 600, color: S.text3,
          letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
        }}>
          Quick Run
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {quickCmds.map((item) => (
            <button
              key={item.cmd}
              type="button"
              onClick={() => onRunCommand(item.cmd)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: S.surface2,
                border: `1px solid ${S.border}`, borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                textAlign: 'left', transition: 'border-color 120ms',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill={item.color} stroke="none" style={{ flexShrink: 0 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <code style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10, color: item.color, fontWeight: 500,
                background: S.surface3, padding: '2px 6px', borderRadius: 4,
                border: `1px solid ${S.border}`, flexShrink: 0,
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.cmd}
              </code>
              <span style={{ fontSize: 10, color: S.text3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReconnectView({ status, wsClient, onBack }: {
  status: ConnectionStatus;
  wsClient: TerminalWSClient | null;
  onBack: () => void;
}) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 14, padding: '0 32px',
    }}>
      {isReconnecting ? (
        <div style={{
          width: 40, height: 40,
          border: `2px solid ${S.surface3}`, borderTopColor: S.primary,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${statusColor}15`, border: `1px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" stroke={statusColor} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isConnected
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              : <><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /></>
            }
          </svg>
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: S.text1, marginBottom: 4 }}>
          {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
        </div>
        <div style={{ fontSize: 11, color: S.text3 }}>
          {isConnected ? 'WebSocket healthy — sessions preserved' : 'Attempting to restore connection'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!isConnected && (
          <button
            type="button"
            onClick={() => wsClient?.forceReconnect()}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              border: 'none', background: S.primary, color: S.bg,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          style={{
            height: 36, padding: '0 16px', borderRadius: 8,
            border: `1px solid ${S.border}`, background: 'transparent',
            color: S.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {isConnected ? 'Back to Dashboard' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

export function App() {
  const { auth, authenticateWithBootstrap, handleUnauthorized } = useAuth();
  const {
    sessions, wsClient, messageBus, createSession, closeSession,
    getSessionOutput, setSessionSnapshot, renameSession, status: connectionStatus,
  } = useSessionManager(auth, handleUnauthorized);
  const { skin, setSkin, perKeyColors, setPerKeyColors, keyboardMode, setKeyboardMode } = useSkin();
  const latencyMs = useLatency(wsClient, connectionStatus);
  const { notifications, unreadCount, markAllRead } = useNotifications(auth.token);
  const { isDone: onboardingDone, complete: completeOnboarding } = useOnboarding();
  const { ports, loading: portsLoading, error: portsError, refresh: refreshPorts } = usePorts(connectionStatus, auth.token);

  const [view, setView] = useState<View>(import.meta.env.VITE_DEMO === '1' ? 'dashboard' : 'tasks');
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  const awaitingNewSession = useRef(false);
  const sessionCountAtCreate = useRef(0);
  const pendingCommand = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Cmd+K / Ctrl+K global shortcut for Quick Open; Cmd+, for Settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickOpenVisible(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setView('settings');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch tunnel URL for the Ports view
  useEffect(() => {
    if (connectionStatus !== 'connected' || !auth.token) return;
    fetch('/api/info', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(r => r.json())
      .then((d: { tunnelUrl?: string }) => setTunnelUrl(d.tunnelUrl ?? null))
      .catch(() => {});
  }, [connectionStatus, auth.token]);

  useEffect(() => {
    if (!awaitingNewSession.current) return;
    if (sessions.length > sessionCountAtCreate.current) {
      const newest = sessions[sessions.length - 1];
      setActiveSessionId(newest.id);
      setView('terminal');
      awaitingNewSession.current = false;
      if (pendingCommand.current !== null) {
        const cmd = pendingCommand.current;
        pendingCommand.current = null;
        setTimeout(() => {
          wsClient?.send({ type: 'stdin', sessionId: newest.id, data: cmd + '\n' });
        }, 300);
      }
    }
  }, [sessions, wsClient]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('terminal');
  }, []);

  const handleCreateSession = useCallback(() => {
    sessionCountAtCreate.current = sessions.length;
    awaitingNewSession.current = true;
    createSession();
  }, [createSession, sessions.length]);

  const handleRunCommand = useCallback((cmd: string) => {
    if (activeSessionId) {
      wsClient?.send({ type: 'stdin', sessionId: activeSessionId, data: cmd + '\n' });
      setView('terminal');
    } else {
      pendingCommand.current = cmd;
      sessionCountAtCreate.current = sessions.length;
      awaitingNewSession.current = true;
      createSession();
    }
  }, [activeSessionId, wsClient, sessions.length, createSession]);

  const handleBack = useCallback((snapshot: string) => {
    if (snapshot && activeSessionId) setSessionSnapshot(activeSessionId, snapshot);
    setView('dashboard');
  }, [activeSessionId, setSessionSnapshot]);

  const handleTabChange = useCallback((v: View) => {
    if (v === 'terminal' && activeSessionId && sessions.find((s) => s.id === activeSessionId)) {
      setView('terminal');
    } else {
      setView(v);
    }
  }, [activeSessionId, sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // Single source of truth for which top-level surface to render — also the
  // deterministic no-token / authenticated contract exercised by the headless
  // dogfood tests (lib/__tests__/app-model.test.ts).
  const surface = useMemo(() => resolveAppSurface({
    isAuthenticated: auth.isAuthenticated,
    view,
    hasActiveSession: activeSession !== null,
    isDesktop,
    sessionCount: sessions.length,
    unreadCount,
    connectionStatus,
  }), [auth.isAuthenticated, view, activeSession, isDesktop, sessions.length, unreadCount, connectionStatus]);

  if (surface.kind === 'auth') {
    return <AuthScreen auth={auth} onBootstrapSubmit={authenticateWithBootstrap} />;
  }

  // The public demo opens straight on the cockpit; the welcome flow is for a real first run.
  if (!onboardingDone && import.meta.env.VITE_DEMO !== '1') {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  // Terminal with active session — full-screen, no tab bar
  if (surface.kind === 'terminal' && activeSession) {
    return (
      <TerminalView
        session={activeSession}
        wsClient={wsClient}
        messageBus={messageBus}
        getSessionOutput={getSessionOutput}
        onBack={handleBack}
        onOpenSettings={() => setView('settings')}
        onRenameSession={renameSession}
        skin={skin}
        perKeyColors={perKeyColors}
        keyboardMode={keyboardMode}
        onKeyboardModeChange={setKeyboardMode}
        latencyMs={latencyMs}
      />
    );
  }

  const { showTabBar, showFab, sessionBadge, unreadBadge } =
    surface.kind === 'shell' ? surface.nav : { showTabBar: false, showFab: false, sessionBadge: null, unreadBadge: null };
  // Always show sidebar on desktop for shell views
  const showSidebar = isDesktop && surface.kind === 'shell';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: S.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Main area: sidebar + content side by side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isDesktop ? 'row' : 'column', overflow: 'hidden', minHeight: 0 }}>
      {showSidebar && (
        <DesktopSidebar
          current={view}
          onChange={handleTabChange}
          onNewSession={handleCreateSession}
          onQuickOpen={() => setQuickOpenVisible(true)}
          sessionBadge={sessionBadge}
          unreadBadge={unreadBadge}
          connectionStatus={connectionStatus}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'dashboard' && (
            <DashboardView
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSessionSelect={handleSessionSelect}
              onCreateSession={handleCreateSession}
              onCloseSession={closeSession}
              connectionStatus={connectionStatus}
              latencyMs={latencyMs}
              authToken={auth.token}
              wsClient={wsClient}
              messageBus={messageBus}
              getSessionOutput={getSessionOutput}
            />
          )}
          {view === 'terminal' && !activeSession && (
            <TerminalEmpty
              onNewSession={handleCreateSession}
              onRunCommand={handleRunCommand}
              sessionCount={sessions.length}
            />
          )}
          {view === 'tunnels' && (
            <TunnelsView wsClient={wsClient} connectionStatus={connectionStatus} tunnelUrl={tunnelUrl} />
          )}
          {view === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              unreadCount={unreadCount}
              connectionStatus={connectionStatus}
              onMarkAllRead={markAllRead}
            />
          )}
          {view === 'settings' && (
            <SettingsView
              skin={skin}
              onSkinChange={setSkin}
              perKeyColors={perKeyColors}
              onPerKeyColorChange={setPerKeyColors}
              keyboardMode={keyboardMode}
              onKeyboardModeChange={setKeyboardMode}
              connectionStatus={connectionStatus}
              latencyMs={latencyMs}
              authToken={auth.token}
              onBack={() => setView('tasks')}
            />
          )}
          {view === 'reconnect' && (
            <ReconnectView
              status={connectionStatus}
              wsClient={wsClient}
              onBack={() => setView('dashboard')}
            />
          )}
          {view === 'ports' && (
            <PortsView
              ports={ports}
              loading={portsLoading}
              error={portsError}
              connectionStatus={connectionStatus}
              onRefresh={refreshPorts}
              tunnelUrl={tunnelUrl}
            />
          )}
          {view === 'agents' && (
            <AgentsView />
          )}
          {view === 'chat' && (
            <ChatView
              authToken={auth.token}
              connectionStatus={connectionStatus}
            />
          )}
          {view === 'tasks' && (
            <TasksView
              sessions={sessions}
              connectionStatus={connectionStatus}
              onSessionSelect={handleSessionSelect}
              onCreateSession={handleCreateSession}
              authToken={auth.token}
            />
          )}
          {view === 'automations' && <AutomationsView />}
          {view === 'mobile' && (
            <MobileView
              connectionStatus={connectionStatus}
              tunnelUrl={tunnelUrl}
              authToken={auth.token}
            />
          )}
        </div>

        {showTabBar && (
          <BottomTabBar
            current={view}
            onChange={handleTabChange}
            sessionBadge={sessionBadge}
            unreadBadge={unreadBadge}
          />
        )}
      </div>

      {showFab && <FABButton onClick={handleCreateSession} />}

      {quickOpenVisible && (
        <QuickOpen
          sessions={sessions}
          onClose={() => setQuickOpenVisible(false)}
          onSessionSelect={(id) => { setQuickOpenVisible(false); handleSessionSelect(id); }}
          onNavigate={(v) => { setQuickOpenVisible(false); handleTabChange(v); }}
          onRunCommand={(cmd) => { setQuickOpenVisible(false); handleRunCommand(cmd); }}
        />
      )}

      <UpdateNotification currentVersion={__APP_VERSION__} />
      </div>{/* end main row */}

      {/* Global bottom status bar — spans full width */}
      <StatusBar
        connectionStatus={connectionStatus}
        latencyMs={latencyMs}
        sessionCount={sessions.length}
        portCount={ports.length}
        tunnelCount={tunnelUrl ? 1 : 0}
        tunnelUrl={tunnelUrl}
        ports={ports}
        onPortsClick={() => setView('ports')}
      />
    </div>
  );
}
