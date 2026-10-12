#!/usr/bin/env node
// Smoke test for a packaged Termora desktop build (Linux, macOS or Windows).
//
// Launches the packaged app (a Linux .AppImage, or the unpacked app of any
// platform) with a throwaway home directory (under a virtual display on Linux), waits for the embedded agent
// to answer /api/health, checks that the web cockpit is served and that
// /api/info reports a real version (not 0.0.0), then stops the
// app. Prints a JSON evidence record and exits non-zero on any failure.
//
// It runs the app only; it never signs, uploads, or publishes anything.
//
// Usage: node scripts/smoke-desktop.mjs [path-to-app-binary-or-AppImage] [--timeout-ms 120000]
//
// Without a path it looks in apps/desktop/release/desktop for the build of the
// current platform: *.AppImage (Linux), mac*/Termora.app (macOS) or
// win-unpacked/Termora.exe (Windows).

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const timeoutIndex = args.indexOf('--timeout-ms')
const timeoutMs = timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) : 120_000
const positional = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--timeout-ms')

function findArtifact() {
  if (positional[0]) return resolve(positional[0])
  const dir = resolve('apps/desktop/release/desktop')
  if (!existsSync(dir)) return null
  const entries = readdirSync(dir)
  if (process.platform === 'linux') {
    const hit = entries.find((name) => name.endsWith('.AppImage'))
    return hit ? join(dir, hit) : null
  }
  if (process.platform === 'darwin') {
    for (const name of entries.filter((entry) => entry.startsWith('mac'))) {
      const binary = join(dir, name, 'Termora.app', 'Contents', 'MacOS', 'Termora')
      if (existsSync(binary)) return binary
    }
    return null
  }
  const binary = join(dir, 'win-unpacked', 'Termora.exe')
  return existsSync(binary) ? binary : null
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePort(port))
    })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000) })
    return { status: res.status, body: await res.text() }
  } catch {
    return null
  }
}

const artifact = findArtifact()
if (!artifact || !existsSync(artifact)) {
  console.error('smoke-desktop: no packaged app found; build one with `node scripts/package-desktop-unsigned.mjs --target <linux|mac|win> --run`')
  process.exit(2)
}

// Windows: overriding USERPROFILE makes the packaged app crash at startup (0x80000003, no log),
// so the app runs with the real profile and its ~/.termora data. Only do that on a throwaway CI
// runner, or when explicitly asked.
if (process.platform === 'win32' && !process.env.CI && !process.argv.includes('--allow-real-home')) {
  console.error('smoke-desktop: on Windows this test uses the real user profile; run it in CI or pass --allow-real-home')
  process.exit(2)
}

const port = await freePort()
const home = mkdtempSync(join(tmpdir(), 'termora-smoke-'))
const isAppImage = artifact.endsWith('.AppImage')
// GUI-subsystem builds (Windows) write nothing to stdout, so Chromium logs to a file we can read on failure.
const electronLog = join(home, 'electron.log')
const appArgs = [...(isAppImage ? ['--appimage-extract-and-run'] : []), '--no-sandbox', '--disable-gpu', '--enable-logging', `--log-file=${electronLog}`]
// Only Linux needs a virtual display; macOS and Windows runners have a session.
const needsVirtualDisplay = process.platform === 'linux' && !process.env.DISPLAY
const [command, commandArgs] = needsVirtualDisplay
  ? ['xvfb-run', ['-a', artifact, ...appArgs]]
  : [artifact, appArgs]

const child = spawn(command, commandArgs, {
  // The agent keeps its data under the home directory; point HOME at a throwaway one (not on Windows, see above).
  env: { ...process.env, ...(process.platform === 'win32' ? {} : { HOME: home }), TERMORA_PORT: String(port), NODE_OPTIONS: '', ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
})
let log = ''
const collect = (chunk) => { log = (log + chunk.toString()).slice(-20_000) }
child.stdout.on('data', collect)
child.stderr.on('data', collect)
let exited = null
child.on('exit', (code, signal) => { exited = { code, signal } })

const base = `http://127.0.0.1:${port}`
const startedAt = Date.now()
const checks = { health: null, webUi: null, version: null }
let failure = null

while (Date.now() - startedAt < timeoutMs) {
  if (exited) { failure = `app exited early (code ${exited.code}, signal ${exited.signal})`; break }
  const health = await probe(`${base}/api/health`)
  if (health?.status === 200) {
    checks.health = { status: 200, body: health.body.slice(0, 200) }
    const root = await probe(`${base}/`)
    checks.webUi = root ? { status: root.status, html: /<html|<!doctype html/i.test(root.body) } : null
    const info = await probe(`${base}/api/info`)
    try { checks.version = JSON.parse(info?.body ?? '{}').version ?? null } catch { checks.version = null }
    break
  }
  await sleep(1_000)
}

if (!failure && !checks.health) failure = `agent did not answer /api/health within ${timeoutMs} ms`
if (!failure && !(checks.webUi?.status === 200 && checks.webUi.html)) failure = 'web cockpit was not served at /'
if (!failure && (!checks.version || checks.version === '0.0.0')) failure = `/api/info reports version ${JSON.stringify(checks.version)}; expected the app version`

function stopApp(signal) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'])
    return
  }
  try { process.kill(-child.pid, signal) } catch { /* already gone */ }
}
stopApp('SIGTERM')
await sleep(1_500)
stopApp('SIGKILL')
if (failure && existsSync(electronLog)) log += `\n--- electron.log ---\n${readFileSync(electronLog, 'utf8').slice(-8_000)}`
rmSync(home, { recursive: true, force: true })

const evidence = {
  artifact,
  platform: process.platform,
  kind: isAppImage ? 'AppImage' : 'unpacked',
  port,
  ok: !failure,
  failure,
  checks,
  elapsedMs: Date.now() - startedAt,
  logTail: failure ? log.split('\n').slice(-40).join('\n') : undefined,
}
console.log(JSON.stringify(evidence, null, 2))
process.exit(failure ? 1 : 0)
