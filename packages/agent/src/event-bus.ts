import type { NotificationEvent } from './types.js';

/**
 * Message pushed to NotificationStore subscribers. Kept deliberately small so
 * SSE consumers (and any future push channel) forward it straight through.
 */
export type NotificationStreamMessage =
  | { kind: 'event'; event: NotificationEvent }
  | { kind: 'read'; unreadCount: number };

/** Cap on retained events. Older events are dropped; live listeners never lose a push. */
export const MAX_EVENTS = 50;

/**
 * In-memory NotificationStore — the smallest safe unread/event model for the
 * cockpit. There are no push provider credentials in the project (no APNs/FCM),
 * so notifications surface as an in-app feed: clients poll GET /api/events or
 * subscribe over SSE, and the UI keeps an unread counter.
 *
 * The store is intentionally memory-only for now. Persisting across restarts
 * would need a schema change + migration in db.ts, which is out of scope for
 * this slice.
 */
export class NotificationStore {
  private events: NotificationEvent[] = [];
  private listeners = new Set<(message: NotificationStreamMessage) => void>();

  push(input: Omit<NotificationEvent, 'id' | 'createdAt' | 'read'>): NotificationEvent {
    const event: NotificationEvent = {
      ...input,
      id: createEventId(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.events = [event, ...this.events].slice(0, MAX_EVENTS);
    this.broadcast({ kind: 'event', event });
    return event;
  }

  getEvents(): readonly NotificationEvent[] {
    return this.events;
  }

  getUnreadCount(): number {
    let count = 0;
    for (const event of this.events) {
      if (!event.read) count += 1;
    }
    return count;
  }

  markAllRead(): void {
    if (this.getUnreadCount() === 0) return;
    this.events = this.events.map((event) => (event.read ? event : { ...event, read: true }));
    this.broadcast({ kind: 'read', unreadCount: 0 });
  }

  subscribe(listener: (message: NotificationStreamMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private broadcast(message: NotificationStreamMessage): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(message);
      } catch {
        // A misbehaving listener must not break the store or other subscribers.
      }
    }
  }
}

/** Shared store for all agent routes (server, cockpit, SSE). Tests inject their own. */
export const notificationStore = new NotificationStore();

/** Collision-resistant event ids without pulling crypto into the client bundle. */
function createEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}