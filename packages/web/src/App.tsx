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
import type { View } from './lib/types';
import type { ConnectionStatus, TerminalWSClient } from './lib/ws-client';

const S = {
  bg: '#08090a',
  surface: '#0f1011',
  surface2: '#191a1b',
  surface3: '#28282c',
  border: 'rgba(255,255,255,0.08)',
  primary: '#7170ff',
  success: '#10b981',
  error: '#ef4444',
  warning: '#7170ff',
  text1: '#f7f8f8',
  text2: '#d0d6e0',
  text3: '#8a8f98',
} as const;

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

const PROJECTS = ['RUD-WEB', 'Synaptix', 'excited-bohr', 'excited-tesla', 'intelligent-galileo', 'serene-raman'];

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
        gap: 8, padding: '0 10px', borderRadius: 6, border: 'none',
        marginBottom: 1,
        background: active ? `${S.primary}16` : 'transparent',
        color: active ? S.primary : S.text2,
        fontSize: 12.5, fontWeight: active ? 600 : 400,
        fontFamily: 'inherit', cursor: 'pointer',
        transition: 'background 100ms, color 100ms',
        textAlign: 'left', flexShrink: 0,
      }}
    >
      <span style={{ color: active ? S.primary : S.text3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 9, fontWeight: 700, minWidth: 16, textAlign: 'center',
          background: badgeColor ? `${badgeColor}25` : S.surface3,
          color: badgeColor ?? S.text3,
          padding: '1px 5px', borderRadius: 8,
        }}>{badge}</span>
      )}
    </button>
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
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const isConnected = connectionStatus === 'connected';
  const statusColor = isConnected ? S.success : connectionStatus === 'reconnecting' ? S.warning : S.error;

  const filteredProjects = PROJECTS.filter(p =>
    projectFilter === '' || p.toLowerCase().includes(projectFilter.toLowerCase())
  );

  // SVG icons matching Orca's sidebar icons
  const icons = {
    search: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    checklist: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    tasks: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    automations: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    dashboard: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
    mobile: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
    terminal: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    tunnels: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    chat: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    bell: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    settings: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };

  return (
    <div style={{
      width: 220,
      background: S.surface,
      borderRight: `1px solid ${S.border}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* App header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 36 36">
            <rect width="36" height="36" rx="8" fill={S.primary}/>
            <text x="18" y="25" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Arial,sans-serif">T</text>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.text1, letterSpacing: -0.4, flex: 1 }}>Synaptix</span>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: statusColor,
            animation: isConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }} />
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 6, padding: '0 8px', height: 28 }}>
          {icons.search}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: S.text1, fontSize: 12, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Primary navigation — matches Orca exactly */}
      <div style={{ padding: '0 6px', flexShrink: 0 }}>
        {/* Onboarding checklist */}
        <NavItem label="Onboarding checklist" icon={icons.checklist}
          active={false} onClick={() => onChange('settings')} />

        {/* Tasks */}
        <NavItem label="Tasks" icon={icons.tasks}
          active={current === 'tasks'}
          badge={sessionBadge} badgeColor={S.primary}
          onClick={() => onChange('tasks')} />

        {/* Automations */}
        <NavItem label="Automations" icon={icons.automations}
          active={current === 'automations'}
          onClick={() => onChange('automations')} />

        {/* Agent Dashboard */}
        <NavItem label="Agent Dashboard" icon={icons.dashboard}
          active={current === 'dashboard'}
          onClick={() => onChange('dashboard')} />

        {/* Synaptix Mobile */}
        <NavItem label="Synaptix Mobile" icon={icons.mobile}
          active={current === 'mobile'}
          onClick={() => onChange('mobile')} />
      </div>

      <div style={{ borderTop: `1px solid ${S.border}`, margin: '4px 10px' }} />

      {/* Secondary navigation */}
      <div style={{ padding: '0 6px', flexShrink: 0 }}>
        <NavItem label="Terminals" icon={icons.terminal}
          active={current === 'terminal'}
          badge={sessionBadge} badgeColor={S.text3}
          onClick={() => onChange('terminal')} />
        <NavItem label="Tunnels" icon={icons.tunnels}
          active={current === 'tunnels'}
          onClick={() => onChange('tunnels')} />
        <NavItem label="Chat" icon={icons.chat}
          active={current === 'chat'}
          onClick={() => onChange('chat')} />
        <NavItem label="Notifications" icon={icons.bell}
          active={current === 'notifications'}
          badge={unreadBadge} badgeColor={S.error}
          onClick={() => onChange('notifications')} />
      </div>

      <div style={{ borderTop: `1px solid ${S.border}`, margin: '4px 10px' }} />

      {/* Projects section */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 14px 2px', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: S.text2, flex: 1 }}>Projects</span>
          <button type="button" onClick={onNewSession} title="New session" style={{
            background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {/* Project filter input */}
        <div style={{ padding: '2px 8px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 5, padding: '0 7px', height: 24 }}>
            {icons.search}
            <input
              type="text"
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              placeholder="Filter…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: S.text1, fontSize: 11, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
          {filteredProjects.length > 0 ? (
            filteredProjects.map(proj => (
              <button key={proj} type="button" onClick={() => onChange('tasks')} style={{
                width: '100%', height: 29, display: 'flex', alignItems: 'center',
                gap: 8, padding: '0 8px', borderRadius: 5,
                border: 'none', marginBottom: 1,
                background: 'transparent', color: S.text2,
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                transition: 'background 100ms',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = S.surface2; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.surface3, border: `1px solid ${S.border}`, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{proj}</span>
              </button>
            ))
          ) : (
            <p style={{ fontSize: 11, color: S.text3, padding: '6px 8px', lineHeight: 1.5, margin: 0 }}>
              No agent activity matches these filters.
            </p>
          )}
        </div>
      </div>

      {/* Bottom: settings + profile */}
      <div style={{ borderTop: `1px solid ${S.border}`, padding: '8px 10px 10px', flexShrink: 0 }}>
        {/* Settings + ⌘K row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <button type="button" onClick={() => onChange('settings')} title="Settings (⌘,)"
            style={{
              flex: 1, height: 30, borderRadius: 6, border: `1px solid ${S.border}`,
              background: current === 'settings' ? `${S.primary}14` : 'transparent',
              color: current === 'settings' ? S.primary : S.text3,
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
            }}>
            {icons.settings}
            <span>Settings</span>
          </button>
          <button type="button" onClick={onQuickOpen} title="Quick Open (⌘K)"
            style={{
              width: 30, height: 30, borderRadius: 6, border: `1px solid ${S.border}`,
              background: 'transparent', color: S.text3,
              fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ⌘K
          </button>
        </div>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: `linear-gradient(135deg, ${S.primary}, #a78bfa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>W</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              whitemelonis11
            </div>
            <div style={{ fontSize: 9, color: S.text3 }}>v{__APP_VERSION__}</div>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: `${S.primary}20`, border: `1px solid ${S.primary}40`,
            color: S.primary, flexShrink: 0,
          }}>Max</span>
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
  // Always show sidebar on desktop for shell views (matches Orca behavior)
  const showSidebar = isDesktop && surface.kind === 'shell';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      background: S.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
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
            <AgentsView
              sessions={sessions}
              connectionStatus={connectionStatus}
              wsClient={wsClient}
              messageBus={messageBus}
              onSessionSelect={handleSessionSelect}
              onCreateSession={handleCreateSession}
            />
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
    </div>
  );
}
