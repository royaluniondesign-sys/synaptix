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
import {
  collectGithubStatus,
  parseAuthStatus,
  parseBranches,
  parseGhVersion,
  parsePrList,
  parseRepoView,
  redactSecrets,
  type CommandRunner,
} from '../github.js';

/**
 * The GitHub slice exists to surface gh auth/repo/branch context without ever
 * handling credentials or running arbitrary commands. The properties that
 * matter are: parsers understand real gh output without leaking tokens, and
 * collection degrades gracefully (never throws, no remote calls when
 * unauthenticated) — so those are what these tests pin down.
 */

/** Builds a runner from a fixed command->output map; unknown commands fail. */
function scriptedRunner(responses: Record<string, string>): CommandRunner {
  return (command, args) => {
    const key = `${command} ${args.join(' ')}`.trim();
    return Promise.resolve(
      key in responses
        ? { ok: true, output: responses[key] }
        : { ok: false, output: `unexpected command: ${key}` },
    );
  };
}

describe('parseGhVersion', () => {
  it('extracts the semantic version from gh output', () => {
    expect(parseGhVersion('gh version 2.62.0 (2024-11-14)\nhttps://github.com/cli/cli')).toBe('2.62.0');
  });

  it('returns null when no version is present', () => {
    expect(parseGhVersion('command not found')).toBeNull();
  });
});

describe('parseAuthStatus', () => {
  it('reads the modern logged-in format and never keeps the token', () => {
    const auth = parseAuthStatus(
      [
        'github.com',
        '  \u2713 Logged in to github.com account monalisa (keyring)',
        '  - Active account: true',
        '  - Git operations protocol: https',
        '  - Token: gho_0123456789abcdef',
        "  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'",
      ].join('\n'),
    );
    expect(auth.authenticated).toBe(true);
    expect(auth.host).toBe('github.com');
    expect(auth.account).toBe('monalisa');
    expect(auth.scopes).toEqual(['gist', 'read:org', 'repo', 'workflow']);
  });

  it('reads the older "as <account> (hosts.yml)" format', () => {
    const auth = parseAuthStatus(
      [
        'github.com',
        '  \u2713 Logged in to github.com as octocat (~/.config/gh/hosts.yml)',
        '  \u2713 Token: *******************',
      ].join('\n'),
    );
    expect(auth.authenticated).toBe(true);
    expect(auth.account).toBe('octocat');
    expect(auth.host).toBe('github.com');
  });

  it('reports not-logged-in without throwing', () => {
    const auth = parseAuthStatus('You are not logged into any GitHub hosts. To log in, run: gh auth login');
    expect(auth.authenticated).toBe(false);
    expect(auth.account).toBeNull();
  });
});

describe('redactSecrets', () => {
  it('scrubs classic and fine-grained tokens', () => {
    const redacted = redactSecrets('Token: gho_abc123DEF and github_pat_11ABCDEFG0_xyz');
    expect(redacted).not.toContain('gho_abc123DEF');
    expect(redacted).not.toContain('github_pat_11ABCDEFG0_xyz');
    expect(redacted).toContain('[redacted]');
  });
});

describe('parseRepoView', () => {
  it('extracts owner/name and default branch', () => {
    expect(parseRepoView('{"nameWithOwner":"synaptix/synaptix","defaultBranchRef":{"name":"main"}}')).toEqual({
      nameWithOwner: 'synaptix/synaptix',
      defaultBranch: 'main',
    });
  });

  it('degrades to nulls on malformed json', () => {
    expect(parseRepoView('not json')).toEqual({ nameWithOwner: null, defaultBranch: null });
  });
});

describe('parseBranches', () => {
  it('trims, de-duplicates, and bounds the list', () => {
    expect(parseBranches('main\n\n  feature/x  \nmain\nfanout/a\n', 2)).toEqual(['main', 'feature/x']);
  });
});

describe('parsePrList', () => {
  it('maps PR json to hints and drops malformed entries', () => {
    const hints = parsePrList(
      JSON.stringify([
        { number: 12, title: 'Add cockpit slice', headRefName: 'feat/slice', state: 'OPEN' },
        { title: 'missing number' },
      ]),
    );
    expect(hints).toHaveLength(1);
    expect(hints[0]).toEqual({ number: 12, title: 'Add cockpit slice', headRefName: 'feat/slice', state: 'OPEN' });
  });

  it('returns [] on non-json output', () => {
    expect(parsePrList('not json')).toEqual([]);
  });
});

describe('collectGithubStatus', () => {
  it('reports a degraded status when gh is missing, with branch hints from git', async () => {
    const status = await collectGithubStatus(
      scriptedRunner({ 'git branch --sort=-committerdate --format=%(refname:short)': 'main\nfeature/x' }),
    );
    expect(status.installed).toBe(false);
    expect(status.authenticated).toBe(false);
    expect(status.branchHints).toEqual(['main', 'feature/x']);
    expect(status.prHints).toEqual([]);
    expect(status.notes.join(' ')).toMatch(/not available/i);
  });

  it('skips remote repo/PR calls when gh is installed but unauthenticated', async () => {
    let remoteCalls = 0;
    const runner: CommandRunner = (command, args) => {
      const key = `${command} ${args.join(' ')}`.trim();
      if (key.includes('repo view') || key.includes('pr list')) remoteCalls += 1;
      const responses: Record<string, string> = {
        'gh --version': 'gh version 2.62.0 (2024-11-14)',
        'gh auth status': 'You are not logged into any GitHub hosts. Run gh auth login to authenticate.',
        'git branch --sort=-committerdate --format=%(refname:short)': 'main',
      };
      return Promise.resolve({ ok: key in responses, output: responses[key] ?? '' });
    };

    const status = await collectGithubStatus(runner);
    expect(status.installed).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(remoteCalls).toBe(0);
    expect(status.notes.join(' ')).toMatch(/not authenticated/i);
  });

  it('collects repo and PR hints when authenticated, without leaking tokens', async () => {
    const status = await collectGithubStatus(
      scriptedRunner({
        'gh --version': 'gh version 2.62.0 (2024-11-14)',
        'gh auth status': [
          'github.com',
          '  \u2713 Logged in to github.com account monalisa (keyring)',
          "  - Token scopes: 'repo', 'workflow'",
        ].join('\n'),
        'gh repo view --json nameWithOwner,defaultBranchRef': '{"nameWithOwner":"synaptix/synaptix","defaultBranchRef":{"name":"main"}}',
        'gh pr list --limit 5 --json number,title,headRefName,state': JSON.stringify([
          { number: 7, title: 'Cockpit GitHub slice', headRefName: 'feat/gh', state: 'OPEN' },
        ]),
        'git branch --sort=-committerdate --format=%(refname:short)': 'main\nfeat/gh',
      }),
    );

    expect(status.authenticated).toBe(true);
    expect(status.repo).toEqual({ nameWithOwner: 'synaptix/synaptix', defaultBranch: 'main' });
    expect(status.prHints).toHaveLength(1);
    expect(status.prHints[0].number).toBe(7);
    expect(JSON.stringify(status)).not.toMatch(/gho_|github_pat_/);
  });

  it('never throws when the underlying runner rejects', async () => {
    const failingRunner: CommandRunner = () => Promise.reject(new Error('spawn gh ENOENT'));
    await expect(collectGithubStatus(failingRunner)).resolves.toMatchObject({ installed: false });
  });
});

describe('cockpit github endpoint guard', () => {
  const dbPath = join(tmpdir(), `synaptix-github-${randomBytes(6).toString('hex')}.db`);
  const config: AgentConfig = {
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

  it('requires auth on the dedicated github endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/github`);
    expect(res.status).toBe(401);
  });

  it('rejects unknown cockpit actions rather than shelling out', async () => {
    const res = await fetch(`${baseUrl}/api/cockpit/actions`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rm-rf-something' }),
    });
    expect(res.status).toBe(400);
  });
});
