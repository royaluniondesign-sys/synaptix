import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../server.js';
import { initDatabase } from '../db.js';
import { createSessionJWT } from '../auth.js';
import type { AgentConfig } from '../config.js';

/**
 * The cockpit read-file endpoint backs rich repo previews and diff context.
 * The properties that matter are safety (never escape the repo root, never
 * treat a directory as text) and boundedness (never buffer an unbounded file
 * into a response), so those are what this suite pins down against a real
 * HTTP server and a real auth token.
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

describe('cockpit read-file endpoint', () => {
  const dbPath = join(tmpdir(), `termora-cockpit-file-${randomBytes(6).toString('hex')}.db`);
  const config = makeConfig(dbPath);
  const { db, statements } = initDatabase(dbPath);
  const { httpServer } = createAppServer(config, statements);
  let baseUrl = '';
  let authHeader = '';

  beforeAll(async () => {
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    authHeader = `Bearer ${token}`;
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/file?path=package.json`);
    expect(res.status).toBe(401);
  });

  it('returns the text content of a repo file', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/file?path=package.json`, { headers: { Authorization: authHeader } });
    expect(res.status).toBe(200);
    const body = await res.json() as { path: string; binary: boolean; truncated: boolean; content: string };
    expect(body.path).toBe('package.json');
    expect(body.binary).toBe(false);
    expect(body.truncated).toBe(false);
    expect(body.content).toContain('"name": "termora"');
  });

  it('refuses to escape the repo root', async () => {
    const res = await fetch(
      `${baseUrl}/api/cockpit/file?path=${encodeURIComponent('../../../../etc/passwd')}`,
      { headers: { Authorization: authHeader } },
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/escape/i);
  });

  it('refuses directories', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/file?path=packages`, { headers: { Authorization: authHeader } });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/directory/i);
  });

  it('marks binary files and withholds their content', async () => {
    const res = await fetch(
      `${baseUrl}/api/cockpit/file?path=${encodeURIComponent('docs/images/cockpit-desktop-v2.png')}`,
      { headers: { Authorization: authHeader } },
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { binary: boolean; content: string };
    expect(body.binary).toBe(true);
    expect(body.content).toBe('');
  });

  it('truncates oversized reads to the requested byte budget', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/file?path=package-lock.json&maxBytes=64`, { headers: { Authorization: authHeader } });
    expect(res.status).toBe(200);
    const body = await res.json() as { truncated: boolean; content: string };
    expect(body.truncated).toBe(true);
    expect(body.content.length).toBeLessThanOrEqual(64);
  });
});
