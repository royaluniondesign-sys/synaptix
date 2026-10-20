// Synaptix desktop shell contract (dev shell only).
//
// Electron-free and runtime-agnostic: the window host and agent entry are
// injected, so the exact same launch sequence runs under a unit test, the
// headless dev entry (`dev.ts`), and — once Electron is installed — the real
// main process. The shell owns only the wiring: start the local agent through
// `createAgentLifecycle`, then load the agent's web cockpit into the window.
// It makes no packaging, signing, or installer claim.

import {
  AGENT_RUNTIME_MODULE,
  AGENT_RUNTIME_SYMBOL,
  describeAgentLaunch,
  type AgentEntrypoint,
  type AgentLaunchDescriptor,
} from './agent-host.js'
import { desktopRuntimePlan, type DesktopRuntimePlan } from './runtime-plan.js'
import {
  createAgentLifecycle,
  type AgentHandleLike,
  type AgentLifecycle,
  type StartAgentFn,
  type StartAgentOptionsLike,
} from './agent-lifecycle.js'
import type { DesktopShellState, DesktopShellStatus } from './ipc-contract.js'

/** Window abstraction the shell loads the cockpit into. */
export interface ShellWindow {
  /** Load the given cockpit URL. */
  loadUrl(url: string): Promise<void> | void
  /** Optional teardown invoked when the shell disposes. */
  close?(): Promise<void> | void
}

export interface DesktopShellOptions {
  /** Programmatic agent entrypoint. Injected so tests and Electron share one contract. */
  startAgent: StartAgentFn
  /** Opens (or mocks) the shell window for a resolved cockpit URL. */
  createWindow: (url: string) => Promise<ShellWindow> | ShellWindow
  plan?: DesktopRuntimePlan
  agentOptions?: StartAgentOptionsLike
  host?: string
  onStatus?: (status: DesktopShellStatus) => void
}

export interface DesktopShell {
  status(): DesktopShellStatus
  /** Starts the agent and loads the cockpit. Resolves once running. */
  ready(): Promise<DesktopShellStatus>
  /** Closes the window and stops the agent. Idempotent. */
  dispose(): Promise<void>
}

export const DEFAULT_SHELL_HOST = '127.0.0.1'

/** Builds the loopback cockpit URL the local agent serves. */
export function buildAgentWebUrl(port: number, host: string = DEFAULT_SHELL_HOST): string {
  return `http://${host}:${String(port)}`
}

/**
 * Resolves the programmatic `startAgent()` from `@synaptix/agent/runtime`.
 *
 * Uses a computed specifier so this module keeps no build-time dependency on
 * `@synaptix/agent` (not installed until the desktop app joins the workspaces).
 * The Electron main process calls this once at boot; tests inject an importer.
 */
export async function loadAgentStartFn(
  entrypoint: AgentEntrypoint = { module: AGENT_RUNTIME_MODULE, symbol: AGENT_RUNTIME_SYMBOL },
  importer: (specifier: string) => Promise<Record<string, unknown>> = (specifier) =>
    import(specifier),
): Promise<StartAgentFn> {
  let mod: Record<string, unknown>
  try {
    mod = await importer(entrypoint.module)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(
      `desktop dev shell could not load ${entrypoint.module}; build @synaptix/agent first (${detail})`,
    )
  }

  const candidate = mod[entrypoint.symbol]
  if (typeof candidate !== 'function') {
    throw new Error(
      `desktop dev shell: ${entrypoint.module} does not export ${entrypoint.symbol}()`,
    )
  }
  return candidate as StartAgentFn
}

/**
 * Wires a programmatic `startAgent` into the agent lifecycle and the window
 * host, exposing status snapshots plus `ready()`/`dispose()`.
 */
export function createDesktopShell(options: DesktopShellOptions): DesktopShell {
  const plan = options.plan ?? desktopRuntimePlan
  const descriptor: AgentLaunchDescriptor = describeAgentLaunch(plan)
  const lifecycle: AgentLifecycle = createAgentLifecycle(
    options.startAgent,
    descriptor,
    options.agentOptions ?? {},
  )
  const host = options.host ?? DEFAULT_SHELL_HOST

  let state: DesktopShellState = 'idle'
  let error: string | null = null
  let webUrl: string | null = null
  let window: ShellWindow | null = null

  const snapshot = (): DesktopShellStatus => ({
    state,
    port: lifecycle.port,
    webUrl,
    error,
  })
  const emit = (): void => {
    options.onStatus?.(snapshot())
  }

  return {
    status: snapshot,
    async ready(): Promise<DesktopShellStatus> {
      state = 'starting'
      error = null
      emit()
      try {
        const handle: AgentHandleLike = await lifecycle.start()
        webUrl = buildAgentWebUrl(handle.port, host)
        window = await options.createWindow(webUrl)
        state = 'running'
      } catch (cause) {
        state = 'error'
        error = cause instanceof Error ? cause.message : String(cause)
        emit()
        throw cause
      }
      emit()
      return snapshot()
    },
    async dispose(): Promise<void> {
      await window?.close?.()
      window = null
      await lifecycle.stop()
      webUrl = null
      state = 'stopped'
      error = null
      emit()
    },
  }
}

export interface HeadlessDevShell {
  status: DesktopShellStatus
  url: string
  stop(): Promise<void>
}

/**
 * Boots the shell with a console window instead of Electron. Exported so tests
 * can drive the full lifecycle with a fake agent; `dev.ts` supplies the real
 * `startAgent` from the loader above.
 */
export async function runHeadlessDevShell(
  startAgent: StartAgentFn,
  options: {
    host?: string
    onStatus?: (status: DesktopShellStatus) => void
  } = {},
): Promise<HeadlessDevShell> {
  const shell = createDesktopShell({
    startAgent,
    host: options.host,
    onStatus: options.onStatus,
    createWindow: (url) => ({
      loadUrl: (loaded) => {
        if (loaded !== url) {
          throw new Error(`desktop dev shell loaded an unexpected URL: ${loaded}`)
        }
      },
    }),
  })

  const status = await shell.ready()
  if (status.webUrl === null) {
    throw new Error('desktop dev shell did not resolve a web URL')
  }
  return { status, url: status.webUrl, stop: () => shell.dispose() }
}
