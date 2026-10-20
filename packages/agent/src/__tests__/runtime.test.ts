import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { startAgent, type AgentHandle } from '../runtime.js';
import type { AgentConfig } from '../config.js';

/**
 * The desktop shell must launch the agent in-process instead of shelling out.
 * These tests pin the programmatic lifecycle: startAgent() binds a real port,
 * serves the existing API, and close() releases every resource.
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

function removeDb(dbPath: string): void {
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-wal`, { force: true });
  rmSync(`${dbPath}-shm`, { force: true });
}

describe('startAgent', () => {
  let handle: AgentHandle | undefined;
  let dbPath = '';

  afterEach(async () => {
    await handle?.close();
    handle = undefined;
    if (dbPath) {
      removeDb(dbPath);
      dbPath = '';
    }
  });

  it('binds an ephemeral port and serves the health endpoint', async () => {
    dbPath = join(tmpdir(), `synaptix-runtime-${randomBytes(6).toString('hex')}.db`);
    handle = await startAgent({ config: makeConfig(dbPath), log: false });

    expect(handle.port).toBeGreaterThan(0);

    const health = await fetch(`http://127.0.0.1:${String(handle.port)}/api/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('releases the port and is idempotent on close', async () => {
    dbPath = join(tmpdir(), `synaptix-runtime-${randomBytes(6).toString('hex')}.db`);
    handle = await startAgent({ config: makeConfig(dbPath), log: false });
    const port = handle.port;

    await handle.close();
    await expect(handle.close()).resolves.toBeUndefined();
    handle = undefined;

    await expect(
      fetch(`http://127.0.0.1:${String(port)}/api/health`),
    ).rejects.toThrow();
  });
});
