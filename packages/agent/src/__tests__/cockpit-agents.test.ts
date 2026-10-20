import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';

/**
 * HTTP contract for the agent registry: auth is required, custom agents can be
 * registered/removed, built-ins are protected, and the status endpoint
 * classifies terminal output. The registry file is redirected to a temp dir so
 * the suite never touches the real ~/.synaptix.
 */

describe('cockpit agent registry endpoints', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synaptix-cockpit-agents-'));
  const dbPath = join(dir, 'test.db');
  let baseUrl = '';
  let authHeader = '';
  let close: () => Promise<void>;

  beforeAll(async () => {
    process.env.SYNAPTIX_AGENTS_FILE = join(dir, 'agents.json');
    const { createAppServer } = await import('../server.js');
    const { initDatabase } = await import('../db.js');
    const { createSessionJWT } = await import('../auth.js');
    const config = {
      port: 0, webPort: 0,
      jwtSecret: randomBytes(32).toString('hex'),
      staticToken: randomBytes(32).toString('base64url'),
      ngrokAuthtoken: undefined, ngrokStaticDomain: undefined,
      tunnelMethod: 'local' as const, resendApiKey: undefined, dbPath, tmuxDisabled: true,
    };
    const { db, statements } = initDatabase(dbPath);
    const { httpServer } = createAppServer(config, statements);
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    authHeader = `Bearer ${token}`;
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
    close = async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      db.close();
    };
  });

  afterAll(async () => {
    await close();
    delete process.env.SYNAPTIX_AGENTS_FILE;
    rmSync(dir, { recursive: true, force: true });
  });

  const call = (path: string, method = 'GET', body?: unknown, auth = true) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(auth ? { Authorization: authHeader } : {}), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('requires authentication on every route', async () => {
    for (const [method, path] of [['GET', '/api/cockpit/agents'], ['POST', '/api/cockpit/agents'], ['DELETE', '/api/cockpit/agents/x'], ['POST', '/api/cockpit/agents/claude/status']]) {
      expect((await call(path, method, method === 'GET' ? undefined : {}, false)).status).toBe(401);
    }
  });

  it('lists built-in agents with availability and the state vocabulary', async () => {
    const body = await (await call('/api/cockpit/agents')).json() as { agents: { id: string; builtin: boolean; available: boolean }[]; states: string[] };
    expect(body.agents.find((a) => a.id === 'claude')).toMatchObject({ builtin: true });
    expect(typeof body.agents[0].available).toBe('boolean');
    expect(body.states).toContain('waiting');
  });

  it('registers, rejects bad input, and removes a custom agent', async () => {
    const created = await call('/api/cockpit/agents', 'POST', { id: 'mine', name: 'Mine', command: 'mine', args: ['{prompt}'] });
    expect(created.status).toBe(201);
    expect((await call('/api/cockpit/agents', 'POST', { id: 'bad', name: 'Bad', command: 'rm -rf /' })).status).toBe(400);
    expect((await call('/api/cockpit/agents', 'POST', { id: 'claude', name: 'Fake', command: 'fake' })).status).toBe(400);
    const listed = await (await call('/api/cockpit/agents')).json() as { agents: { id: string }[] };
    expect(listed.agents.some((a) => a.id === 'mine')).toBe(true);
    expect((await call('/api/cockpit/agents/mine', 'DELETE')).status).toBe(200);
    expect((await call('/api/cockpit/agents/mine', 'DELETE')).status).toBe(404);
  });

  it('protects built-ins from deletion', async () => {
    expect((await call('/api/cockpit/agents/claude', 'DELETE')).status).toBe(400);
  });

  it('classifies output via the status endpoint', async () => {
    const res = await call('/api/cockpit/agents/claude/status', 'POST', { output: 'Apply these changes? [y/n]' });
    expect(await res.json()).toEqual({ id: 'claude', state: 'waiting' });
    expect((await call('/api/cockpit/agents/nope/status', 'POST', { output: 'x' })).status).toBe(404);
    expect((await call('/api/cockpit/agents/claude/status', 'POST', { output: 'x'.repeat(70_000) })).status).toBe(413);
  });
});
