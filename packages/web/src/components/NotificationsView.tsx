import { formatRelativeTime } from '../lib/format-relative-time';
import type { NotificationEvent } from '../lib/types';
import type { ConnectionStatus } from '../lib/ws-client';

const S = {
  bg: '#08090a',
  surface: '#0f1011',
  surface2: '#191a1b',
  surface3: '#28282c',
  border: 'rgba(255,255,255,0.08)',
  primary: '#7170ff',
  text1: '#f7f8f8',
  text2: '#d0d6e0',
  text3: '#8a8f98',
} as const;

const LEVEL_TONE = {
  success: '#10b981',
  failed: '#ef4444',
  info: '#7170ff',
} as const;

interface NotificationsViewProps {
  notifications: NotificationEvent[];
  unreadCount: number;
  connectionStatus: ConnectionStatus;
  onMarkAllRead: () => void;
}

export function NotificationsView({
  notifications,
  unreadCount,
  connectionStatus,
  onMarkAllRead,
}: NotificationsViewProps) {
  const connected = connectionStatus === 'connected';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        background: S.surface,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>
            Notifications
          </h2>
          <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            {connected ? '' : ' — reconnecting'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              height: 28, padding: '0 10px', borderRadius: 7,
              border: `1px solid ${S.border}`, background: S.surface2,
              color: S.text2, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: -0.1,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {notifications.length === 0 ? (
          <EmptyState connected={connected} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifications.map((event) => <NotificationRow key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ event }: { event: NotificationEvent }) {
  const tone = LEVEL_TONE[event.level];
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 9,
      background: S.surface2, border: `1px solid ${S.border}`,
      opacity: event.read ? 0.62 : 1,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: S.text1, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.title}
          </span>
          <span style={{ fontSize: 10, color: event.read ? S.text3 : S.primary, flexShrink: 0 }}>
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
        <div style={{
          fontSize: 11, color: S.text2, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.body}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, margin: '0 auto 12px',
        background: S.surface2, border: `1px solid ${S.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {connected
          ? <BellIcon color={S.text3} />
          : (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${S.surface3}`, borderTopColor: S.primary,
              animation: 'spin 0.9s linear infinite',
            }} />
          )}
      </div>
      <p style={{ fontSize: 12, color: S.text2, margin: '0 0 4px' }}>
        {connected ? 'No notifications yet' : 'Reconnecting to the cockpit'}
      </p>
      <p style={{
        fontSize: 11, color: S.text3, margin: '0 auto', maxWidth: 260,
      }}>
        {connected
          ? 'Job completions and agent activity will show up here with an unread badge.'
          : 'Live updates resume over SSE once the connection is back.'}
      </p>
    </div>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" stroke={color} fill="none"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}