#!/usr/bin/env node
// Stages a self-contained Electron app directory (apps/desktop/stage) that
// electron-builder packages. The monorepo layout cannot be packaged directly:
// the agent resolves the web UI and its version relative to its own location,
// and native modules must be installed where electron-builder rebuilds them.
//
// Layout produced (mirrors the relative lookups in packages/agent/src/server.ts):
//   stage/package.json                      app manifest (main -> desktop/dist/electron-main.js)
//   stage/desktop/dist/                     compiled Electron main + preload
//   stage/node_modules/@termora/agent/      compiled agent + its package.json
//   stage/node_modules/@termora/web/dist/   built web cockpit
//   stage/node_modules/package.json         version file the agent reads
//   stage/cli/                              compiled CLI (copied to resources by the builder config)
//
// Requires `npm run build` (root) and `npm --prefix apps/desktop run build` first.
// It installs production dependencies with npm; it does not sign or publish.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  // Production dependencies of the agent: electron-builder rebuilds the native
  // ones (better-sqlite3, node-pty) against Electron's ABI.
  dependencies: agentPkg.dependencies,
}
writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log('stage-app: installing production dependencies (no scripts; electron-builder rebuilds natives)')
const install = spawnSync('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: stage,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (install.status !== 0) process.exit(install.status ?? 1)

cpSync(sources.desktopDist, join(stage, 'desktop', 'dist'), { recursive: true })
const agentTarget = join(stage, 'node_modules', '@termora', 'agent')
mkdirSync(agentTarget, { recursive: true })
cpSync(sources.agentDist, join(agentTarget, 'dist'), { recursive: true })
cpSync(sources.agentPkg, join(agentTarget, 'package.json'))
cpSync(sources.webDist, join(stage, 'node_modules', '@termora', 'web', 'dist'), { recursive: true })
writeFileSync(join(stage, 'node_modules', 'package.json'), `${JSON.stringify({ name: 'termora-runtime', version: rootPkg.version }, null, 2)}\n`)
cpSync(sources.cliDist, join(stage, 'cli'), { recursive: true })

console.log(`stage-app: staged Termora ${rootPkg.version} at ${stage}`)
