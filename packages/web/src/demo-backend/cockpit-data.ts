/**
 * Sample data behind the browser-only demo. Everything here is invented and
 * labelled as such in the UI; it exists so the interface can be tried without
 * installing anything.
 */

export interface DemoAgent {
  id: string;
  name: string;
  command: string;
  args: string[];
  builtin: boolean;
  available: boolean;
}

export const BUILTIN_AGENTS: DemoAgent[] = [
  { id: 'claude', name: 'Claude Code', command: 'claude', args: ['{prompt}'], builtin: true, available: true },
  { id: 'codex', name: 'Codex', command: 'codex', args: ['{prompt}'], builtin: true, available: true },
  { id: 'opencode', name: 'OpenCode', command: 'opencode', args: ['run', '{prompt}'], builtin: true, available: false },
  { id: 'hermes', name: 'Hermes', command: 'hermes', args: ['chat', '-q', '{prompt}'], builtin: true, available: false },
  { id: 'aider', name: 'Aider', command: 'aider', args: ['--message', '{prompt}'], builtin: true, available: false },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini', args: ['-p', '{prompt}'], builtin: true, available: false },
  { id: 'goose', name: 'Goose', command: 'goose', args: ['run', '-t', '{prompt}'], builtin: true, available: false },
];

export const DEMO_FILE_CONTENT: Record<string, string> = {
  'README.md': '# demo-project\n\nSample project shown in the Synaptix demo.\nNothing in this file is real.\n',
  'package.json': '{\n  "name": "demo-project",\n  "version": "1.0.0",\n  "scripts": { "test": "vitest run" }\n}\n',
  'src/server.ts': "import express from 'express'\n\nconst app = express()\napp.get('/health', (_req, res) => res.json({ ok: true }))\napp.listen(3000)\n",
};

export const DEMO_FILES = [
  { name: 'docs', path: 'docs', kind: 'dir' as const },
  { name: 'src', path: 'src', kind: 'dir' as const },
  { name: 'tests', path: 'tests', kind: 'dir' as const },
  { name: 'package.json', path: 'package.json', kind: 'file' as const },
  { name: 'README.md', path: 'README.md', kind: 'file' as const },
  { name: 'src/server.ts', path: 'src/server.ts', kind: 'file' as const },
].map((entry) => ({ ...entry, size: (DEMO_FILE_CONTENT[entry.path] ?? '').length, modifiedAt: '2026-10-12T09:00:00.000Z' }));

export const DEMO_GITHUB = {
  installed: true,
  version: 'demo',
  authenticated: false,
  account: null,
  host: null,
  scopes: [] as string[],
  repo: { nameWithOwner: 'demo/demo-project', defaultBranch: 'main' },
  branchHints: ['main', 'feature/upload-retry'],
  prHints: [{ number: 12, title: 'Add retry to the upload worker', headRefName: 'feature/upload-retry', state: 'OPEN' }],
  notes: ['Demo data: no GitHub connection is made.'],
  checkedAt: '2026-10-12T09:00:00.000Z',
};

export const DEMO_NOTIFICATIONS = [
  { id: 'demo-1', title: 'Sample notification', body: 'Notifications from your agents appear here (demo data).', level: 'info', createdAt: '2026-10-12T09:00:00.000Z', read: false },
];

/** Demo-only copy of the generic status rules in the agent package. */
const RULES: Array<[string, RegExp]> = [
  ['waiting', /\[y\/n\]|\(y\/n\)|press enter|do you want to|\?\s*$/i],
  ['failed', /\b(fatal|panic|traceback)\b|\berror[:\]]|(?<!\b0 )\bfailed\b/i],
  ['testing', /\b(vitest|jest|pytest|running tests?|npm (run )?test)\b/i],
  ['editing', /\b(edit(ing|ed)?|writ(e|ing)|updat(e|ing)|creat(e|ing))\b.*\.[a-z]{1,5}\b/i],
  ['done', /\b(all (tasks|checks) (complete|passed)|done\.?)\s*$/i],
];

export function classifyDemoOutput(output: string): string {
  const rows = output.split(/\r?\n/).map((row) => row.trim()).filter(Boolean).slice(-40);
  if (rows.length === 0) return 'idle';
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const hit = RULES.find(([, regex]) => regex.test(rows[i]));
    if (hit) return hit[0];
  }
  return 'running';
}
