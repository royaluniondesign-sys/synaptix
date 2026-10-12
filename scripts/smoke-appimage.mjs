#!/usr/bin/env node
// Smoke test for a packaged Termora Linux build.
//
// Launches the packaged app (an .AppImage, or an unpacked `termora` binary)
// under a virtual display with a throwaway HOME, waits for the embedded agent
// to answer /api/health, checks that the web cockpit is served and that
// /api/info reports a real version (not 0.0.0), then stops the
// app. Prints a JSON evidence record and exits non-zero on any failure.
//
// It runs the app only; it never signs, uploads, or publishes anything.
//
// Usage: node scripts/smoke-appimage.mjs [path-to-AppImage-or-binary] [--timeout-ms 120000]

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
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
  const hit = readdirSync(dir).find((name) => name.endsWith('.AppImage'))
  return hit ? join(dir, hit) : null
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
  console.error('smoke-appimage: no artifact found; build one with `npm run package:desktop:unsigned -- --target linux --run`')
  process.exit(2)
}

const port = await freePort()
const home = mkdtempSync(join(tmpdir(), 'termora-smoke-'))
const isAppImage = artifact.endsWith('.AppImage')
const appArgs = [...(isAppImage ? ['--appimage-extract-and-run'] : []), '--no-sandbox', '--disable-gpu']
const hasDisplay = Boolean(process.env.DISPLAY)
const [command, commandArgs] = hasDisplay
  ? [artifact, appArgs]
  : ['xvfb-run', ['-a', artifact, ...appArgs]]

const child = spawn(command, commandArgs, {
  env: { ...process.env, HOME: home, TERMORA_PORT: String(port), NODE_OPTIONS: '', ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
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

try { process.kill(-child.pid, 'SIGTERM') } catch { /* already gone */ }
await sleep(1_500)
try { process.kill(-child.pid, 'SIGKILL') } catch { /* already gone */ }
rmSync(home, { recursive: true, force: true })

const evidence = {
  artifact,
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
