import { existsSync, readFileSync } from 'node:fs';

const REQUIRED_FILES = [
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/desktop/vitest.config.ts',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/runtime-plan.ts',
  'apps/desktop/src/agent-host.ts',
  'apps/desktop/src/__tests__/desktop-shell.test.ts',
];

const ELECTRON_KEYS = ['electron', 'electron-builder', 'electron-builder-squirrel-windows'];
const problems = [];
const fail = (message) => problems.push(message);
const read = (path) => readFileSync(path, 'utf8');

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) fail(`missing desktop boundary file: ${file}`);
}

let desktopPkg = null;
try {
  desktopPkg = JSON.parse(read('apps/desktop/package.json'));
} catch (error) {
  fail(`could not read apps/desktop/package.json: ${error.message}`);
}

if (desktopPkg) {
  if (desktopPkg.name !== '@termora/desktop-app') fail(`unexpected desktop package name: ${desktopPkg.name}`);
  if (desktopPkg.private !== true) fail('desktop package must remain private');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const deps = desktopPkg[section] ?? {};
    for (const key of ELECTRON_KEYS) {
      if (key in deps) fail(`desktop ${section} declares ${key}; scaffold must not claim packaging`);
    }
  }
}

if (existsSync('apps/desktop/src/runtime-plan.ts')) {
  const plan = read('apps/desktop/src/runtime-plan.ts');
  const requiredSnippets = [
    "phase: 'scaffold'",
    "agentEntry: 'programmatic'",
    "webDistDir: 'packages/web/dist'",
    "cliDistDir: 'packages/cli/dist'",
    'export const desktopRuntimePlan',
  ];
  for (const snippet of requiredSnippets) {
    if (!plan.includes(snippet)) fail(`runtime-plan.ts missing invariant: ${snippet}`);
  }
}

if (existsSync('apps/desktop/src/agent-host.ts')) {
  const host = read('apps/desktop/src/agent-host.ts');
  const requiredSnippets = [
    'export function describeAgentLaunch',
    "target = strategy === 'programmatic' ? 'startAgent'",
    "TERMORA_DESKTOP_SHELL: '1'",
  ];
  for (const snippet of requiredSnippets) {
    if (!host.includes(snippet)) fail(`agent-host.ts missing invariant: ${snippet}`);
  }
}

if (existsSync('apps/desktop/src/main.ts')) {
  const main = read('apps/desktop/src/main.ts');
  for (const snippet of ['createDesktopBootstrap', 'desktopRuntimePlan', 'describeAgentLaunch']) {
    if (!main.includes(snippet)) fail(`main.ts missing desktop bootstrap reference: ${snippet}`);
  }
}

if (problems.length > 0) {
  const detail = problems.map((p) => `- ${p}`).join('\n');
  console.error(`Desktop boundary contract failed:\n${detail}`);
  process.exit(1);
}

console.log('desktop boundary contract ok');
