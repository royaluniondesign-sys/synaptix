import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../server.js';
import { initDatabase } from '../db.js';
import { createSessionJWT } from '../auth.js';
import { NotificationStore, MAX_EVENTS } from '../event-bus.js';
import type { AgentConfig } from '../config.js';

/**
 * The notifications slice is an in-memory unread/event model: no push provider
 * credentials exist in the project, so events are served via the authenticated
 * REST endpoints and a live SSE feed, and the web UI renders an unread badge.
 * These tests pin the store contract + the HTTP/SSE surfaces.
 */

function makeConfig(dbPath: string): AgentConfig {
  return {
    port: 0,
    webPort: 0,
    jwtSecret: randomBytes(32).toString('hex'),
    staticToken: randomBytes(32).toString('base64url'),
    ngrokAuthtoken: undefined,
    ngrokStaticDomain: undefined,
    tunnelMethod: 'local',
    resendApiKey: undefined,
    dbPath,
    tmuxDisabled: true,
  };
}

describe('NotificationStore (in-memory unread model)', () => {
  it('push appends an unread event to the front of the feed', () => {
    const store = new NotificationStore();
    const first = store.push({ title: 'a', body: 'first', level: 'success' });
    const second = store.push({ title: 'b', body: 'second', level: 'failed' });

    expect(store.getUnreadCount()).toBe(2);
    expect(store.getEvents().map((event) => event.id)).toEqual([second.id, first.id]);
    expect(second.read).toBe(false);
  });

  it('markAllRead clears the counter and marks every event read; idempotent', () => {
    const store = new NotificationStore();
    store.push({ title: 'a', body: 'a', level: 'info' });
    store.push({ title: 'b', body: 'b', level: 'info' });

    store.markAllRead();
    expect(store.getUnreadCount()).toBe(0);
    expect(store.getEvents().every((event) => event.read)).toBe(true);

    store.markAllRead(); // second call is a no-op, no broadcast
    expect(store.getUnreadCount()).toBe(0);
  });

  it('subscribe receives live pushes and read notifications until unsubscribed', () => {
    const store = new NotificationStore();
    const received: string[] = [];
    const unsubscribe = store.subscribe((message) => {
      received.push(message.kind === 'event' ? `event:${message.event.title}` : `read:${message.unreadCount}`);
    });

    const pushed = store.push({ title: 'ping', body: 'pong', level: 'success' });
    store.markAllRead();
    expect(received).toEqual(['event:ping', 'read:0']);

    unsubscribe();
    store.push({ title: 'after', body: 'unsubscribed', level: 'info' });
    store.markAllRead();
    expect(received).toEqual(['event:ping', 'read:0']);
    expect(pushed.id.length).toBeGreaterThan(0);
  });

  it('retains at most MAX_EVENTS events, dropping the oldest', () => {
    const store = new NotificationStore();
    for (let i = 0; i < MAX_EVENTS + 10; i += 1) {
      store.push({ title: `event-${i}`, body: '', level: 'info' });
    }

    expect(store.getEvents().length).toBe(MAX_EVENTS);
    expect(store.getEvents()[0].title).toBe(`event-${MAX_EVENTS + 9}`);
  });
});

describe('notifications HTTP API', () => {
  const dbPath = join(tmpdir(), `termora-notifications-${randomBytes(6).toString('hex')}.db`);
  const config = makeConfig(dbPath);
  const store = new NotificationStore();
  const { db, statements } = initDatabase(dbPath);
  const { httpServer } = createAppServer(config, statements, { notificationStore: store });
  let baseUrl = '';
  let token = '';
  let jti = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    const session = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    token = session.token;
    jti = session.jti;
    statements.insertSession.run(jti, jti, 'Test device');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });
  });

  // Computed lazily: `token` is only populated in beforeAll, which runs after
  // the describe body evaluates.
  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  it('rejects an unauthenticated request', async () => {
    const res = await fetch(`${baseUrl}/api/events`);
    expect(res.status).toBe(401);
  });

  it('returns stored events with their unread state', async () => {
    store.push({ title: 'run-gates', body: 'npm run lint', level: 'success' });
    store.push({ title: 'worktree-fanout', body: 'create X worktrees', level: 'failed' });

    const res = await fetch(`${baseUrl}/api/events`, { headers: authHeaders() });
    expect(res.status).toBe(200);

    const body = await res.json() as { events: Array<{ title: string; read: boolean }>; unreadCount: number };
    expect(body.events.map((event) => event.title)).toEqual(['worktree-fanout', 'run-gates']);
    expect(body.events.every((event) => event.read === false)).toBe(true);
    expect(body.unreadCount).toBe(2);
  });

  it('POST /api/events/read marks everything read', async () => {
    const readRes = await fetch(`${baseUrl}/api/events/read`, { method: 'POST', headers: authHeaders() });
    expect(readRes.status).toBe(200);
    expect(await readRes.json()).toEqual({ unreadCount: 0 });

    const res = await fetch(`${baseUrl}/api/events`, { headers: authHeaders() });
    const body = await res.json() as { events: Array<{ read: boolean }>; unreadCount: number };
    expect(body.unreadCount).toBe(0);
    expect(body.events.every((event) => event.read)).toBe(true);
  });

  it('streams the initial snapshot then live pushes over SSE', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${baseUrl}/api/sse/events/notifications?token=${encodeURIComponent(token)}`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      if (!res.body) throw new Error('SSE response had no body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const readUntil = async (needle: string): Promise<string> => {
        const deadline = Date.now() + 5000;
        while (!buffer.includes(needle)) {
          if (Date.now() > deadline) throw new Error(`Timed out waiting for "${needle}"; got: ${buffer}`);
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }
        return buffer;
      };

      await readUntil('event: notifications-snapshot');
      expect(buffer).toContain(`"unreadCount":${store.getUnreadCount()}`);

      const pushed = store.push({ title: 'sse-live', body: 'arrives over the wire', level: 'info' });
      // Wait for the pushed id specifically — 'event: notification' is a prefix
      // of the snapshot frame name and would match it immediately.
      const after = await readUntil(`"id":"${pushed.id}"`);
      expect(after).toContain('"title":"sse-live"');
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  });

  it('rejects an SSE connection with an invalid token', async () => {
    const res = await fetch(`${baseUrl}/api/sse/events/notifications?token=not-a-jwt`);
    expect(res.status).toBe(401);
  });

  it('rejects an SSE connection with no token', async () => {
    const res = await fetch(`${baseUrl}/api/sse/events/notifications`);
    expect(res.status).toBe(401);
  });
});