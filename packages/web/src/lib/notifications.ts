import type { NotificationEvent } from './types';

/**
 * Client-side state for the notification feed, kept in the URL/store as the
 * source of truth for the unread counter. Populated from the agent's
 * /api/sse/events/notifications stream (snapshot + pushes) and from
 * POST /api/events/read.
 */
export interface NotificationState {
  notifications: NotificationEvent[];
  unreadCount: number;
}

export const INITIAL_NOTIFICATION_STATE: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

/** Cap on events retained on the client, mirroring the agent's MAX_EVENTS. */
export const MAX_NOTIFICATIONS = 50;

/**
 * Reducer for SSE notification frames. Pure and side-effect free so it's
 * trivially unit-testable without a browser. Frames arrive as
 * `{ event: string; data: string }` where `data` is a JSON payload.
 *
 * - `notifications-snapshot` replaces all state (reconnect resync).
 * - `notification` prepends one unread event.
 * - `notifications-read` marks everything read and clears the counter.
 *
 * Malformed frames are ignored rather than thrown on.
 */
export function applyNotificationMessage(
  state: NotificationState,
  eventName: string,
  rawData: string,
): NotificationState {
  try {
    if (eventName === 'notifications-snapshot') {
      const payload = JSON.parse(rawData) as { events?: unknown; unreadCount?: unknown };
      if (!Array.isArray(payload.events)) return state;
      const events = payload.events.filter(isNotificationEvent);
      return {
        notifications: events,
        unreadCount: typeof payload.unreadCount === 'number'
          ? payload.unreadCount
          : events.filter((event) => !event.read).length,
      };
    }

    if (eventName === 'notification') {
      const parsed = JSON.parse(rawData) as unknown;
      if (!isNotificationEvent(parsed)) return state;
      if (state.notifications.some((event) => event.id === parsed.id)) return state;
      return {
        notifications: [parsed, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
        unreadCount: state.unreadCount + 1,
      };
    }

    if (eventName === 'notifications-read') {
      const payload = JSON.parse(rawData) as { unreadCount?: unknown };
      return {
        notifications: state.notifications.map((event) => (event.read ? event : { ...event, read: true })),
        unreadCount: typeof payload.unreadCount === 'number' ? payload.unreadCount : 0,
      };
    }
  } catch {
    // Malformed/mid-write SSE frame — keep prior state.
  }

  return state;
}

/** Shape guard so a malformed payload can never leak into the UI list. */
export function isNotificationEvent(value: unknown): value is NotificationEvent {
  const candidate = value as Partial<NotificationEvent> | null;
  return typeof candidate === 'object'
    && candidate !== null
    && typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.body === 'string'
    && (candidate.level === 'success' || candidate.level === 'failed' || candidate.level === 'info')
    && typeof candidate.createdAt === 'string'
    && typeof candidate.read === 'boolean';
}