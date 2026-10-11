#!/usr/bin/env node
// Real Electron launch smoke (local/manual, plus a safe no-GUI fallback).
//
// This is the runtime companion to scripts/check-desktop-smoke.mjs, which is a
// pure static contract that never touches Electron. This script answers a
// different question: can the desktop app actually boot a real Electron process
// once the dependency is installed? It:
//   1. resolves the Electron binary from apps/desktop/node_modules or the
//      workspace root (it never adds Electron to any package.json),
//   2. resolves the desktop main + preload entry points and the built web dist,
//   3. runs `electron --version` when the binary exists, and
//   4. runs a minimal `app.whenReady()` smoke only when a display is available.
//
// Guardrails (matching the rest of the desktop scaffold):
//   - never signs, notarizes, uploads, or makes store claims,
//   - no network, no secrets, no non-dev dependencies,
//   - degrades cleanly when Electron or the web build is absent: absent pieces
//     are reported as blockers and the process still exits 0, so it is safe to
//     run on any host. Pass --require-electron to make an absent Electron (or a
//     failed whenReady smoke with a display) a hard failure once the dependency
//     has been added.
//
// Usage:
//   node scripts/smoke-desktop-launch.mjs [--require-electron] [--no-gui] [--gui] [--json]

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the repo root from this file (scripts/..) so the smoke works both from
// the repo root and from apps/desktop (npm --prefix sets cwd to the package dir).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP_DIR = join(ROOT, 'apps', 'desktop')
const WEB_DIST = join(ROOT, 'packages', 'web', 'dist')
const ELECTRON_PACKAGE = 'electron'
const READY_MARKER = 'termora-electron-ready'
const DEFAULT_TIMEOUT_MS = 20_000

const args = process.argv.slice(2)
const hasFlag = (name) => args.includes(name)
const readOption = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const requireFrom = createRequire(join(ROOT, 'package.json'))

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const rel = (path) => path.replace(`${ROOT}/`, '')

function printUsage() {
  console.log(
    [
      'Usage: node scripts/smoke-desktop-launch.mjs [--require-electron] [--no-gui] [--gui] [--json]',
      '',
      '  --require-electron  Fail (exit 1) when Electron or the web build is missing, or',
      '                      when the whenReady smoke fails while a display is available.',
      '  --no-gui            Never launch Electron; only resolve + `electron --version`.',
      '  --gui               Attempt the whenReady smoke even if no display is detected.',
      '  --json              Print a machine-readable report instead of the summary.',
      '  --timeout <ms>      Per-spawn timeout (default ' + DEFAULT_TIMEOUT_MS + ').',
      '',
      'Without --require-electron, missing pieces are reported as blockers and the exit code',
      'stays 0, so this is safe to run before Electron is installed or before the web build.',
    ].join('\n'),
  )
}

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage()
  process.exit(0)
}

const strict = hasFlag('--require-electron') || hasFlag('--strict')
const json = hasFlag('--json')
const runGuiRequested = !hasFlag('--no-gui')
const forceGui = hasFlag('--gui')
const timeoutMs = Number(readOption('--timeout') ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS

const blockers = []
const problems = []
const info = []
const block = (message) => blockers.push(message)
const fail = (message) => problems.push(message)

// 1. Resolve the Electron binary without declaring it anywhere.
function resolveElectron() {
  let packageJson
  try {
    packageJson = requireFrom.resolve(`${ELECTRON_PACKAGE}/package.json`, {
      paths: [DESKTOP_DIR, ROOT],
    })
  } catch {
    return {
      available: false,
      reason: `${ELECTRON_PACKAGE} is not installed in apps/desktop or root`,
    }
  }

  const moduleDir = dirname(packageJson)
  const version = (() => {
    try {
      return readJson(packageJson).version
    } catch {
      return null
    }
  })()

  // The `electron` package records the binary path in path.txt relative to the
  // package directory (e.g. dist/electron, dist/Electron.app/Contents/MacOS/Electron).
  const pathFile = join(moduleDir, 'path.txt')
  let binary = null
  if (existsSync(pathFile)) {
    const recorded = readFileSync(pathFile, 'utf8').trim()
    if (recorded) {
      const candidate = isAbsolute(recorded) ? recorded : resolve(moduleDir, recorded)
      if (existsSync(candidate)) binary = candidate
    }
  }

  if (!binary) {
    const shim = join(
      ROOT,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'electron.cmd' : 'electron',
    )
    if (existsSync(shim)) binary = shim
  }

  if (!binary) {
    return {
      available: false,
      version,
      reason: `${ELECTRON_PACKAGE} resolved but no runnable binary found (is the postinstall download complete?)`,
    }
  }
  return { available: true, moduleDir, version, binary }
}

const electron = resolveElectron()
if (!electron.available) {
  block(`Electron runtime unavailable: ${electron.reason}`)
} else {
  info.push(
    `electron binary: ${rel(electron.binary)}${electron.version ? ` (v${electron.version})` : ''}`,
  )
}

// 2. Resolve the desktop main + preload entries and the built web cockpit.
function resolveEntry(candidates) {
  for (const candidate of candidates) {
    if (existsSync(join(DESKTOP_DIR, candidate))) return candidate
  }
  return null
}

let desktopMain = null
let desktopPreload = null
if (!existsSync(join(DESKTOP_DIR, 'package.json'))) {
  fail(`missing desktop package.json at ${rel(join(DESKTOP_DIR, 'package.json'))}`)
} else {
  let desktopPkg
  try {
    desktopPkg = readJson(join(DESKTOP_DIR, 'package.json'))
  } catch (error) {
    fail(`could not parse apps/desktop/package.json: ${error.message}`)
  }
  if (desktopPkg) {
    const mainCandidates = [
      ...(typeof desktopPkg.main === 'string' ? [desktopPkg.main] : []),
      'dist/main.js',
      'dist/main.mjs',
      'dist/main.cjs',
      'src/main.ts',
      'src/main.js',
    ]
    desktopMain = resolveEntry(mainCandidates)
    if (!desktopMain && typeof desktopPkg.main === 'string') {
      fail(`declared desktop main "${desktopPkg.main}" does not resolve to a file`)
    } else if (!desktopMain) {
      block('desktop main entry not built yet (no package.json "main" and no dist/main.*)')
    }

    desktopPreload = resolveEntry([
      'dist/preload.js',
      'dist/preload.mjs',
      'dist/preload.cjs',
      'src/preload.ts',
      'src/preload.js',
    ])
    if (!desktopPreload) {
      block('desktop preload entry not built yet (no dist/preload.* or src/preload.*)')
    }
  }
}

if (desktopMain) info.push(`main entry: ${rel(join(DESKTOP_DIR, desktopMain))}`)
if (desktopPreload) info.push(`preload entry: ${rel(join(DESKTOP_DIR, desktopPreload))}`)

const webIndex = join(WEB_DIST, 'index.html')
const webDistReady = existsSync(webIndex)
if (!webDistReady) {
  block(`built web cockpit missing at ${rel(webIndex)}; run "npm run build"`)
} else {
  info.push(`web cockpit: ${rel(webIndex)}`)
}

// 3. Version probe: proves the binary is runnable independent of a display.
// ELECTRON_RUN_AS_NODE is any non-empty value triggers Node mode in Electron,
// so strip it from the child env rather than setting it to "0".
const childEnv = { ...process.env }
delete childEnv.ELECTRON_RUN_AS_NODE

let versionProbe = { ran: false, ok: false, version: null, detail: null }
if (electron.available) {
  const result = spawnSync(electron.binary, ['--version'], {
    timeout: timeoutMs,
    encoding: 'utf8',
    env: childEnv,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (result.error) {
    versionProbe = { ran: true, ok: false, version: electron.version, detail: result.error.message }
    block(`\`electron --version\` could not run: ${result.error.message}`)
  } else if (result.status !== 0) {
    versionProbe = {
      ran: true,
      ok: false,
      version: electron.version,
      detail: output || `exit ${result.status}`,
    }
    block(`\`electron --version\` exited ${result.status}: ${output || 'no output'}`)
  } else {
    versionProbe = { ran: true, ok: true, version: output || electron.version, detail: null }
    info.push(`electron --version -> ${output || electron.version}`)
  }
}

// 4. Guarded whenReady smoke: only when a display is available (or forced).
function hasDisplay() {
  if (process.platform !== 'linux') return true
  return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY)
}

const displayAvailable = hasDisplay()
let gui = { attempted: false, ok: false, skipped: null, detail: null }

if (!runGuiRequested) {
  gui.skipped = '--no-gui passed'
} else if (!electron.available) {
  gui.skipped = 'Electron runtime unavailable'
} else if (!displayAvailable && !forceGui) {
  gui.skipped = 'no display detected (headless CI); pass --gui to force an attempt'
} else {
  gui.attempted = true
  const smokeScript = [
    `const { app } = require('electron')`,
    `app.whenReady().then(() => { console.log('${READY_MARKER}'); app.quit() })`,
    '',
  ].join('\n')
  const smokeFile = join(tmpdir(), `termora-electron-ready-${process.pid}.cjs`)
  try {
    writeFileSync(smokeFile, smokeScript)
    const result = spawnSync(electron.binary, [smokeFile, '--no-sandbox'], {
      timeout: timeoutMs,
      encoding: 'utf8',
      env: { ...childEnv, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
    })
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    if (result.error) {
      gui.detail = result.error.message
      fail(`whenReady smoke could not run: ${result.error.message}`)
    } else if (output.includes(READY_MARKER)) {
      gui.ok = true
      info.push('app.whenReady() smoke ok')
    } else {
      gui.detail = output.trim() || `exit ${result.status}`
      fail(`whenReady smoke did not reach ready (exit ${result.status}): ${gui.detail}`)
    }
  } finally {
    rmSync(smokeFile, { force: true })
  }
}

// Report.
const report = {
  electron: {
    available: electron.available,
    version: electron.version,
    binary: electron.available ? rel(electron.binary) : null,
    reason: electron.available ? null : electron.reason,
  },
  entries: { main: desktopMain, preload: desktopPreload, webDistReady },
  versionProbe,
  gui,
  blockers,
  problems,
  exitCode: problems.length > 0 || (strict && blockers.length > 0) ? 1 : 0,
}

if (json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('Real Electron launch smoke (no signing, no store claims, no network).')
  console.log(
    strict
      ? 'Mode: --require-electron (absent/failed pieces are fatal).\n'
      : 'Mode: advisory (missing pieces degrade cleanly).\n',
  )
  for (const line of info) console.log(`  ok      ${line}`)
  for (const line of blockers) console.log(`  blocked ${line}`)
  for (const line of problems) console.log(`  failed  ${line}`)
  if (gui.skipped) console.log(`  skipped whenReady smoke: ${gui.skipped}`)

  if (problems.length === 0 && blockers.length === 0) {
    console.log('\nlaunch smoke ok: Electron boots and the desktop pieces resolve.')
  } else if (problems.length === 0) {
    console.log(
      `\nlaunch smoke degraded: ${blockers.length} blocker(s); exit ${
        report.exitCode
      }. Real Electron readiness is still pending/manual.`,
    )
  } else {
    console.log(`\nlaunch smoke failed: ${problems.length} problem(s); exit ${report.exitCode}.`)
  }
}

process.exit(report.exitCode)
