#!/usr/bin/env node
// Deterministic Electron launcher helper for the Termora desktop app.
//
// Electron cannot be installed in root CI (apps/desktop is intentionally
// outside root workspaces), and a GUI cannot be smoke-tested headlessly, so this
// helper is dry-run by default: it prints the exact command to launch the real
// main entry and reports whether the Electron runtime is present. Pass --run to
// actually spawn Electron on a machine where it is installed and `npm run
// build` has produced dist/. It never signs, notarizes, publishes, or touches
// secrets.

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(here, '..')

const MAIN_ENTRY = 'dist/electron-main.js'
const PRELOAD_ENTRY = 'dist/preload.js'
const binaryName = process.platform === 'win32' ? 'electron.cmd' : 'electron'
const electronBin = join(appDir, 'node_modules', '.bin', binaryName)

const args = process.argv.slice(2)
const hasFlag = (name) => args.includes(name)

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(
    [
      'Usage: node scripts/launch-electron.mjs [--run]',
      '',
      'Dry-run by default: prints the exact Electron launch command and whether the',
      'runtime is installed. Pass --run to spawn Electron (requires an installed',
      'Electron in apps/desktop and a built dist/).',
      '',
      'Blocker: apps/desktop is outside root workspaces, so Electron is not installed',
      'by root npm ci and no GUI launch is smoke-tested in CI.',
    ].join('\n'),
  )
  process.exit(0)
}

const run = hasFlag('--run')
const installed = existsSync(electronBin)
const mainBuilt = existsSync(join(appDir, MAIN_ENTRY))
const preloadBuilt = existsSync(join(appDir, PRELOAD_ENTRY))
const launchCommand = ['electron', MAIN_ENTRY]

console.log('Termora desktop unsigned launcher (dry-run unless --run is passed).')
console.log('No signing, notarization, publishing, secrets, or store claims.\n')
console.log(`  app dir:        ${appDir}`)
console.log(`  main entry:     ${MAIN_ENTRY}${mainBuilt ? ' (built)' : ' (missing)'}`)
console.log(`  preload entry:  ${PRELOAD_ENTRY}${preloadBuilt ? ' (built)' : ' (missing)'}`)
console.log(`  electron bin:   ${electronBin}${installed ? ' (installed)' : ' (not installed)'}`)
console.log(`  launch command: ${launchCommand.join(' ')}\n`)

if (!installed) {
  console.error(
    [
      'Electron is not installed in apps/desktop; the real GUI launch cannot run here.',
      'This is expected: apps/desktop stays outside root workspaces so root CI never',
      'pulls a desktop runtime. To launch on a dev machine:',
      '',
      `  cd apps/desktop && npm install && npm run build && npm run launch:run`,
      '',
      'Blocker: no installed-app GUI smoke test has run on any platform; readiness',
      'stays gated (see docs/platform-readiness-checklist.md).',
    ].join('\n'),
  )
  process.exit(2)
}

if (!run) {
  console.log('Dry run complete. Re-run with --run to spawn Electron.')
  process.exit(0)
}

if (!mainBuilt) {
  console.error(
    `Cannot launch: ${MAIN_ENTRY} is missing. Run "npm run build" in apps/desktop first.`,
  )
  process.exit(1)
}

const result = spawnSync(electronBin, [MAIN_ENTRY], { cwd: appDir, stdio: 'inherit' })
process.exit(result.status ?? 1)
