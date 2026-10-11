import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { verifyJWT } from './auth.js';
import type { DbStatements } from './db.js';
import type { NotificationStore } from './event-bus.js';

/**
 * Stored completed auth events, keyed by pendingId.
 * This solves the race condition where auth completes before
 * the client starts listening for SSE events.
 */
const completedAuths = new Map<string, string>();

/** Active SSE connections waiting for auth completion, keyed by pendingId. */
const pendingListeners = new Map<string, Response>();

/** Heartbeat interval in milliseconds. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Emits an auth-complete event for a given pendingId.
 * If a client is already listening via SSE, the JWT is sent immediately.
 * Otherwise, the JWT is stored for later retrieval (stored-event pattern).
 */
export function emitAuthComplete(pendingId: string, jwt: string): void {
  const res = pendingListeners.get(pendingId);

  if (res) {
    // Client is already listening -- send the JWT immediately
    res.write(`event: auth-complete\ndata: ${JSON.stringify({ token: jwt })}\n\n`);
    res.end();
    pendingListeners.delete(pendingId);
  } else {
    // Client not yet listening -- store for later retrieval
    completedAuths.set(pendingId, jwt);

    // Auto-expire stored events after 5 minutes to prevent memory leaks
    setTimeout(() => {
      completedAuths.delete(pendingId);
    }, 5 * 60 * 1000);
  }
}

export interface SSERouterOptions {
  jwtSecret: string;
  statements: DbStatements;
  notificationStore: NotificationStore;
}

/**
 * Creates the SSE router with two endpoint groups:
 *
 *  - GET /events/:pendingId — one-shot auth-complete handoff.
 *  - GET /events/notifications — authenticated live notification feed
 *    (unread model), sending an initial snapshot followed by pushes.
 */
export function createSSERouter(options: SSERouterOptions): Router {
  const router = createRouter();

  // Registered before /events/:pendingId so it isn't swallowed by that param
  // route (Express matches in registration order).
  router.get('/events/notifications', async (req: Request, res: Response) => {
    const token = typeof req.query['token'] === 'string' ? req.query['token'] : undefined;
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    let jti: string | undefined;
    try {
      const { payload } = await verifyJWT(token, options.jwtSecret);
      jti = payload.jti;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!jti || !options.statements.getSession.get(jti)) {
      res.status(401).json({ error: 'Session revoked' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const writeFrame = (event: string, data: unknown): void => {
      if (res.writableEnded || res.destroyed) return;
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client went away mid-write; the close handler below cleans up.
      }
    };

    const unsubscribe = options.notificationStore.subscribe((message) => {
      if (message.kind === 'event') {
        writeFrame('notification', message.event);
      } else {
        writeFrame('notifications-read', { unreadCount: message.unreadCount });
      }
    });

    // Initial snapshot: a reconnect should resync everything rather than race on
    // live pushes, so the UI can always rebuild an accurate unread counter.
    writeFrame('notifications-snapshot', {
      events: options.notificationStore.getEvents(),
      unreadCount: options.notificationStore.getUnreadCount(),
    });

    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) return;
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      if (!res.writableEnded) res.end();
    });
  });

  router.get('/events/:pendingId', (req: Request, res: Response) => {
    const rawPendingId = req.params['pendingId'];
    const pendingId = Array.isArray(rawPendingId) ? rawPendingId[0] : rawPendingId;

    if (!pendingId) {
      res.status(400).json({ error: 'Missing pendingId' });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Race condition fix: check if auth already completed before we started listening
    const storedJwt = completedAuths.get(pendingId);
    if (storedJwt) {
      completedAuths.delete(pendingId);
      res.write(`event: auth-complete\ndata: ${JSON.stringify({ token: storedJwt })}\n\n`);
      res.end();
      return;
    }

    // Register this connection as a pending listener
    pendingListeners.set(pendingId, res);

    // Heartbeat to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      pendingListeners.delete(pendingId);
    });
  });

  return router;
}
