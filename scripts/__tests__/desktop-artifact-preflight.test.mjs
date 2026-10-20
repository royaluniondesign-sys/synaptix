import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  findCredentialEnv,
  isReleaseIgnored,
  resolveHostTarget,
  resolveModuleUnderDesktop,
  runPreflight,
} from '../check-desktop-artifact-preflight.mjs'

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'check-desktop-artifact-preflight.mjs',
)
const CLEAN_ENV = { PATH: process.env.PATH }

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'synaptix-preflight-'))
  mkdirSync(join(root, 'apps', 'desktop'), { recursive: true })
  return root
}

function provisionReadyRoot(root) {
  writeFileSync(join(root, '.gitignore'), 'node_modules/\ndist/\nrelease/\n')
  writeFileSync(
    join(root, 'apps', 'desktop', 'package.json'),
    JSON.stringify({ name: '@synaptix/desktop-app' }),
  )
  writeFileSync(
    join(root, 'apps', 'desktop', 'package-lock.json'),
    JSON.stringify({ name: '@synaptix/desktop-app', lockfileVersion: 3 }),
  )
  const modules = join(root, 'apps', 'desktop', 'node_modules')
  for (const [name, version] of [
    ['electron', '44.0.0'],
    ['electron-builder', '26.0.0'],
  ]) {
    mkdirSync(join(modules, name), { recursive: true })
    writeFileSync(join(modules, name, 'package.json'), JSON.stringify({ name, version }))
  }
}

test('isReleaseIgnored recognizes release patterns and ignores negations', () => {
  assert.equal(isReleaseIgnored('node_modules/\nrelease/\n'), true)
  assert.equal(isReleaseIgnored('release\n'), true)
  assert.equal(isReleaseIgnored('build/**/release/\n'), true)
  assert.equal(isReleaseIgnored('# release/\ndist/\n'), false)
  assert.equal(isReleaseIgnored('!release/\n'), false)
})

test('findCredentialEnv flags signing and publish keys only', () => {
  assert.deepEqual(findCredentialEnv({ CSC_LINK: 'x', PATH: '/usr/bin' }), ['CSC_LINK'])
  assert.deepEqual(findCredentialEnv({ GITHUB_TOKEN: 'x' }), ['GITHUB_TOKEN'])
  assert.deepEqual(findCredentialEnv({ PATH: '/usr/bin' }), [])
})

test('resolveHostTarget maps supported platforms and rejects others', () => {
  assert.deepEqual(resolveHostTarget('darwin'), {
    platform: 'darwin',
    target: 'mac',
    supported: true,
  })
  assert.equal(resolveHostTarget('linux').target, 'linux')
  assert.equal(resolveHostTarget('win32').target, 'win')
  assert.equal(resolveHostTarget('aix').supported, false)
})

test('advisory preflight on an empty root exits 0 with blockers', () => {
  const root = makeRoot()
  try {
    const report = runPreflight({ root, env: {}, platform: 'darwin' })
    assert.equal(report.exitCode, 0)
    assert.ok(report.blockers.length > 0)
    assert.equal(report.problems.length, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('strict preflight on an empty root exits 1', () => {
  const root = makeRoot()
  try {
    const report = runPreflight({ root, env: {}, platform: 'darwin', strict: true })
    assert.equal(report.exitCode, 1)
    assert.ok(report.blockers.length > 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('preflight refuses with exit 2 when credentials are present', () => {
  const root = makeRoot()
  try {
    const report = runPreflight({ root, env: { CSC_LINK: 'secret' }, platform: 'darwin' })
    assert.equal(report.exitCode, 2)
    assert.deepEqual(report.credentials, ['CSC_LINK'])
    assert.equal(report.problems.length, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('provisioned root passes strict preflight', () => {
  const root = makeRoot()
  try {
    provisionReadyRoot(root)
    const report = runPreflight({ root, env: {}, platform: 'darwin', strict: true })
    assert.equal(report.exitCode, 0, report.blockers.join('; '))
    assert.equal(report.releaseIgnored, true)
    assert.equal(report.electron.available, true)
    assert.equal(report.electronBuilder.available, true)
    assert.equal(report.host.target, 'mac')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})


test('resolveModuleUnderDesktop rejects root-hoisted dependencies', () => {
  const root = makeRoot()
  try {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'root' }))
    writeFileSync(join(root, 'apps', 'desktop', 'package.json'), JSON.stringify({ name: '@synaptix/desktop-app' }))
    const rootElectron = join(root, 'node_modules', 'electron')
    mkdirSync(rootElectron, { recursive: true })
    writeFileSync(join(rootElectron, 'package.json'), JSON.stringify({ name: 'electron', version: '44.0.0' }))
    const resolved = resolveModuleUnderDesktop(root, 'electron', 'linux')
    assert.equal(resolved.available, false)
    assert.match(resolved.packageJsonPath ?? '', /apps\/desktop\/node_modules\/electron\/package\.json$/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('resolveModuleUnderDesktop accepts only apps/desktop node_modules', () => {
  const root = makeRoot()
  try {
    provisionReadyRoot(root)
    const resolved = resolveModuleUnderDesktop(root, 'electron', 'linux')
    assert.equal(resolved.available, true)
    assert.match(resolved.packageJsonPath ?? '', /apps\/desktop\/node_modules\/electron\/package\.json$/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('cli --help exits 0 and prints usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
    env: CLEAN_ENV,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /preflight/i)
})

test('cli --json advisory exits 0 with a parseable report', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--json'], {
    env: CLEAN_ENV,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(typeof report.exitCode, 'number')
  assert.ok(Array.isArray(report.blockers))
  assert.ok(Array.isArray(report.problems))
})

test('cli --strict exits 1 on a bare root', () => {
  const root = makeRoot()
  try {
    const result = spawnSync(process.execPath, [SCRIPT, '--strict', '--root', root], {
      env: CLEAN_ENV,
      encoding: 'utf8',
    })
    assert.equal(result.status, 1, result.stderr)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
