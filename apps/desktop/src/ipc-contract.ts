// Termora desktop IPC + preload contract (dev shell only).
//
// Shared channel names and payload shapes between the Electron main process and
// the preload bridge. This is the "preload skeleton": it declares the exact
// API the real preload entry will expose, using structural Electron types so
// the contract is typecheckable and unit-testable before Electron is installed.
// Nothing here packages, signs, or installs anything.

/** Channel names used by the desktop shell main <-> renderer bridge. */
export const DESKTOP_IPC_CHANNELS = {
  /** Renderer -> main: fetch the current shell status once. */
  getStatus: 'termora:shell-status:get',
  /** Main -> renderer: push shell status updates. */
  status: 'termora:shell-status',
} as const

/** Lifecycle state of the desktop dev shell. */
export type DesktopShellState = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

/** Serializable snapshot of the shell, safe to send over IPC. */
export interface DesktopShellStatus {
  state: DesktopShellState
  /** Actual agent port, or null before the agent starts. */
  port: number | null
  /** Cockpit URL loaded into the window, or null before startup. */
  webUrl: string | null
  /** Error message when `state` is `error`, else null. */
  error: string | null
}

/** Structural subset of Electron's `IpcRenderer` the preload bridge needs. */
export interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
}

/** Structural subset of Electron's `ContextBridge`. */
export interface ContextBridgeLike {
  exposeInMainWorld(key: string, api: unknown): void
}

/** API surface the preload exposes to the renderer as `window.termora`. */
export interface TermoraPreloadApi {
  getStatus(): Promise<DesktopShellStatus | null>
  /** Subscribes to status pushes; returns an unsubscribe function. */
  onStatus(listener: (status: DesktopShellStatus) => void): () => void
}

/** Global key the preload bridge exposes the API under. */
export const TERMORA_PRELOAD_KEY = 'termora'

/**
 * Builds the renderer-facing API from a raw `ipcRenderer`. Pure and injectable
 * so it can be exercised without Electron.
 */
export function createTermoraPreloadApi(ipc: IpcRendererLike): TermoraPreloadApi {
  return {
    async getStatus(): Promise<DesktopShellStatus | null> {
      const status = await ipc.invoke(DESKTOP_IPC_CHANNELS.getStatus)
      return (status as DesktopShellStatus | null) ?? null
    },
    onStatus(listener: (status: DesktopShellStatus) => void): () => void {
      const handler = (_event: unknown, ...args: unknown[]): void => {
        listener(args[0] as DesktopShellStatus)
      }
      ipc.on(DESKTOP_IPC_CHANNELS.status, handler)
      return () => {
        ipc.removeListener(DESKTOP_IPC_CHANNELS.status, handler)
      }
    },
  }
}

/**
 * The exact call the real preload entry makes: expose the API on
 * `window[TERMORA_PRELOAD_KEY]` via Electron's `contextBridge`.
 */
export function exposeTermoraPreload(
  contextBridge: ContextBridgeLike,
  ipc: IpcRendererLike,
): TermoraPreloadApi {
  const api = createTermoraPreloadApi(ipc)
  contextBridge.exposeInMainWorld(TERMORA_PRELOAD_KEY, api)
  return api
}
