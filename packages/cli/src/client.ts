// Minimal HTTP client for a running Termora agent's cockpit API.
//
// Auth mirrors the web app: a static/bootstrap token is exchanged once for a
// session JWT via POST /api/auth/bootstrap. Tokens that already look like a JWT
// are used directly, so TERMORA_TOKEN can be either kind. Reading the two env
// vars lives here (rather than the entry point) so the contract is unit-testable
// without spawning a process.

export type FetchLike = typeof fetch

export interface TermoraEnv {
  url: string
  token: string
}

export interface CockpitAgent {
  id: string
  name: string
  state: string
  available: boolean
  version?: string
}

export interface CockpitStatus {
  machine: string
  root: string
  git: {
    branch: string
    dirty: boolean
    status: string
    lastCommit: string
  }
  agents: CockpitAgent[]
  gates: string[]
  commands: string[]
  worktrees: unknown[]
  recentJobs: unknown[]
}

export interface FilePreview {
  path: string
  size: number
  truncated: boolean
  binary: boolean
  content: string
}

export class TermoraError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'TermoraError'
  }
}

/** Reads the two env vars the CLI needs; returns null unless both are set. */
export function readEnv(env: NodeJS.ProcessEnv = process.env): TermoraEnv | null {
  const url = env.TERMORA_URL?.trim()
  const token = env.TERMORA_TOKEN?.trim()
  if (!url || !token) return null
  return { url, token }
}

/** Drops trailing slashes so path joining never doubles up. */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/** A JWT has exactly three dot-separated segments; a raw token does not. */
export function looksLikeJwt(token: string): boolean {
  return token.length > 0 && token.split('.').length === 3
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown }
    if (data && typeof data.error === 'string') return data.error
  } catch {
    // Body was not JSON; fall through to the generic message.
  }
  return `Request failed with status ${String(res.status)}`
}

export class TermoraClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly fetchImpl: FetchLike
  private authHeader: string | null = null

  constructor(env: TermoraEnv, fetchImpl: FetchLike = fetch) {
    this.baseUrl = normalizeBaseUrl(env.url)
    this.token = env.token
    this.fetchImpl = fetchImpl
  }

  private async authHeaderValue(): Promise<string> {
    if (this.authHeader !== null) return this.authHeader
    const header = looksLikeJwt(this.token) ? `Bearer ${this.token}` : await this.exchangeToken()
    this.authHeader = header
    return header
  }

  private async exchangeToken(): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/auth/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: this.token }),
    })
    if (!res.ok) throw new TermoraError(await readErrorMessage(res), res.status)

    const data = (await res.json()) as { token?: unknown }
    if (typeof data.token !== 'string' || data.token.length === 0) {
      throw new TermoraError('Authentication response did not include a token', res.status)
    }
    return `Bearer ${data.token}`
  }

  async getStatus(): Promise<CockpitStatus> {
    return this.getJson<CockpitStatus>('/api/cockpit/status')
  }

  async getFile(path: string, maxBytes?: number): Promise<FilePreview> {
    const params = new URLSearchParams({ path })
    if (maxBytes !== undefined) params.set('maxBytes', String(maxBytes))
    return this.getJson<FilePreview>(`/api/cockpit/file?${params.toString()}`)
  }

  private async getJson<T>(pathname: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
      headers: { authorization: await this.authHeaderValue() },
    })
    if (!res.ok) throw new TermoraError(await readErrorMessage(res), res.status)
    return (await res.json()) as T
  }
}
