import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Deterministic desktop smoke contract for Electron/window readiness.
//
// Pure Node: no Electron install, no GUI, no signing, no network, no secrets and
// no non-dev dependencies. It proves the pieces a desktop window needs before any
// real Electron binary exists:
//   1. desktop entry/bootstrap modules are present and wired,
//   2. the IPC + preload channel contract is exact and collision-free,
//   3. Electron and the agent runtime are only ever resolved through injected
//      computed loaders (never statically imported),
//   4. the built web cockpit the window loads is present and self-consistent.
//
// The web-UI check is required: CI runs `turbo run build` before this contract,
// so `packages/web/dist` must exist. Run `npm run build` locally to satisfy it.

const WEB_DIST = 'packages/web/dist'
const DESKTOP_SRC = 'apps/desktop/src'

const ENTRY_FILES = [
  'apps/desktop/package.json',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/dev.ts',
  'apps/desktop/src/main-window.ts',
  'apps/desktop/src/window.ts',
  'apps/desktop/src/shell.ts',
  'apps/desktop/src/ipc-contract.ts',
  'apps/desktop/src/agent-host.ts',
  'apps/desktop/src/agent-lifecycle.ts',
  'apps/desktop/src/runtime-plan.ts',
]

// Exact IPC channel names the preload bridge and main process must agree on.
const REQUIRED_CHANNELS = {
  getStatus: 'termora:shell-status:get',
  status: 'termora:shell-status',
  start: 'termora:shell:start',
  stop: 'termora:shell:stop',
}

const problems = []
const fail = (message) => problems.push(message)
const read = (path) => readFileSync(path, 'utf8')
const norm = (text) => text.replace(/\s+/g, '')
const has = (code, snippet) => norm(code).includes(norm(snippet))
const checkSnippets = (code, snippets, label) => {
  for (const snippet of snippets) {
    if (!has(code, snippet)) fail(`${label} missing invariant: ${snippet}`)
  }
}

// 1. Desktop entry/bootstrap surface.
for (const file of ENTRY_FILES) {
  if (!existsSync(file)) fail(`missing desktop entry file: ${file}`)
}

if (existsSync('apps/desktop/package.json')) {
  let desktopPkg = null
  try {
    desktopPkg = JSON.parse(read('apps/desktop/package.json'))
  } catch (error) {
    fail(`could not read apps/desktop/package.json: ${error.message}`)
  }
  if (desktopPkg) {
    if (desktopPkg.name !== '@termora/desktop-app')
      fail(`unexpected desktop package name: ${desktopPkg.name}`)
    if (desktopPkg.type !== 'module') fail('desktop package must stay an ES module')
    if (desktopPkg.private !== true) fail('desktop package must remain private')
    if (desktopPkg.scripts?.smoke !== 'node ../../scripts/check-desktop-smoke.mjs')
      fail('apps/desktop package.json must expose a smoke script wired to this checker')
  }
}

if (existsSync('apps/desktop/src/main.ts')) {
  const main = read('apps/desktop/src/main.ts')
  checkSnippets(
    main,
    ['export function createDesktopBootstrap', 'createDesktopBootstrap('],
    'main.ts',
  )
  checkSnippets(
    main,
    ['createDesktopMain', 'wireDesktopIpc', 'createBrowserWindow'],
    'main.ts window surface',
  )
}

if (existsSync('apps/desktop/src/runtime-plan.ts')) {
  const plan = read('apps/desktop/src/runtime-plan.ts')
  checkSnippets(
    plan,
    [`webDistDir: '${WEB_DIST}'`, 'export const desktopRuntimePlan'],
    'runtime-plan.ts',
  )
}

// 2. IPC + preload channel contract.
if (existsSync('apps/desktop/src/ipc-contract.ts')) {
  const ipc = read('apps/desktop/src/ipc-contract.ts')
  checkSnippets(
    ipc,
    [
      'export const DESKTOP_IPC_CHANNELS',
      "TERMORA_PRELOAD_KEY = 'termora'",
      'export function createTermoraPreloadApi',
      'export function exposeTermoraPreload',
    ],
    'ipc-contract.ts',
  )
  for (const [key, channel] of Object.entries(REQUIRED_CHANNELS)) {
    if (!has(ipc, `${key}: '${channel}'`))
      fail(`ipc-contract.ts missing channel mapping: ${key} -> ${channel}`)
  }

  const channels = [...norm(ipc).matchAll(/'(termora:[^']+)'/g)].map((match) => match[1])
  const unique = new Set(channels)
  if (unique.size !== channels.length) fail('ipc-contract.ts declares duplicate IPC channel names')
  for (const channel of unique) {
    if (!channel.startsWith('termora:')) fail(`IPC channel must be namespaced: ${channel}`)
  }
  const expected = new Set(Object.values(REQUIRED_CHANNELS))
  for (const channel of expected) {
    if (!unique.has(channel)) fail(`ipc-contract.ts is missing required channel: ${channel}`)
  }
}

// 3. Runtime loader invariants: no static Electron/agent import anywhere in src.
const collectSources = (dir) => {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue
      out.push(...collectSources(path))
    } else if (entry.endsWith('.ts')) {
      out.push(path)
    }
  }
  return out
}

const STATIC_ELECTRON_PATTERNS = [
  { pattern: /\bfrom\s*['"]electron['"]/, label: "static import from 'electron'" },
  { pattern: /\brequire\s*\(\s*['"]electron['"]\s*\)/, label: "require('electron')" },
  { pattern: /\bimport\s*\(\s*['"]electron['"]\s*\)/, label: "dynamic import('electron')" },
]

// Drops `//` and `/* */` comments while preserving string/template contents, so
// documentation examples like `import('electron')` never trip the scan but a
// real binding would.
const stripComments = (code) => {
  let out = ''
  let state = 'code'
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i]
    const next = code[i + 1]
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line'
        i += 1
      } else if (ch === '/' && next === '*') {
        state = 'block'
        i += 1
      } else if (ch === "'" || ch === '"' || ch === '`') {
        state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template'
        out += ch
      } else {
        out += ch
      }
      continue
    }
    if (state === 'line') {
      if (ch === '\n') {
        state = 'code'
        out += ch
      }
      continue
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code'
        i += 1
      } else if (ch === '\n') {
        out += ch
      }
      continue
    }
    if (ch === '\\') {
      out += ch + (next ?? '')
      i += 1
      continue
    }
    out += ch
    if (
      (state === 'single' && ch === "'") ||
      (state === 'double' && ch === '"') ||
      (state === 'template' && ch === '`')
    ) {
      state = 'code'
    }
  }
  return out
}

for (const file of collectSources(DESKTOP_SRC)) {
  const code = stripComments(read(file))
  for (const rule of STATIC_ELECTRON_PATTERNS) {
    if (rule.pattern.test(code))
      fail(
        `${file} binds Electron at build time via ${rule.label}; resolve it through loadElectron`,
      )
  }
}

if (existsSync('apps/desktop/src/window.ts')) {
  const win = read('apps/desktop/src/window.ts')
  checkSnippets(
    win,
    [
      'export async function loadElectron',
      "ELECTRON_WINDOW_MODULE = 'electron'",
      "ELECTRON_WINDOW_SYMBOL = 'BrowserWindow'",
      'import(specifier)',
      'export async function createBrowserWindow',
      'DEFAULT_WINDOW_WIDTH',
      'DEFAULT_WINDOW_HEIGHT',
      'contextIsolation',
      'nodeIntegration',
      'loadURL(',
      'ready-to-show',
    ],
    'window.ts',
  )
}

if (existsSync('apps/desktop/src/shell.ts')) {
  const shell = read('apps/desktop/src/shell.ts')
  checkSnippets(
    shell,
    ['export async function loadAgentStartFn', 'import(specifier)', 'buildAgentWebUrl('],
    'shell.ts',
  )
}

// 4. Built web cockpit the window loads must exist and be self-consistent.
const webIndex = join(WEB_DIST, 'index.html')
if (!existsSync(webIndex)) {
  fail(`missing built web cockpit: ${webIndex}; run "npm run build" before check:desktop-smoke`)
} else {
  const html = read(webIndex)
  if (!html.includes('id="root"')) fail(`${webIndex} is missing the #root mount element`)

  const moduleScript = /<script[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/.exec(html)
  if (!moduleScript) fail(`${webIndex} has no built module script entry`)
  else if (!moduleScript[1].startsWith('/'))
    fail(`${webIndex} module script must reference a root-relative asset`)

  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((match) => match[1])
  const local = new Set(refs.filter((ref) => !ref.startsWith('//')))
  if (local.size === 0) fail(`${webIndex} references no local assets`)
  for (const ref of local) {
    const assetPath = ref.split('?')[0].replace(/^\//, '')
    const resolved = join(WEB_DIST, assetPath)
    if (!existsSync(resolved)) fail(`${webIndex} references missing asset: ${ref}`)
  }

  const assetsDir = join(WEB_DIST, 'assets')
  if (!existsSync(assetsDir)) fail(`missing built asset directory: ${assetsDir}`)
  else if (!readdirSync(assetsDir).some((entry) => entry.endsWith('.js')))
    fail(`${assetsDir} contains no built JavaScript bundle`)

  const manifestPath = join(WEB_DIST, 'manifest.json')
  if (!existsSync(manifestPath)) fail(`missing copied web manifest: ${manifestPath}`)
  else {
    try {
      JSON.parse(read(manifestPath))
    } catch (error) {
      fail(`built web manifest is not valid JSON: ${error.message}`)
    }
  }
}

if (problems.length > 0) {
  const detail = problems.map((problem) => `- ${problem}`).join('\n')
  console.error(`Desktop smoke contract failed:\n${detail}`)
  process.exit(1)
}

console.log('desktop smoke contract ok')
