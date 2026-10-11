import { describe, it, expect } from 'vitest';
import {
  applyNotificationMessage,
  INITIAL_NOTIFICATION_STATE,
  MAX_NOTIFICATIONS,
  isNotificationEvent,
  type NotificationState,
} from '../notifications.js';
import type { NotificationEvent } from '../types.js';

function event(id: string, overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id,
    title: `title-${id}`,
    body: `body-${id}`,
    level: 'info',
    createdAt: '2025-01-01T00:00:00.000Z',
    read: false,
    ...overrides,
  };
}

describe('isNotificationEvent', () => {
  it('accepts a well-formed event', () => {
    expect(isNotificationEvent(event('a'))).toBe(true);
  });

  it('rejects malformed shapes', () => {
    expect(isNotificationEvent(null)).toBe(false);
    expect(isNotificationEvent({ id: 'a' })).toBe(false);
    expect(isNotificationEvent({ ...event('a'), level: 'weird' })).toBe(false);
    expect(isNotificationEvent({ ...event('a'), read: 'yes' })).toBe(false);
  });
});

describe('applyNotificationMessage', () => {
  it('replaces state on a snapshot frame', () => {
    const next = applyNotificationMessage(
      INITIAL_NOTIFICATION_STATE,
      'notifications-snapshot',
      JSON.stringify({ events: [event('a'), event('b')], unreadCount: 2 }),
    );

    expect(next.notifications.map((n) => n.id)).toEqual(['a', 'b']);
    expect(next.unreadCount).toBe(2);
  });

  it('derives the unread count when the snapshot omits it', () => {
    const next = applyNotificationMessage(
      INITIAL_NOTIFICATION_STATE,
      'notifications-snapshot',
      JSON.stringify({ events: [event('a'), event('b', { read: true })] }),
    );

    expect(next.unreadCount).toBe(1);
  });

  it('drops malformed events from a snapshot but keeps valid ones', () => {
    const next = applyNotificationMessage(
      INITIAL_NOTIFICATION_STATE,
      'notifications-snapshot',
      JSON.stringify({ events: [event('a'), { nope: true }], unreadCount: 5 }),
    );

    expect(next.notifications.map((n) => n.id)).toEqual(['a']);
  });

  it('prepends a single event and bumps the unread count', () => {
    const start: NotificationState = { notifications: [event('a')], unreadCount: 1 };
    const next = applyNotificationMessage(start, 'notification', JSON.stringify(event('b')));

    expect(next.notifications.map((n) => n.id)).toEqual(['b', 'a']);
    expect(next.unreadCount).toBe(2);
  });

  it('ignores a duplicate event id', () => {
    const start: NotificationState = { notifications: [event('a')], unreadCount: 1 };
    const next = applyNotificationMessage(start, 'notification', JSON.stringify(event('a')));
    expect(next).toBe(start);
  });

  it('marks everything read and applies the reported unread count', () => {
    const start: NotificationState = { notifications: [event('a'), event('b')], unreadCount: 2 };
    const next = applyNotificationMessage(start, 'notifications-read', JSON.stringify({ unreadCount: 0 }));

    expect(next.unreadCount).toBe(0);
    expect(next.notifications.every((n) => n.read)).toBe(true);
  });

  it('caps retained notifications at MAX_NOTIFICATIONS', () => {
    let state: NotificationState = INITIAL_NOTIFICATION_STATE;
    for (let i = 0; i < MAX_NOTIFICATIONS + 5; i += 1) {
      state = applyNotificationMessage(state, 'notification', JSON.stringify(event(`e${i}`)));
    }

    expect(state.notifications.length).toBe(MAX_NOTIFICATIONS);
    expect(state.notifications[0].id).toBe(`e${MAX_NOTIFICATIONS + 4}`);
  });

  it('keeps prior state on malformed JSON', () => {
    const start: NotificationState = { notifications: [event('a')], unreadCount: 1 };
    expect(applyNotificationMessage(start, 'notification', '{not json')).toBe(start);
  });

  it('keeps prior state on an unknown event name', () => {
    const start: NotificationState = { notifications: [event('a')], unreadCount: 1 };
    expect(applyNotificationMessage(start, 'some-unrelated-event', '{}')).toBe(start);
  });
});