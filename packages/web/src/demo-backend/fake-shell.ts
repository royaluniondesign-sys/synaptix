/**
 * A tiny simulated shell for the browser-only demo. It understands a handful of
 * commands and prints canned output. Nothing here touches a real machine.
 */

export interface ShellResult {
  /** Text to print, using \r\n line endings. */
  output: string;
  /** Clear the screen before printing. */
  clear?: boolean;
}

export const DEMO_PROJECT = 'demo-project';

const LS = ['README.md', 'package.json', 'src/', 'tests/', 'docs/'];

const GIT_STATUS = [
  'On branch main',
  'Your branch is up to date with \'origin/main\'.',
  '',
  'Changes not staged for commit:',
  '\tmodified:   src/server.ts',
  '',
  'no changes added to commit',
];

const GIT_LOG = [
  '3f9c2a1 Add retry to the upload worker',
  '8b41d07 Fix off-by-one in pagination',
  'c07e55b Add health endpoint',
];

const HELP = [
  'Simulated shell. Try:',
  '  ls            list files',
  '  pwd           print the working directory',
  '  git status    show a sample repository state',
  '  git log       show sample commits',
  '  echo <text>   print text',
  '  clear         clear the screen',
];

const lines = (rows: string[]): string => rows.join('\r\n');

export function runLine(rawLine: string): ShellResult {
  const line = rawLine.trim();
  if (line === '') return { output: '' };
  const [command, ...rest] = line.split(/\s+/);
  const args = rest.join(' ');
  switch (command) {
    case 'help':
      return { output: lines(HELP) };
    case 'ls':
      return { output: LS.join('  ') };
    case 'pwd':
      return { output: `/home/demo/${DEMO_PROJECT}` };
    case 'whoami':
      return { output: 'demo' };
    case 'echo':
      return { output: args };
    case 'clear':
      return { output: '', clear: true };
    case 'git':
      if (args === 'status') return { output: lines(GIT_STATUS) };
      if (args.startsWith('log')) return { output: lines(GIT_LOG) };
      return { output: `git: '${args}' is not simulated in this demo` };
    default:
      return { output: `zsh: command not found: ${command} (simulated shell; type help)` };
  }
}

/** Scripted reply for the simulated agent session: one step per entry. */
export function agentScript(prompt: string): string[] {
  const task = prompt.trim() || 'the task';
  return [
    `\x1b[36mPlanning\x1b[0m: ${task}`,
    '\x1b[36mReading\x1b[0m src/server.ts',
    '\x1b[36mEditing\x1b[0m src/server.ts',
    '\x1b[36mRunning\x1b[0m npm test',
    '\x1b[32mAll checks passed.\x1b[0m (scripted demo output, no agent ran)',
  ];
}
