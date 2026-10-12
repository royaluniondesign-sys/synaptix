#!/usr/bin/env node
// Unsigned local desktop artifact helper.
//
// This script never signs, notarizes, or publishes. It runs in dry-run mode
// unless --run is passed, refuses to build when signing/notarization/publish
// credentials are present in the environment, and always passes
// `--publish never` to electron-builder. Artifacts it produces are explicitly
// unsigned local builds named pending/manual, never store-ready releases.

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'desktop')

const SIGNING_ENV_KEYS = [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
]
const PUBLISH_ENV_KEYS = ['GH_TOKEN', 'GITHUB_TOKEN']
const ALL_REFUSED_ENV_KEYS = [...SIGNING_ENV_KEYS, ...PUBLISH_ENV_KEYS]

const TARGETS = [
  {
    id: 'mac',
    host: 'darwin',
    flag: '--mac',
    formats: 'dmg zip',
    outputs: ['release/desktop/*.dmg', 'release/desktop/*.zip'],
    status: 'pending/manual',
    evidence: 'Unsigned local dmg/zip launches the agent and serves the web UI on macOS',
  },
  {
    id: 'win',
    host: 'win32',
    flag: '--win',
    formats: 'nsis',
    outputs: ['release/desktop/*-setup.exe'],
    status: 'pending/manual',
    evidence: 'Native modules rebuilt; unsigned NSIS installer starts the agent on Windows',
  },
  {
    id: 'linux',
    host: 'linux',
    flag: '--linux',
    formats: 'AppImage deb',
    outputs: ['release/desktop/*.AppImage', 'release/desktop/*.deb'],
    status: 'pending/manual',
    evidence: 'node-pty/better-sqlite3 runtime verified on Linux for AppImage and deb',
  },
]

const args = process.argv.slice(2)
const hasFlag = (name) => args.includes(name)
const readOption = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const printUsage = () => {
  console.log(
    [
      'Usage: node scripts/package-desktop-unsigned.mjs [--target <mac|win|linux|all>] [--run]',
      '',
      'Dry-run by default: prints the exact unsigned electron-builder commands without running.',
      'Pass --run to execute on the matching host platform only. Never signs and never publishes.',
      '',
      'Targets (all unsigned, pending/manual):',
      ...TARGETS.map((t) => `  ${t.id.padEnd(5)} ${t.flag} -> ${t.formats}  (${t.host})`),
    ].join('\n'),
  )
}

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage()
  process.exit(0)
}

const requested = readOption('--target') ?? 'all'
if (requested !== 'all' && !TARGETS.some((target) => target.id === requested)) {
  console.error(`Unknown --target "${requested}". Expected mac, win, linux, or all.`)
  process.exit(1)
}

const selected = requested === 'all' ? TARGETS : TARGETS.filter((t) => t.id === requested)
const run = hasFlag('--run')

const refusals = [
  ...SIGNING_ENV_KEYS.filter((key) => Boolean(process.env[key])),
  ...(run ? PUBLISH_ENV_KEYS.filter((key) => Boolean(process.env[key])) : []),
]
if (refusals.length > 0) {
  console.error(
    [
      'Refusing to package: signing/notarization/publish credentials are present.',
      `Unset these before building unsigned local artifacts: ${refusals.join(', ')}`,
      'This helper only produces unsigned local artifacts and must not touch release credentials.',
    ].join('\n'),
  )
  process.exit(2)
}

const childEnv = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
for (const key of ALL_REFUSED_ENV_KEYS) delete childEnv[key]

const commandFor = (target) => [
  'npx',
  '--no-install',
  'electron-builder',
  target.flag,
  '--config',
  'electron-builder.config.cjs',
  '--publish',
  'never',
]

console.log('Unsigned local desktop packaging (dry-run unless --run is passed).')
console.log('No signing, notarization, or publishing is performed by this helper.\n')

for (const target of selected) {
  console.log(`[${target.id}] status: ${target.status} (${target.host} host)`)
  console.log(`  command: ${commandFor(target).join(' ')}`)
  console.log(`  formats: ${target.formats}`)
  console.log(`  outputs: ${target.outputs.join(', ')}`)
  console.log(`  next evidence required: ${target.evidence}\n`)
}

if (!run) {
  console.log(
    'Dry run complete. Re-run with --run on the matching host to build unsigned artifacts.',
  )
  process.exit(0)
}

const hostTargets = selected.filter((target) => target.host === process.platform)
if (hostTargets.length === 0) {
  console.error(
    `Cannot build for ${selected.map((t) => t.id).join(', ')} on ${process.platform}; run on the matching host.`,
  )
  process.exit(1)
}

const probe = spawnSync('npx', ['--no-install', 'electron-builder', '--version'], {
  env: childEnv,
  cwd: desktopDir,
  stdio: 'pipe',
  encoding: 'utf8',
})
if (probe.status !== 0) {
  console.error(
    [
      'electron-builder is not installed in this workspace; unsigned packaging is pending/manual.',
      'Install it in the desktop app when ready, then re-run:',
      `  ${commandFor(hostTargets[0]).join(' ')}`,
      'Blockers: Electron runtime is intentionally absent from the scaffold; see docs/platform-readiness-checklist.md.',
    ].join('\n'),
  )
  process.exit(1)
}

let failed = false
for (const target of hostTargets) {
  const command = commandFor(target)
  console.log(`\nRunning unsigned ${target.id} build: ${command.join(' ')}`)
  const result = spawnSync(command[0], command.slice(1), { env: childEnv, stdio: 'inherit', cwd: desktopDir })
  if (result.status !== 0) failed = true
}

process.exit(failed ? 1 : 0)
