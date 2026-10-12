#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ROOT = resolve(HERE, '..')

export const SIGNING_ENV_KEYS = [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
]
export const PUBLISH_ENV_KEYS = ['GH_TOKEN', 'GITHUB_TOKEN']
export const CREDENTIAL_ENV_KEYS = [...SIGNING_ENV_KEYS, ...PUBLISH_ENV_KEYS]

export const DESKTOP_PACKAGE_NAME = '@termora/desktop-app'
export const BUILD_TOOLING = ['electron', 'electron-builder']

const PLATFORM_TARGETS = { darwin: 'mac', linux: 'linux', win32: 'win' }

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

export function resolveHostTarget(platform) {
  const target = PLATFORM_TARGETS[platform] ?? null
  return { platform, target, supported: target !== null }
}

export function findCredentialEnv(env = {}) {
  return CREDENTIAL_ENV_KEYS.filter((key) => Boolean(env[key]))
}

export function isReleaseIgnored(gitignoreText) {
  return gitignoreText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('!'))
    .map((line) => line.replace(/\/+$/, '').replace(/^\.\//, ''))
    .some((line) => line === 'release' || line === '**/release' || line.endsWith('/release'))
}

export function inspectDesktopLockfile(root) {
  const path = join(root, 'apps', 'desktop', 'package-lock.json')
  if (!existsSync(path)) {
    return { path, exists: false, valid: false, lockfileVersion: null, name: null }
  }
  try {
    const json = readJson(path)
    return {
      path,
      exists: true,
      valid: true,
      lockfileVersion: json.lockfileVersion ?? null,
      name: json.name ?? null,
    }
  } catch {
    return { path, exists: true, valid: false, lockfileVersion: null, name: null }
  }
}

export function resolveModuleUnderDesktop(root, specifier, platform = process.platform) {
  const desktopNodeModules = join(root, 'apps', 'desktop', 'node_modules')
  const packageJsonPath = join(desktopNodeModules, specifier, 'package.json')
  try {
    if (!existsSync(packageJsonPath)) {
      return { available: false, version: null, packageJsonPath, binary: null }
    }
    const packageJson = readJson(packageJsonPath)
    const binaryName = platform === 'win32' ? `${specifier}.cmd` : specifier
    const shim = join(desktopNodeModules, '.bin', binaryName)
    return {
      available: true,
      version: packageJson.version ?? null,
      packageJsonPath,
      binary: existsSync(shim) ? shim : null,
    }
  } catch {
    return { available: false, version: null, packageJsonPath, binary: null }
  }
}


export function runPreflight(options = {}) {
  const root = options.root ?? DEFAULT_ROOT
  const env = options.env ?? process.env
  const platform = options.platform ?? process.platform
  const strict = Boolean(options.strict)

  const blockers = []
  const problems = []
  const info = []

  const host = resolveHostTarget(platform)
  if (host.supported) {
    info.push(`host platform ${platform} -> artifact target ${host.target}`)
  } else {
    blockers.push(`unsupported host platform "${platform}" (expected darwin, linux, or win32)`)
  }

  const lockfile = inspectDesktopLockfile(root)
  if (!lockfile.exists) {
    blockers.push('missing apps/desktop/package-lock.json; desktop dependencies are not locked')
  } else if (!lockfile.valid) {
    blockers.push('apps/desktop/package-lock.json is not valid JSON')
  } else {
    if (!lockfile.lockfileVersion) blockers.push('apps/desktop lockfile has no lockfileVersion')
    if (lockfile.name !== DESKTOP_PACKAGE_NAME) {
      blockers.push(
        `apps/desktop lockfile name is "${lockfile.name}", expected "${DESKTOP_PACKAGE_NAME}"`,
      )
    }
    if (lockfile.lockfileVersion && lockfile.name === DESKTOP_PACKAGE_NAME) {
      info.push(`desktop lockfile v${lockfile.lockfileVersion} (${lockfile.name})`)
    }
  }

  const modules = {}
  for (const specifier of BUILD_TOOLING) {
    const resolved = resolveModuleUnderDesktop(root, specifier, platform)
    modules[specifier] = resolved
    if (resolved.available) {
      info.push(`${specifier} ${resolved.version ?? 'unknown'} under apps/desktop`)
    } else if (specifier === 'electron') {
      blockers.push(
        'electron is not installed under apps/desktop (run: npm --prefix apps/desktop install)',
      )
    } else {
      blockers.push(
        'electron-builder is not installed under apps/desktop; unsigned artifact builds cannot run yet',
      )
    }
  }
  const electron = modules.electron
  const electronBuilder = modules['electron-builder']

  const gitignorePath = join(root, '.gitignore')
  let releaseIgnored = false
  if (!existsSync(gitignorePath)) {
    blockers.push('missing .gitignore; cannot prove release/ is ignored')
  } else {
    releaseIgnored = isReleaseIgnored(readFileSync(gitignorePath, 'utf8'))
    if (releaseIgnored) info.push('release/ is git-ignored')
    else blockers.push('release/ is not ignored by .gitignore; local artifacts could be committed')
  }

  const credentials = findCredentialEnv(env)
  if (credentials.length > 0) {
    problems.push(`signing/publish credentials present in environment: ${credentials.join(', ')}`)
  } else {
    info.push('signing/publish environment is clean')
  }

  const exitCode = problems.length > 0 ? 2 : strict && blockers.length > 0 ? 1 : 0

  return {
    root,
    host,
    lockfile,
    electron,
    electronBuilder,
    releaseIgnored,
    credentials,
    blockers,
    problems,
    info,
    strict,
    exitCode,
  }
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/check-desktop-artifact-preflight.mjs [--strict] [--json] [--platform <darwin|linux|win32>] [--root <dir>]',
      '',
      'Deterministic preflight for real unsigned desktop artifact builds. It never builds,',
      'signs, notarizes, publishes, or touches the network. It verifies:',
      '  - host platform maps to a supported desktop target,',
      '  - apps/desktop/package-lock.json exists and matches @termora/desktop-app,',
      '  - electron and electron-builder resolve under apps/desktop,',
      '  - release/ is git-ignored,',
      '  - signing/publish credentials are absent from the environment.',
      '',
      'Advisory by default: missing prerequisites are reported as blockers and the exit code',
      'stays 0, so this is safe to run in CI before the toolchain exists. Pass --strict to make',
      'missing prerequisites fatal (exit 1). Present signing/publish credentials always fail (exit 2).',
    ].join('\n'),
  )
}

function printHuman(report) {
  console.log('Unsigned desktop artifact preflight (no build, no signing, no publishing).')
  console.log(
    report.strict
      ? 'Mode: --strict (missing prerequisites are fatal).\n'
      : 'Mode: advisory (missing prerequisites are reported only).\n',
  )
  for (const line of report.info) console.log(`  ok      ${line}`)
  for (const line of report.blockers) console.log(`  blocked ${line}`)
  for (const line of report.problems) console.log(`  failed  ${line}`)

  if (report.problems.length > 0) {
    console.log(`\npreflight refused: ${report.problems.length} safety problem(s); exit ${report.exitCode}.`)
  } else if (report.blockers.length === 0) {
    console.log('\npreflight ok: unsigned artifact prerequisites are present on this host.')
  } else {
    console.log(
      `\npreflight degraded: ${report.blockers.length} blocker(s); exit ${report.exitCode}. Unsigned artifact readiness is still pending/manual.`,
    )
  }
}

async function main(argv = process.argv.slice(2)) {
  const hasFlag = (name) => argv.includes(name)
  const readOption = (name) => {
    const index = argv.indexOf(name)
    return index === -1 ? undefined : argv[index + 1]
  }

  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage()
    return 0
  }

  const report = runPreflight({
    root: readOption('--root') ?? DEFAULT_ROOT,
    platform: readOption('--platform') ?? process.platform,
    strict: hasFlag('--strict'),
  })

  if (hasFlag('--json')) console.log(JSON.stringify(report, null, 2))
  else printHuman(report)

  return report.exitCode
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main().then((code) => process.exit(code))
}
