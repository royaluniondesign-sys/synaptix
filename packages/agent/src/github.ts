// Local-first GitHub workflow status for the cockpit.
//
// Design constraints (why this file is deliberately small and rigid):
//   - No secrets in code and no credential handling here. The GitHub CLI owns
//     auth; this module only *reads* a redacted summary of `gh auth status`.
//   - No arbitrary shell. Every invocation is a fixed, read-only command from
//     the whitelist below — no request value is ever interpolated into argv.
//   - Local detection first. When `gh` is missing or unauthenticated we return
//     a degraded status plus a note instead of attempting remote calls.
//   - Never throw. A flaky `gh`/network must not take down the cockpit status,
//     so every probe is best-effort and failures surface as fields, not 500s.

export interface CommandResult {
  ok: boolean;
  output: string;
}

/** The only commands this module is allowed to run. Exported for tests/docs. */
export const GITHUB_COMMANDS = {
  version: ['--version'] as const,
  authStatus: ['auth', 'status'] as const,
  repoView: ['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef'] as const,
  prList: ['pr', 'list', '--limit', '5', '--json', 'number,title,headRefName,state'] as const,
};

/** Read-only git probe used for branch hints when `gh` is unavailable. */
export const BRANCH_COMMANDS = ['branch', '--sort=-committerdate', '--format=%(refname:short)'] as const;

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;

export interface GithubPrHint {
  number: number;
  title: string;
  headRefName: string;
  state: string;
}

export interface GithubStatus {
  installed: boolean;
  version: string | null;
  authenticated: boolean;
  account: string | null;
  host: string | null;
  scopes: string[];
  repo: {
    nameWithOwner: string | null;
    defaultBranch: string | null;
  };
  branchHints: string[];
  prHints: GithubPrHint[];
  notes: string[];
  checkedAt: string;
}

const MAX_BRANCH_HINTS = 8;
const MAX_PR_HINTS = 5;

/**
 * Replaces anything that looks like a GitHub token before a string can leave
 * this module. Defensive: parsers already drop the token line, but status
 * output is easy to leak by accident, so redaction is a second layer.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/github_pat_[A-Za-z0-9_]+/g, '[redacted]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]+/g, '[redacted]');
}

/** `gh version 2.62.0 (2024-11-14)` -> `2.62.0`. */
export function parseGhVersion(output: string): string | null {
  const match = /gh version\s+([0-9][^\s(]*)/.exec(output);
  return match ? match[1] : null;
}

export interface ParsedAuth {
  authenticated: boolean;
  account: string | null;
  host: string | null;
  scopes: string[];
}

/**
 * Parses `gh auth status` output across the common gh 2.x formats, dropping
 * every token/host-file detail. Handles the not-logged-in case, which exits
 * non-zero but still prints a useful message.
 */
export function parseAuthStatus(output: string): ParsedAuth {
  const clean = redactSecrets(output);
  const loginLine = /Logged in to\s+(\S+)/.exec(clean);
  const authenticated = loginLine !== null;

  const host = loginLine ? loginLine[1] : null;
  const accountMatch = /account\s+(\S+)/.exec(clean) ?? /Logged in to\s+\S+\s+as\s+(\S+)/.exec(clean);
  const scopesLine = /Token scopes:\s*(.+)/.exec(clean);
  const scopes = scopesLine
    ? (scopesLine[1].match(/'([^']+)'/g) ?? scopesLine[1].split(','))
        .map((scope) => scope.replace(/'/g, '').trim())
        .filter((scope) => scope.length > 0)
    : [];

  return {
    authenticated,
    account: accountMatch ? accountMatch[1].split('(')[0].trim() : null,
    host,
    scopes,
  };
}

/** Parses `gh repo view --json nameWithOwner,defaultBranchRef` output. */
export function parseRepoView(output: string): { nameWithOwner: string | null; defaultBranch: string | null } {
  try {
    const data = JSON.parse(output) as { nameWithOwner?: unknown; defaultBranchRef?: { name?: unknown } | null };
    return {
      nameWithOwner: typeof data.nameWithOwner === 'string' ? data.nameWithOwner : null,
      defaultBranch:
        data.defaultBranchRef && typeof data.defaultBranchRef.name === 'string' ? data.defaultBranchRef.name : null,
    };
  } catch {
    return { nameWithOwner: null, defaultBranch: null };
  }
}

/** One branch name per line -> a bounded, de-duplicated hint list. */
export function parseBranches(output: string, limit = MAX_BRANCH_HINTS): string[] {
  const seen = new Set<string>();
  const branches: string[] = [];
  for (const raw of output.split('\n')) {
    const branch = raw.trim();
    if (!branch || seen.has(branch)) continue;
    seen.add(branch);
    branches.push(branch);
    if (branches.length >= limit) break;
  }
  return branches;
}

/** Parses `gh pr list --json number,title,headRefName,state` output. */
export function parsePrList(output: string, limit = MAX_PR_HINTS): GithubPrHint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is GithubPrHint => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.number === 'number' && typeof candidate.title === 'string';
    })
    .slice(0, limit)
    .map((item) => ({
      number: item.number,
      title: item.title,
      headRefName: typeof item.headRefName === 'string' ? item.headRefName : '',
      state: typeof item.state === 'string' ? item.state : '',
    }));
}

/** Runs a probe, converting a throw (missing binary, timeout) into `ok: false`. */
async function safeRun(runner: CommandRunner, command: string, args: readonly string[]): Promise<CommandResult> {
  try {
    return await runner(command, [...args]);
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : 'command failed' };
  }
}

/**
 * Collects a best-effort GitHub workflow snapshot for the cockpit. Only runs
 * the fixed read-only commands above. Remote `gh repo view`/`gh pr list` calls
 * are skipped unless the CLI is installed and authenticated, so an
 * unauthenticated machine performs zero network requests.
 */
export async function collectGithubStatus(runner: CommandRunner): Promise<GithubStatus> {
  const notes: string[] = [];
  const versionResult = await safeRun(runner, 'gh', GITHUB_COMMANDS.version);
  const installed = versionResult.ok || /gh version/.test(versionResult.output);

  const branchHints = parseBranches((await safeRun(runner, 'git', BRANCH_COMMANDS)).output);

  if (!installed) {
    notes.push('GitHub CLI (gh) is not available on this machine. Install it to enable PR/issue workflows.');
    return {
      installed: false,
      version: null,
      authenticated: false,
      account: null,
      host: null,
      scopes: [],
      repo: { nameWithOwner: null, defaultBranch: null },
      branchHints,
      prHints: [],
      notes,
      checkedAt: new Date().toISOString(),
    };
  }

  const version = parseGhVersion(versionResult.output);
  const auth = parseAuthStatus((await safeRun(runner, 'gh', GITHUB_COMMANDS.authStatus)).output);

  let repo: GithubStatus['repo'] = { nameWithOwner: null, defaultBranch: null };
  let prHints: GithubPrHint[] = [];

  if (!auth.authenticated) {
    notes.push('gh is installed but not authenticated. Run `gh auth login` to enable repo and PR hints.');
  } else {
    const repoResult = await safeRun(runner, 'gh', GITHUB_COMMANDS.repoView);
    repo = parseRepoView(repoResult.output);
    if (!repo.nameWithOwner) {
      notes.push('No GitHub repository detected for this directory (or the remote is not a GitHub repo).');
    } else {
      prHints = parsePrList((await safeRun(runner, 'gh', GITHUB_COMMANDS.prList)).output);
    }
  }

  return {
    installed: true,
    version,
    authenticated: auth.authenticated,
    account: auth.account,
    host: auth.host,
    scopes: auth.scopes,
    repo,
    branchHints,
    prHints,
    notes,
    checkedAt: new Date().toISOString(),
  };
}
