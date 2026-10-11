#!/usr/bin/env node
// scripts/check-cockpit.mjs
// Live dogfood check for a running Termora agent's cockpit API.
//
// Set TERMORA_URL (e.g. http://127.0.0.1:4030) and TERMORA_TOKEN (a static or
// bootstrap token) to exercise a real agent. When either variable is missing
// the check prints a skip notice and exits 0, so it is safe in CI and on
// machines without a live agent.
//
// The check exchanges the token for a session JWT via POST /api/auth/bootstrap
// (or reuses a token that already looks like a JWT), then probes a read-only
// slice of the cockpit surface: health, status, files, README preview, github
// and events. Every output path redacts the raw token, the issued JWT, and any
// "Bearer <secret>" wrapper, so a credential can never reach stdout/stderr.

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const BOOTSTRAP_PATH = '/api/auth/bootstrap'
const MAX_DETAIL_LENGTH = 200

// The read-only endpoints a dogfood run covers, plus a light shape check per
// endpoint so a 200 that silently returns garbage still fails the run.
const ENDPOINTS = [
  {
    label: 'health',
    path: '/api/health',
    valid: (data) => data !== null && typeof data === 'object',
  },
  {
    label: 'cockpit/status',
    path: '/api/cockpit/status',
    valid: (data) =>
      data !== null &&
      typeof data === 'object' &&
      typeof data.git === 'object' &&
      Array.isArray(data.agents),
  },
  {
    label: 'cockpit/files',
    path: '/api/cockpit/files',
    valid: (data) => data !== null && typeof data === 'object' && Array.isArray(data.entries),
  },
  {
    label: 'cockpit/file (README preview)',
    path: '/api/cockpit/file?path=README.md',
    valid: (data) =>
      data !== null &&
      typeof data === 'object' &&
      data.path === 'README.md' &&
      typeof data.content === 'string',
  },
  {
    label: 'cockpit/github',
    path: '/api/cockpit/github',
    valid: (data) =>
      data !== null && typeof data === 'object' && typeof data.installed === 'boolean',
  },
  {
    label: 'events',
    path: '/api/events',
    valid: (data) =>
      data !== null &&
      typeof data === 'object' &&
      Array.isArray(data.events) &&
      Number.isFinite(data.unreadCount),
  },
]

/** A JWT has exactly three dot-separated segments; a raw static token does not. */
export function looksLikeJwt(token) {
  return token.length > 0 && token.split('.').length === 3
}

/** Strips trailing slashes so path joining never doubles up. */
export function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '')
}

/** Returns { url, token } when both env vars are present, otherwise null (skip). */
export function readCockpitEnv(env = process.env) {
  const url = env.TERMORA_URL?.trim()
  const token = env.TERMORA_TOKEN?.trim()
  if (!url || !token) return null
  return { url, token }
}

/** Replaces the raw token, the exchanged JWT, and any "Bearer <secret>" wrapper. */
export function redact(text, ...secrets) {
  let out = String(text ?? '')
  for (const secret of new Set(secrets.filter(Boolean))) {
    out = out.split(secret).join('[redacted]')
    out = out.split(`Bearer ${secret}`).join('[redacted]')
  }
  return out
}

function truncate(value) {
  const text = String(value)
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}…` : text
}

async function exchangeToken(baseUrl, token, fetchImpl) {
  const res = await fetchImpl(`${baseUrl}${BOOTSTRAP_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) return { ok: false, detail: `status ${res.status}` }
  const data = await res.json().catch(() => null)
  if (!data || typeof data.token !== 'string' || data.token.length === 0) {
    return { ok: false, detail: 'response omitted a token' }
  }
  return { ok: true, jwt: data.token }
}

/**
 * Exercises the live cockpit endpoints against a running agent. Returns
 * { ok, results } and seals every result detail through redact() so the raw
 * token and the exchanged JWT can never surface, even from server error text.
 */
export async function exerciseCockpit(env, fetchImpl = fetch) {
  const baseUrl = normalizeBaseUrl(env.url)
  let jwt = looksLikeJwt(env.token) ? env.token : null
  const results = []
  const report = (label, ok, detail = null) => {
    results.push({
      label,
      ok,
      detail: detail === null ? null : truncate(redact(detail, env.token, jwt)),
    })
  }

  if (jwt === null) {
    try {
      const exchange = await exchangeToken(baseUrl, env.token, fetchImpl)
      if (!exchange.ok) {
        report('auth/bootstrap', false, exchange.detail)
        return { ok: false, results }
      }
      jwt = exchange.jwt
    } catch (error) {
      report('auth/bootstrap', false, error instanceof Error ? error.message : String(error))
      return { ok: false, results }
    }
    report('auth/bootstrap', true)
  }

  try {
    for (const endpoint of ENDPOINTS) {
      const res = await fetchImpl(`${baseUrl}${endpoint.path}`, {
        headers: { authorization: `Bearer ${jwt}` },
      })
      const data = await res.json().catch(() => null)
      if (res.ok && endpoint.valid(data)) {
        report(endpoint.label, true)
      } else if (res.ok) {
        report(endpoint.label, false, 'unexpected response shape')
      } else {
        report(endpoint.label, false, `status ${res.status}`)
      }
    }
  } catch (error) {
    report('fetch', false, error instanceof Error ? error.message : String(error))
  }

  return { ok: results.every((result) => result.ok), results }
}

function isMain() {
  try {
    return import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href
  } catch {
    return false
  }
}

async function main() {
  const env = readCockpitEnv()
  if (env === null) {
    console.log(
      'check:cockpit — skipped: set TERMORA_URL and TERMORA_TOKEN to dogfood a live agent',
    )
    return 0
  }

  const { ok, results } = await exerciseCockpit(env)
  for (const result of results) {
    const mark = result.ok ? 'ok    ' : 'FAIL  '
    const detail = result.detail == null ? '' : ` — ${result.detail}`
    console.log(`  ${mark} ${result.label}${detail}`)
  }

  if (!ok) {
    console.error('check:cockpit — cockpit dogfood failed')
    return 1
  }
  console.log('check:cockpit — cockpit dogfood ok')
  return 0
}

if (isMain()) {
  main().then((code) => {
    process.exitCode = code
  })
}
