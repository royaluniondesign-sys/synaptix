import { existsSync, readFileSync } from 'node:fs'

const REQUIRED_FILES = [
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/desktop/tsconfig.build.json',
  'apps/desktop/vitest.config.ts',
  'apps/desktop/scripts/launch-electron.mjs',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/runtime-plan.ts',
  'apps/desktop/src/agent-host.ts',
  'apps/desktop/src/agent-lifecycle.ts',
  'apps/desktop/src/ipc-contract.ts',
  'apps/desktop/src/shell.ts',
  'apps/desktop/src/dev.ts',
  'apps/desktop/src/window.ts',
  'apps/desktop/src/main-window.ts',
  'apps/desktop/src/electron-loader.ts',
  'apps/desktop/src/electron-main.ts',
  'apps/desktop/src/preload.ts',
  'apps/desktop/src/__tests__/desktop-shell.test.ts',
  'apps/desktop/src/__tests__/desktop-dev-shell.test.ts',
  'apps/desktop/src/__tests__/desktop-window.test.ts',
  'apps/desktop/src/__tests__/desktop-main-window.test.ts',
  'apps/desktop/src/__tests__/desktop-electron-main.test.ts',
  'apps/desktop/src/__tests__/desktop-preload.test.ts',
]

// Electron and electron-builder are declared in apps/desktop/package.json only
// (apps/desktop is outside root workspaces). The Squirrel Windows packager stays
// forbidden: Windows installers are NSIS, and nothing else is claimed.
const PACKAGING_KEYS = ['electron-builder-squirrel-windows']
const LAUNCHER_SOURCES = [
  'apps/desktop/src/electron-loader.ts',
  'apps/desktop/src/electron-main.ts',
  'apps/desktop/src/preload.ts',
]
const problems = []
const fail = (message) => problems.push(message)
const read = (path) => readFileSync(path, 'utf8')

// Invariants are matched with whitespace stripped from both sides so they stay
// stable under prettier wrapping.
const norm = (text) => text.replace(/\s+/g, '')
const has = (code, snippet) => norm(code).includes(norm(snippet))
const checkSnippets = (code, snippets, label) => {
  for (const snippet of snippets) {
    if (!has(code, snippet)) fail(`${label} missing invariant: ${snippet}`)
  }
}

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) fail(`missing desktop boundary file: ${file}`)
}

let desktopPkg = null
try {
  desktopPkg = JSON.parse(read('apps/desktop/package.json'))
} catch (error) {
  fail(`could not read apps/desktop/package.json: ${error.message}`)
}

if (desktopPkg) {
  if (desktopPkg.name !== '@termora/desktop-app')
    fail(`unexpected desktop package name: ${desktopPkg.name}`)
  if (desktopPkg.private !== true) fail('desktop package must remain private')
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const deps = desktopPkg[section] ?? {}
    for (const key of PACKAGING_KEYS) {
      if (key in deps) fail(`desktop ${section} declares ${key}; packaging stays limited to electron-builder`)
    }
  }
  // The real launcher entry needs a scoped Electron dependency, declared only
  // here (apps/desktop is intentionally outside root workspaces).
  const devDeps = desktopPkg.devDependencies ?? {}
  const runtimeDeps = desktopPkg.dependencies ?? {}
  if (!('electron' in devDeps) && !('electron' in runtimeDeps)) {
    fail('desktop must declare an Electron dependency for the real launcher entry')
  }
}

// The desktop app must stay outside root npm workspaces so a heavy desktop
// dependency can never change the root install/CI surface.
try {
  const rootPkg = JSON.parse(read('package.json'))
  const workspaces = rootPkg.workspaces ?? []
  if (workspaces.some((pattern) => String(pattern).includes('apps/')))
    fail('root workspaces must not include apps/**; desktop boundary stays isolated')
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if ('electron' in (rootPkg[section] ?? {}))
      fail(`root ${section} must not declare electron; keep it scoped to apps/desktop`)
  }
} catch (error) {
  fail(`could not read root package.json: ${error.message}`)
}

if (existsSync('apps/desktop/src/runtime-plan.ts')) {
  const plan = read('apps/desktop/src/runtime-plan.ts')
  const requiredSnippets = [
    "phase: 'scaffold'",
    "agentEntry: 'programmatic'",
    "webDistDir: 'packages/web/dist'",
    "cliDistDir: 'packages/cli/dist'",
    'export const desktopRuntimePlan',
  ]
  checkSnippets(plan, requiredSnippets, 'runtime-plan.ts')
}

if (existsSync('apps/desktop/src/agent-host.ts')) {
  const host = read('apps/desktop/src/agent-host.ts')
  const requiredSnippets = [
    'export function describeAgentLaunch',
    "target = strategy === 'programmatic' ? AGENT_RUNTIME_SYMBOL",
    "AGENT_RUNTIME_SYMBOL = 'startAgent'",
    "AGENT_RUNTIME_MODULE = '@termora/agent/runtime'",
    "TERMORA_DESKTOP_SHELL: '1'",
    'entrypoint:',
  ]
  checkSnippets(host, requiredSnippets, 'agent-host.ts')
}

if (existsSync('apps/desktop/src/agent-lifecycle.ts')) {
  const lifecycle = read('apps/desktop/src/agent-lifecycle.ts')
  const requiredSnippets = [
    'export function createAgentLifecycle',
    'startAgent: StartAgentFn',
    "descriptor.strategy !== 'programmatic'",
    'export type StartAgentFn',
    'readonly port: number | null',
  ]
  checkSnippets(lifecycle, requiredSnippets, 'agent-lifecycle.ts')
}

if (existsSync('apps/desktop/src/main.ts')) {
  const main = read('apps/desktop/src/main.ts')
  checkSnippets(
    main,
    ['createDesktopBootstrap', 'desktopRuntimePlan', 'describeAgentLaunch', 'createAgentLifecycle'],
    'main.ts',
  )
  checkSnippets(
    main,
    ['createDesktopShell', 'loadAgentStartFn', 'exposeTermoraPreload'],
    'main.ts re-exports',
  )
}

if (existsSync('apps/desktop/src/ipc-contract.ts')) {
  const ipc = read('apps/desktop/src/ipc-contract.ts')
  checkSnippets(
    ipc,
    [
      'export const DESKTOP_IPC_CHANNELS',
      "getStatus: 'termora:shell-status:get'",
      "status: 'termora:shell-status'",
      "start: 'termora:shell:start'",
      "stop: 'termora:shell:stop'",
      'export interface DesktopShellStatus',
      'export interface IpcMainLike',
      'export function createTermoraPreloadApi',
      'export function exposeTermoraPreload',
      "TERMORA_PRELOAD_KEY = 'termora'",
    ],
    'ipc-contract.ts',
  )
}

if (existsSync('apps/desktop/src/shell.ts')) {
  const shell = read('apps/desktop/src/shell.ts')
  checkSnippets(
    shell,
    [
      'export function createDesktopShell',
      'export async function loadAgentStartFn',
      'export function buildAgentWebUrl',
      'export async function runHeadlessDevShell',
      'createAgentLifecycle(',
      'AGENT_RUNTIME_SYMBOL',
      'lifecycle.start()',
      'lifecycle.stop()',
    ],
    'shell.ts',
  )
}

if (existsSync('apps/desktop/src/dev.ts')) {
  const dev = read('apps/desktop/src/dev.ts')
  checkSnippets(dev, ['loadAgentStartFn', 'runHeadlessDevShell'], 'dev.ts')
}

if (existsSync('apps/desktop/src/window.ts')) {
  const win = read('apps/desktop/src/window.ts')
  checkSnippets(
    win,
    [
      'export async function createBrowserWindow',
      'export async function loadElectron',
      "ELECTRON_WINDOW_MODULE = 'electron'",
      'loadURL(',
      'options.onClosed?.()',
      'webPreferences:',
      'contextIsolation',
      'import type { ShellWindow }',
    ],
    'window.ts',
  )
  if (has(win, "from 'electron'")) {
    fail('window.ts must not statically import electron; resolve it via loadElectron')
  }
}

if (existsSync('apps/desktop/src/main-window.ts')) {
  const mainWindow = read('apps/desktop/src/main-window.ts')
  checkSnippets(
    mainWindow,
    [
      'export function createDesktopMain',
      'export function wireDesktopIpc',
      'createBrowserWindow(',
      'shell.ready()',
      'shell.dispose()',
      'DESKTOP_IPC_CHANNELS.start',
      'DESKTOP_IPC_CHANNELS.stop',
      'ipc.handle(',
      'ipc.removeHandler(',
    ],
    'main-window.ts',
  )
}

if (existsSync('apps/desktop/src/electron-loader.ts')) {
  const loader = read('apps/desktop/src/electron-loader.ts')
  checkSnippets(
    loader,
    [
      'export async function loadElectronMain',
      'export async function loadElectronPreload',
      "ELECTRON_MODULE = 'electron'",
      'import(specifier)',
      'export type ElectronImporter',
    ],
    'electron-loader.ts',
  )
}

if (existsSync('apps/desktop/src/electron-main.ts')) {
  const main = read('apps/desktop/src/electron-main.ts')
  checkSnippets(
    main,
    [
      'export async function startDesktopApp',
      'createDesktopMain(',
      'loadAgentStartFn',
      'loadElectron(',
      'whenReady()',
      "app.on('window-all-closed'",
      'export function resolvePreloadPath',
    ],
    'electron-main.ts',
  )
}

if (existsSync('apps/desktop/src/preload.ts')) {
  const preload = read('apps/desktop/src/preload.ts')
  checkSnippets(
    preload,
    [
      'export async function bootstrapTermoraPreload',
      'exposeTermoraPreload(',
      'loadElectronPreload',
    ],
    'preload.ts',
  )
}

// The launcher sources must stay free of static Electron bindings: resolve the
// runtime through the computed loader only (the smoke contract scans all of src;
// this keeps the boundary check self-contained as well).
const STATIC_ELECTRON_BINDINGS = [
  /\bfrom\s*['"]electron['"]/,
  /\brequire\s*\(\s*['"]electron['"]\s*\)/,
  /\bimport\s*\(\s*['"]electron['"]\s*\)/,
]
for (const file of LAUNCHER_SOURCES) {
  if (!existsSync(file)) continue
  const code = read(file)
  for (const pattern of STATIC_ELECTRON_BINDINGS) {
    if (pattern.test(code))
      fail(`${file} binds electron statically; resolve it through loadElectronMain/loadElectron`)
  }
}

if (problems.length > 0) {
  const detail = problems.map((p) => `- ${p}`).join('\n')
  console.error(`Desktop boundary contract failed:\n${detail}`)
  process.exit(1)
}

console.log('desktop boundary contract ok')
