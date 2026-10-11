import { existsSync, readFileSync } from 'node:fs'

const REQUIRED_FILES = [
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/desktop/vitest.config.ts',
  'apps/desktop/src/main.ts',
  'apps/desktop/src/runtime-plan.ts',
  'apps/desktop/src/agent-host.ts',
  'apps/desktop/src/agent-lifecycle.ts',
  'apps/desktop/src/__tests__/desktop-shell.test.ts',
]

const ELECTRON_KEYS = ['electron', 'electron-builder', 'electron-builder-squirrel-windows']
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
    for (const key of ELECTRON_KEYS) {
      if (key in deps) fail(`desktop ${section} declares ${key}; scaffold must not claim packaging`)
    }
  }
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
}

if (problems.length > 0) {
  const detail = problems.map((p) => `- ${p}`).join('\n')
  console.error(`Desktop boundary contract failed:\n${detail}`)
  process.exit(1)
}

console.log('desktop boundary contract ok')
