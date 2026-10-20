import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { parseListeningPorts } from '../ports.js';

describe('parseListeningPorts', () => {
  it('reads `ss -tlnup` lines', () => {
    const out = [
      'Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process',
      'tcp   LISTEN 0      511    127.0.0.1:4030     0.0.0.0:*          users:(("node",pid=4242,fd=19))',
      'tcp   LISTEN 0      128    *:22               *:*                users:(("sshd",pid=900,fd=3))',
    ].join('\n');
    expect(parseListeningPorts(out)).toEqual([
      { port: 22, process: 'sshd', pid: 900, proto: 'tcp' },
      { port: 4030, process: 'node', pid: 4242, proto: 'tcp' },
    ]);
  });

  it('reads `lsof -i -P -n -sTCP:LISTEN` lines and de-duplicates by port', () => {
    const out = [
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME',
      'node     4242 me    19u  IPv4 0x1      0t0  TCP 127.0.0.1:4030 (LISTEN)',
      'node     4242 me    20u  IPv6 0x2      0t0  TCP *:4030 (LISTEN)',
    ].join('\n');
    expect(parseListeningPorts(out)).toEqual([{ port: 4030, process: 'node', pid: 4242, proto: 'tcp' }]);
  });

  it('ignores lines it does not understand', () => {
    expect(parseListeningPorts('garbage\n\nState Recv-Q')).toEqual([]);
  });
});

describe('GET /api/cockpit/ports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synaptix-cockpit-ports-'));
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

  it('answers 401 without a token', async () => {
    expect((await fetch(`${baseUrl}/api/cockpit/ports`)).status).toBe(401);
  });

  it('answers 401 to a made-up bearer token (the old route accepted any "Bearer x")', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/ports`, { headers: { Authorization: 'Bearer not-a-real-token' } });
    expect(res.status).toBe(401);
  });

  it('no longer serves the unguarded /api/ports route', async () => {
    const res = await fetch(`${baseUrl}/api/ports`, { headers: { Authorization: 'Bearer not-a-real-token' } });
    expect(res.status).not.toBe(200);
  });

  it('returns a port list for a valid session', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/ports`, { headers: { Authorization: authHeader } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ports: Array<{ port: number }> };
    expect(Array.isArray(body.ports)).toBe(true);
  });
});
