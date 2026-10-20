import { describe, expect, it, vi } from 'vitest'
import {
  looksLikeJwt,
  normalizeBaseUrl,
  readEnv,
  SynaptixClient,
  SynaptixError,
  type FetchLike,
} from '../client.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function statusBody(machine = 'host') {
  return {
    machine,
    root: '/repo',
    git: { branch: 'main', dirty: false, status: '', lastCommit: 'abc' },
    agents: [],
    gates: [],
    commands: [],
    worktrees: [],
    recentJobs: [],
  }
}

/** A fetch mock whose calls carry typed arguments for assertions. */
function mockFetch(handler: (input: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  )
}

function client(env: { url: string; token: string }, fetchImpl: ReturnType<typeof mockFetch>) {
  return new SynaptixClient(env, fetchImpl as unknown as FetchLike)
}

describe('readEnv', () => {
  it('returns null unless both vars are present', () => {
    expect(readEnv({})).toBeNull()
    expect(readEnv({ SYNAPTIX_URL: 'http://x' })).toBeNull()
    expect(readEnv({ SYNAPTIX_TOKEN: 't' })).toBeNull()
  })

  it('trims and returns both values', () => {
    expect(readEnv({ SYNAPTIX_URL: ' http://x ', SYNAPTIX_TOKEN: ' t ' })).toEqual({
      url: 'http://x',
      token: 't',
    })
  })
})

describe('normalizeBaseUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeBaseUrl('http://x/')).toBe('http://x')
    expect(normalizeBaseUrl('http://x///')).toBe('http://x')
    expect(normalizeBaseUrl('http://x')).toBe('http://x')
  })
})

describe('looksLikeJwt', () => {
  it('detects three-segment tokens only', () => {
    expect(looksLikeJwt('a.b.c')).toBe(true)
    expect(looksLikeJwt('not-a-jwt')).toBe(false)
    expect(looksLikeJwt('')).toBe(false)
  })
})

describe('SynaptixClient', () => {
  it('exchanges a static token, then calls the cockpit endpoint with the JWT', async () => {
    const fetchImpl = mockFetch((input) =>
      input.endsWith('/api/auth/bootstrap')
        ? jsonResponse({ token: 'jwt-issued' })
        : jsonResponse(statusBody()),
    )

    const status = await client(
      { url: 'http://agent:4030/', token: 'static' },
      fetchImpl,
    ).getStatus()

    expect(status.machine).toBe('host')
    expect(fetchImpl.mock.calls).toHaveLength(2)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://agent:4030/api/auth/bootstrap')
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('POST')

    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe('http://agent:4030/api/cockpit/status')
    const secondInit = fetchImpl.mock.calls[1]?.[1]
    expect((secondInit?.headers as Record<string, string>).authorization).toBe('Bearer jwt-issued')
  })

  it('uses a JWT token directly without bootstrapping', async () => {
    const fetchImpl = mockFetch(() => jsonResponse(statusBody()))

    await client({ url: 'http://x', token: 'a.b.c' }, fetchImpl).getStatus()

    expect(fetchImpl.mock.calls).toHaveLength(1)
    const init = fetchImpl.mock.calls[0]?.[1]
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer a.b.c')
  })

  it('builds the file query with an optional byte cap', async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({ path: 'a.txt', size: 2, truncated: false, binary: false, content: 'hi' }),
    )

    await client({ url: 'http://x', token: 'a.b.c' }, fetchImpl).getFile('src/a b.ts', 64)

    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'http://x/api/cockpit/file?path=src%2Fa+b.ts&maxBytes=64',
    )
  })

  it('omits maxBytes when not provided', async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({ path: 'a.txt', size: 2, truncated: false, binary: false, content: 'hi' }),
    )

    await client({ url: 'http://x', token: 'a.b.c' }, fetchImpl).getFile('a.txt')

    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://x/api/cockpit/file?path=a.txt')
  })

  it('surfaces server errors as SynaptixError', async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ error: 'Path escapes repository root' }, 400))

    await expect(
      client({ url: 'http://x', token: 'a.b.c' }, fetchImpl).getFile('../etc/passwd'),
    ).rejects.toBeInstanceOf(SynaptixError)
  })

  it('fails authentication clearly', async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({ error: 'Invalid or expired bootstrap token' }, 401),
    )

    await expect(
      client({ url: 'http://x', token: 'static' }, fetchImpl).getStatus(),
    ).rejects.toThrow(/Invalid or expired/)
  })
})
