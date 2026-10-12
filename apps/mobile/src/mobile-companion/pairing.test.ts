import { describe, it, expect } from 'vitest'
import {
  buildPairingUrl,
  isSecurePairing,
  maskPairingToken,
  parsePairingUrl,
  redactPairing,
  trimTrailingSlash,
} from './pairing.js'

describe('parsePairingUrl', () => {
  it('parses the agent PWA pairing URL (token in query)', () => {
    const result = parsePairingUrl('https://termora.example.com/?token=abc123')
    expect(result).toEqual({
      ok: true,
      source: 'web-url',
      pairing: { baseUrl: 'https://termora.example.com', token: 'abc123' },
    })
  })

  it('keeps a base path and drops the trailing slash', () => {
    const result = parsePairingUrl('https://host:4030/cockpit/?token=tok')
    expect(result.ok && result.pairing.baseUrl).toBe('https://host:4030/cockpit')
  })

  it('parses a native deep link with a label', () => {
    const result = parsePairingUrl(
      'termora://pair?url=https%3A%2F%2Fhost%2F&token=tok&label=studio-mac',
    )
    expect(result).toEqual({
      ok: true,
      source: 'deep-link',
      pairing: { baseUrl: 'https://host', token: 'tok', label: 'studio-mac' },
    })
  })

  it('rejects a native deep link with an unexpected host', () => {
    expect(parsePairingUrl('termora://other?url=https%3A%2F%2Fhost&token=tok')).toEqual({
      ok: false,
      reason: 'unsupported-scheme',
    })
  })

  it('round-trips through buildPairingUrl', () => {
    const pairing = { baseUrl: 'https://host:4030/cockpit', token: 'secret-tok', label: 'mac' }
    const result = parsePairingUrl(buildPairingUrl(pairing))
    expect(result.ok && result.pairing).toEqual(pairing)
  })

  it('reports empty input', () => {
    expect(parsePairingUrl('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('reports unparseable input', () => {
    expect(parsePairingUrl('not a url')).toEqual({ ok: false, reason: 'unparseable' })
  })

  it('rejects an unsupported scheme', () => {
    expect(parsePairingUrl('ftp://host/?token=tok')).toEqual({
      ok: false,
      reason: 'unsupported-scheme',
    })
  })

  it('rejects a missing token', () => {
    expect(parsePairingUrl('https://host/')).toEqual({ ok: false, reason: 'missing-token' })
    expect(parsePairingUrl('termora://pair?url=https%3A%2F%2Fhost')).toEqual({
      ok: false,
      reason: 'missing-token',
    })
  })

  it('rejects a deep link with a non-http base URL', () => {
    expect(parsePairingUrl('termora://pair?url=file%3A%2F%2Fhost&token=tok')).toEqual({
      ok: false,
      reason: 'invalid-base-url',
    })
  })
})

describe('isSecurePairing', () => {
  it('accepts https and loopback http, rejects remote http', () => {
    expect(isSecurePairing({ baseUrl: 'https://host', token: 't' })).toBe(true)
    expect(isSecurePairing({ baseUrl: 'http://localhost:4030', token: 't' })).toBe(true)
    expect(isSecurePairing({ baseUrl: 'http://192.168.1.10:4030', token: 't' })).toBe(false)
  })
})

describe('token redaction', () => {
  it('always fully masks tokens without revealing substrings', () => {
    for (const token of ['short', '123456789', 'abcdefghijklmnop']) {
      expect(maskPairingToken(token)).toBe('[redacted]')
      expect(maskPairingToken(token)).not.toContain(token.slice(0, 4))
      expect(maskPairingToken(token)).not.toContain(token.slice(-4))
    }
  })

  it('never returns the raw token from redactPairing', () => {
    const redacted = redactPairing({ baseUrl: 'https://host', token: 'super-secret' })
    expect(JSON.stringify(redacted)).not.toContain('super-secret')
    expect(redacted.token).toBe('[redacted]')
  })
})

describe('trimTrailingSlash', () => {
  it('removes one or many trailing slashes', () => {
    expect(trimTrailingSlash('https://host///')).toBe('https://host')
    expect(trimTrailingSlash('https://host')).toBe('https://host')
  })
})
