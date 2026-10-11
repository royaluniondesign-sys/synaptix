// Types for scripts/check-cockpit.mjs, the live cockpit dogfood check.
// Kept in sync with the runtime exports so strict consumers can import it.

export interface CockpitEnv {
  url: string
  token: string
}

export interface CheckResult {
  label: string
  ok: boolean
  detail: string | null
}

export interface CockpitCheckOutcome {
  ok: boolean
  results: CheckResult[]
}

export function looksLikeJwt(token: string): boolean
export function normalizeBaseUrl(url: string): string
export function readCockpitEnv(env?: NodeJS.ProcessEnv): CockpitEnv | null
export function redact(text: unknown, ...secrets: Array<string | null | undefined>): string
export function exerciseCockpit(
  env: CockpitEnv,
  fetchImpl?: typeof fetch,
): Promise<CockpitCheckOutcome>
