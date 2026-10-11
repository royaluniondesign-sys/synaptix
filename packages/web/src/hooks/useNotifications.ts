import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyNotificationMessage,
  INITIAL_NOTIFICATION_STATE,
  type NotificationState,
} from '../lib/notifications';

export interface UseNotificationsReturn extends NotificationState {
  markAllRead: () => void;
}

/**
 * Live notification feed for the logged-in web UI.
 *
 * Opens an SSE stream to /api/sse/events/notifications?token=<jwt> while
 * authenticated, feeding each frame through the pure reducer in
 * lib/notifications.ts. EventSource auto-reconnects, and every reconnect
 * begins with a snapshot frame that resyncs the full state.
 *
 * There is no external push here — the unread counter (badged on the tab bar)
 * is the shared signal, by design until a push provider exists.
 */
export function useNotifications(token: string | null): UseNotificationsReturn {
  const [state, setState] = useState<NotificationState>(INITIAL_NOTIFICATION_STATE);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token || typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const url = `${protocol}//${window.location.host}/api/sse/events/notifications?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    const handlers: Array<[string, (event: MessageEvent<string>) => void]> = [
      ['notifications-snapshot', (event) => setState((prev) => applyNotificationMessage(prev, 'notifications-snapshot', event.data))],
      ['notification', (event) => setState((prev) => applyNotificationMessage(prev, 'notification', event.data))],
      ['notifications-read', (event) => setState((prev) => applyNotificationMessage(prev, 'notifications-read', event.data))],
    ];

    for (const [name, handler] of handlers) source.addEventListener(name, handler);

    return () => {
      for (const [name, handler] of handlers) source.removeEventListener(name, handler);
      source.close();
      sourceRef.current = null;
    };
  }, [token]);

  const markAllRead = useCallback(() => {
    if (token) {
      void fetch('/api/events/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Optimistic clear below still applies; the next snapshot re-syncs.
      });
    }
    setState((prev) => ({
      notifications: prev.notifications.map((event) => (event.read ? event : { ...event, read: true })),
      unreadCount: 0,
    }));
  }, [token]);

  return { ...state, markAllRead };
}