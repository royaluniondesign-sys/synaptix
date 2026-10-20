// Synaptix mobile companion — phase 1 pairing contract.
//
// Pure TypeScript: this module imports no React Native, Expo, or native module.
// It defines how the future companion parses a pairing link into a normalized
// descriptor and how the embedded bootstrap token must be handled. Native builds
// stay gated; this only hardens the contract so a shipped shell cannot drift.

/** Custom scheme reserved for Synaptix pairing deep links. */
export const PAIRING_SCHEME = 'synaptix'

/** Deep-link host that marks a URL as a pairing payload. */
export const PAIRING_HOST = 'pair'

/** Absolute http(s) base URL of an agent plus its short-lived bootstrap token. */
export interface PairingDescriptor {
  /** Agent base URL with any trailing slash removed. */
  baseUrl: string
  /** Short-lived bootstrap token exchanged for a session JWT. */
  token: string
  /** Optional human-readable machine/device label. */
  label?: string
}

/** Where a pairing descriptor came from, so callers can log provenance safely. */
export type PairingSource = 'deep-link' | 'web-url'

export type PairingError =
  | 'empty'
  | 'unparseable'
  | 'unsupported-scheme'
  | 'invalid-base-url'
  | 'missing-token'

export type PairingParseResult =
  | { ok: true; pairing: PairingDescriptor; source: PairingSource }
  | { ok: false; reason: PairingError }

const HTTP_PROTOCOLS = new Set(['http:', 'https:'])
const PAIRING_SCHEME_URL = `${PAIRING_SCHEME}:`

/** Removes one or more trailing slashes so URL joining never doubles up. */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function isHttpUrl(value: string): boolean {
  try {
    return HTTP_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

function normalizeBaseUrl(raw: string): string | null {
  if (!isHttpUrl(raw)) return null
  const parsed = new URL(raw)
  return trimTrailingSlash(`${parsed.origin}${parsed.pathname}`)
}

/**
 * Parses either form of Synaptix pairing link:
 *
 * - `https://host/?token=<bootstrap>` — the URL the agent already prints/QR-encodes.
 * - `synaptix://pair?url=<encoded>&token=<bootstrap>&label=<label>` — native deep link.
 *
 * Never throws: malformed input returns a typed failure reason.
 */
export function parsePairingUrl(input: string): PairingParseResult {
  const value = input.trim()
  if (value.length === 0) return { ok: false, reason: 'empty' }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, reason: 'unparseable' }
  }

  if (parsed.protocol === PAIRING_SCHEME_URL) {
    if (parsed.host !== PAIRING_HOST) return { ok: false, reason: 'unsupported-scheme' }
    const baseUrl = normalizeBaseUrl(parsed.searchParams.get('url') ?? '')
    if (baseUrl === null) return { ok: false, reason: 'invalid-base-url' }
    const token = parsed.searchParams.get('token')?.trim() ?? ''
    if (token.length === 0) return { ok: false, reason: 'missing-token' }
    const label = parsed.searchParams.get('label')?.trim()
    return {
      ok: true,
      source: 'deep-link',
      pairing: label ? { baseUrl, token, label } : { baseUrl, token },
    }
  }

  if (HTTP_PROTOCOLS.has(parsed.protocol)) {
    const baseUrl = normalizeBaseUrl(`${parsed.origin}${parsed.pathname}`)
    if (baseUrl === null) return { ok: false, reason: 'invalid-base-url' }
    const token = parsed.searchParams.get('token')?.trim() ?? ''
    if (token.length === 0) return { ok: false, reason: 'missing-token' }
    const label = parsed.searchParams.get('label')?.trim()
    return {
      ok: true,
      source: 'web-url',
      pairing: label ? { baseUrl, token, label } : { baseUrl, token },
    }
  }

  return { ok: false, reason: 'unsupported-scheme' }
}

/** Builds the canonical native deep link for a pairing descriptor. */
export function buildPairingUrl(pairing: PairingDescriptor): string {
  const params = new URLSearchParams({ url: trimTrailingSlash(pairing.baseUrl), token: pairing.token })
  if (pairing.label) params.set('label', pairing.label)
  return `${PAIRING_SCHEME}://${PAIRING_HOST}?${params.toString()}`
}

/**
 * True only when the pairing transport is encrypted or a loopback host.
 * Plain-http LAN pairing is tolerated for local Wi-Fi but must be surfaced.
 */
export function isSecurePairing(pairing: PairingDescriptor): boolean {
  try {
    const { protocol, hostname } = new URL(pairing.baseUrl)
    if (protocol === 'https:') return true
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

/** Masks a token for logs/UI. Never reveal token substrings; tokens can be short. */
export function maskPairingToken(_token: string): string {
  return '[redacted]'
}

/** Returns a copy safe to log: the token is replaced, never truncated to a secret. */
export function redactPairing(pairing: PairingDescriptor): PairingDescriptor {
  return { ...pairing, token: '[redacted]' }
}
