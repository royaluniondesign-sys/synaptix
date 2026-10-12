#!/usr/bin/env node
// Stages a self-contained Electron app directory (apps/desktop/stage) that
// electron-builder packages. The monorepo layout cannot be packaged directly:
// the agent resolves the web UI and its version relative to its own location,
// and native modules must be installed where electron-builder rebuilds them.
//
// Layout produced (mirrors the relative lookups in packages/agent/src/server.ts):
//   stage/package.json                      app manifest (main -> desktop/dist/electron-main.js)
//   stage/desktop/dist/                     compiled Electron main + preload
//   stage/vendor/termora-agent/             compiled agent (installed as @termora/agent)
//   stage/vendor/termora-web/dist/          built web cockpit (installed as @termora/web)
//   stage/node_modules/@termora/{agent,web} copies made by `npm install --install-links`
//   stage/cli/                              compiled CLI (copied to resources by the builder config)
//
// electron-builder only packages dependencies declared in the app's package.json,
// so the agent and web UI are declared as file: dependencies instead of being
// copied into node_modules by hand (which electron-builder silently drops).
//
// Requires `npm run build` (root) and `npm --prefix apps/desktop run build` first.
// It installs production dependencies with npm; it does not sign or publish.

import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(here, '..')
const repoRoot = resolve(appDir, '..', '..')
const stage = join(appDir, 'stage')

const sources = {
  desktopDist: join(appDir, 'dist'),
  agentDist: join(repoRoot, 'packages', 'agent', 'dist'),
  agentPkg: join(repoRoot, 'packages', 'agent', 'package.json'),
  webDist: join(repoRoot, 'packages', 'web', 'dist'),
  cliDist: join(repoRoot, 'packages', 'cli', 'dist'),
}

const missing = Object.entries(sources).filter(([, path]) => !existsSync(path))
if (missing.length > 0) {
  console.error('stage-app: missing build output (run `npm run build` and `npm --prefix apps/desktop run build`):')
  for (const [name, path] of missing) console.error(`  ${name}: ${path}`)
  process.exit(1)
}

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
const agentPkg = JSON.parse(readFileSync(sources.agentPkg, 'utf8'))

rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

// Vendored local packages. The agent keeps no dependencies of its own here: its
// third-party dependencies are declared once, in the app manifest below.
const vendor = join(stage, 'vendor')
const agentVendor = join(vendor, 'termora-agent')
const webVendor = join(vendor, 'termora-web')
mkdirSync(agentVendor, { recursive: true })
mkdirSync(webVendor, { recursive: true })
cpSync(sources.agentDist, join(agentVendor, 'dist'), { recursive: true })
const { dependencies: _agentDeps, devDependencies: _agentDevDeps, scripts: _agentScripts, ...agentManifest } = agentPkg
writeFileSync(join(agentVendor, 'package.json'), `${JSON.stringify(agentManifest, null, 2)}\n`)
cpSync(sources.webDist, join(webVendor, 'dist'), { recursive: true })
writeFileSync(
  join(webVendor, 'package.json'),
  `${JSON.stringify({ name: '@termora/web', version: rootPkg.version, private: true }, null, 2)}\n`,
)

const manifest = {
  name: 'termora',
  productName: 'Termora',
  version: rootPkg.version,
  description: rootPkg.description,
  author: { name: 'Termora contributors', email: 'noreply@termora.dev' },
  homepage: rootPkg.homepage,
  license: rootPkg.license,
  type: 'module',
  main: 'desktop/dist/electron-main.js',
  // Third-party runtime dependencies of the agent; electron-builder rebuilds the
  // native ones (better-sqlite3, node-pty) against Electron's ABI.
  dependencies: {
    ...agentPkg.dependencies,
    '@termora/agent': 'file:vendor/termora-agent',
    '@termora/web': 'file:vendor/termora-web',
  },
}
writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log('stage-app: installing production dependencies (no scripts; electron-builder rebuilds natives)')
const install = spawnSync(
  'npm',
  ['install', '--omit=dev', '--ignore-scripts', '--install-links', '--no-audit', '--no-fund'],
  { cwd: stage, stdio: 'inherit', shell: process.platform === 'win32' },
)
if (install.status !== 0) process.exit(install.status ?? 1)

// npm drops execute bits and the install ran with --ignore-scripts, so node-pty's
// spawn-helper (macOS/Linux) must be made executable again or terminals fail
// with "posix_spawnp failed". electron-builder keeps file modes when packaging.
if (process.platform !== 'win32') {
  const ptyDir = join(stage, 'node_modules', 'node-pty')
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : name === 'spawn-helper' ? [full] : []
  })
  if (existsSync(ptyDir)) for (const helper of walk(ptyDir)) chmodSync(helper, 0o755)
}

cpSync(sources.desktopDist, join(stage, 'desktop', 'dist'), { recursive: true })
cpSync(sources.cliDist, join(stage, 'cli'), { recursive: true })

console.log(`stage-app: staged Termora ${rootPkg.version} at ${stage}`)
