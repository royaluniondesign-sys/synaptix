import { accessSync, constants, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join } from 'node:path';

/**
 * Registry of CLI agents Termora can launch, plus a heuristic status parser.
 *
 * A profile is data, not code: an executable plus an argv template. Commands
 * are never run through a shell, so a template can only ever inject a prompt as
 * one argv element. The parser reads terminal output and classifies it; it is a
 * best-effort heuristic, not a protocol every agent speaks.
 */

export const AGENT_STATES = ['idle', 'running', 'editing', 'testing', 'waiting', 'failed', 'done'] as const;
export type AgentState = (typeof AGENT_STATES)[number];

export interface StatusRule {
  state: AgentState;
  /** Regular expression source, matched case-insensitively against one output line. */
  pattern: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  /** Bare executable name (resolved on PATH) or an absolute path. */
  command: string;
  /** argv template; `{prompt}` is replaced inside an element, never split. */
  args: string[];
  /** Custom rules are tried before the generic defaults. */
  statusRules: StatusRule[];
  builtin: boolean;
}

export interface AgentProfileInput {
  id?: unknown;
  name?: unknown;
  command?: unknown;
  args?: unknown;
  statusRules?: unknown;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const COMMAND_RE = /^[A-Za-z0-9._+\-/]+$/;
const MAX_ARGS = 24;
const MAX_ARG_LENGTH = 512;
const MAX_RULES = 24;
const MAX_PATTERN_LENGTH = 160;
const MAX_NAME_LENGTH = 64;
const MAX_CUSTOM_PROFILES = 32;
/** Lines are truncated before matching so a hostile pattern sees bounded input. */
const MAX_LINE_LENGTH = 400;
const TAIL_LINES = 40;

export const DEFAULT_STATUS_RULES: StatusRule[] = [
  { state: 'waiting', pattern: '\\[y/n\\]|\\(y/n\\)|press enter|waiting for (input|approval|you)|do you want to|approve\\??\\s*$|\\?\\s*$' },
  { state: 'failed', pattern: '\\b(fatal|panic|traceback|unhandled (exception|rejection)|rate.?limit(ed)?)\\b|\\berror[:\\]]|(?<!\\b0 )\\bfailed\\b' },
  { state: 'testing', pattern: '\\b(vitest|jest|pytest|mocha|cargo test|go test|running tests?|npm (run )?test)\\b' },
  { state: 'editing', pattern: '\\b(edit(ing|ed)?|writ(e|ing|ten)|updat(e|ing|ed)|creat(e|ing|ed)|patch(ing|ed)?)\\b.*\\.[a-z]{1,5}\\b' },
  { state: 'done', pattern: '\\b(all (tasks|checks) (complete|passed)|task complete|completed successfully|done\\.?)\\s*$' },
];

const BUILTIN_PROFILES: AgentProfile[] = [
  { id: 'claude', name: 'Claude Code', command: 'claude', args: ['{prompt}'], statusRules: [], builtin: true },
  { id: 'codex', name: 'Codex', command: 'codex', args: ['{prompt}'], statusRules: [], builtin: true },
  { id: 'opencode', name: 'OpenCode', command: 'opencode', args: ['run', '{prompt}'], statusRules: [], builtin: true },
  { id: 'hermes', name: 'Hermes', command: 'hermes', args: ['chat', '-q', '{prompt}'], statusRules: [], builtin: true },
  { id: 'aider', name: 'Aider', command: 'aider', args: ['--message', '{prompt}'], statusRules: [], builtin: true },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini', args: ['-p', '{prompt}'], statusRules: [], builtin: true },
  { id: 'goose', name: 'Goose', command: 'goose', args: ['run', '-t', '{prompt}'], statusRules: [], builtin: true },
];

export class AgentProfileError extends Error {}

function fail(message: string): never {
  throw new AgentProfileError(message);
}

function compilePattern(pattern: string): RegExp {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return fail(`Invalid status pattern: ${pattern.slice(0, 40)}`);
  }
}

/** Validates untrusted input into a custom profile, throwing AgentProfileError. */
export function validateProfile(input: AgentProfileInput): AgentProfile {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!ID_RE.test(id)) fail('id must be 1-32 chars of a-z, 0-9 or "-", starting with a letter or digit');

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) fail(`name is required (max ${MAX_NAME_LENGTH} chars)`);

  const command = typeof input.command === 'string' ? input.command.trim() : '';
  if (!command || !COMMAND_RE.test(command)) {
    fail('command must be an executable name or path without spaces, quotes or shell characters');
  }
  if (command.includes('/') && !isAbsolute(command)) fail('command with a path separator must be absolute');
  if (command.split('/').includes('..')) fail('command must not contain ".."');

  const rawArgs = input.args === undefined ? ['{prompt}'] : input.args;
  if (!Array.isArray(rawArgs) || rawArgs.length > MAX_ARGS) fail(`args must be an array of at most ${MAX_ARGS} strings`);
  const args = rawArgs.map((arg) => {
    if (typeof arg !== 'string' || arg.length > MAX_ARG_LENGTH || arg.includes('\0')) {
      fail(`each arg must be a string of at most ${MAX_ARG_LENGTH} chars`);
    }
    return arg;
  });

  const rawRules = input.statusRules === undefined ? [] : input.statusRules;
  if (!Array.isArray(rawRules) || rawRules.length > MAX_RULES) fail(`statusRules must be an array of at most ${MAX_RULES} rules`);
  const statusRules = rawRules.map((rule): StatusRule => {
    const candidate = rule as Partial<StatusRule> | null;
    if (!candidate || !AGENT_STATES.includes(candidate.state as AgentState)) {
      fail(`rule state must be one of: ${AGENT_STATES.join(', ')}`);
    }
    if (typeof candidate.pattern !== 'string' || !candidate.pattern || candidate.pattern.length > MAX_PATTERN_LENGTH) {
      fail(`rule pattern is required (max ${MAX_PATTERN_LENGTH} chars)`);
    }
    compilePattern(candidate.pattern);
    return { state: candidate.state as AgentState, pattern: candidate.pattern };
  });

  return { id, name, command, args, statusRules, builtin: false };
}

/** Fills the argv template. The prompt stays inside its element: no splitting, no shell. */
export function expandArgs(profile: AgentProfile, vars: { prompt: string }): string[] {
  return profile.args.map((arg) => arg.split('{prompt}').join(vars.prompt));
}

/** True when `command` resolves to an executable file; never executes it. */
export function isCommandAvailable(command: string, pathEnv = process.env.PATH ?? ''): boolean {
  const candidates = isAbsolute(command) ? [command] : pathEnv.split(delimiter).filter(Boolean).map((dir) => join(dir, command));
  return candidates.some((candidate) => {
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(\u0007|\u001b\\)|\u001b[()][A-Za-z0-9]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/**
 * Classifies the tail of an agent's terminal output. Scans from the newest
 * line backwards; the first line matching any rule decides. Custom rules win
 * over defaults on the same line. Empty output is `idle`, unmatched output is
 * `running`.
 */
export function parseAgentStatus(profile: Pick<AgentProfile, 'statusRules'> | null, output: string): AgentState {
  const lines = stripAnsi(output)
    .split(/\r?\n|\r/)
    .map((line) => line.trim().slice(0, MAX_LINE_LENGTH))
    .filter(Boolean)
    .slice(-TAIL_LINES);
  if (lines.length === 0) return 'idle';

  const rules = [...(profile?.statusRules ?? []), ...DEFAULT_STATUS_RULES].map((rule) => ({
    state: rule.state,
    regex: compilePattern(rule.pattern),
  }));

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const hit = rules.find((rule) => rule.regex.test(line));
    if (hit) return hit.state;
  }
  return 'running';
}

export interface AgentView extends AgentProfile {
  available: boolean;
}

/** Built-in profiles plus user-defined ones persisted as JSON. */
export class AgentRegistry {
  private custom = new Map<string, AgentProfile>();

  constructor(private readonly filePath: string = join(homedir(), '.termora', 'agents.json')) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        try {
          const profile = validateProfile(entry as AgentProfileInput);
          if (!BUILTIN_PROFILES.some((builtin) => builtin.id === profile.id)) this.custom.set(profile.id, profile);
        } catch {
          // Skip a corrupt entry rather than refuse to start.
        }
      }
    } catch {
      // Unreadable file: start with built-ins only; it is rewritten on the next change.
    }
  }

  private save(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    const data = [...this.custom.values()].map(({ builtin: _builtin, ...rest }) => rest);
    writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    renameSync(tmp, this.filePath);
  }

  get(id: string): AgentProfile | undefined {
    return this.custom.get(id) ?? BUILTIN_PROFILES.find((profile) => profile.id === id);
  }

  list(): AgentView[] {
    return [...BUILTIN_PROFILES, ...this.custom.values()].map((profile) => ({
      ...profile,
      available: isCommandAvailable(profile.command),
    }));
  }

  register(input: AgentProfileInput): AgentProfile {
    const profile = validateProfile(input);
    if (BUILTIN_PROFILES.some((builtin) => builtin.id === profile.id)) fail(`"${profile.id}" is a built-in agent id`);
    if (!this.custom.has(profile.id) && this.custom.size >= MAX_CUSTOM_PROFILES) {
      fail(`at most ${MAX_CUSTOM_PROFILES} custom agents are allowed`);
    }
    this.custom.set(profile.id, profile);
    this.save();
    return profile;
  }

  remove(id: string): boolean {
    if (!this.custom.delete(id)) return false;
    this.save();
    return true;
  }
}
