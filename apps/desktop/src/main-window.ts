// Termora desktop main-process window bridge (dev shell only).
//
// Wires the existing shell to a real BrowserWindow host plus the IPC contract so
// the Electron main process (added once Electron lands) only needs to supply
// `startAgent` and the renderer modules. Everything here stays Electron-free and
// dependency-free: window creation and IPC are injected. `createDesktopMain`
// exposes the lifecycle (start/stop) and status snapshot that the preload API
// drives through IPC, and can push `DesktopShellStatus` updates to the renderer.
// No packaging, signing, or installer claim.

import type { StartAgentFn, StartAgentOptionsLike } from './agent-lifecycle.js'
import { DESKTOP_IPC_CHANNELS, type DesktopShellStatus, type IpcMainLike } from './ipc-contract.js'
import type { DesktopRuntimePlan } from './runtime-plan.js'
import {
  createDesktopShell,
  type DesktopShell,
  type DesktopShellOptions,
  type ShellWindow,
} from './shell.js'
import { createBrowserWindow, type ElectronLoader, type WindowOptions } from './window.js'

export interface DesktopMainWindowOptions {
  /** Programmatic agent entrypoint, shared with the shell contract. */
  startAgent: StartAgentFn
  /** Structural `ipcMain` the bridge registers status/lifecycle handlers on. */
  ipc: IpcMainLike
  loader?: ElectronLoader
  window?: WindowOptions
  plan?: DesktopRuntimePlan
  agentOptions?: StartAgentOptionsLike
  host?: string
  onStatus?: (status: DesktopShellStatus) => void
  /** Opt-in push of status snapshots over `DESKTOP_IPC_CHANNELS.status`. */
  sendToRenderer?: (channel: string, ...args: unknown[]) => void
}

export interface DesktopMain {
  readonly shell: DesktopShell
  /** Current status snapshot, also served over the `getStatus` IPC channel. */
  status(): DesktopShellStatus
  /** Starts the agent and opens the window (IPC `start` channel target). */
  start(): Promise<DesktopShellStatus>
  /** Closes the window and stops the agent (IPC `stop` channel target). */
  stop(): Promise<DesktopShellStatus>
  /** Unregisters the IPC handlers and stops the shell. Idempotent. */
  dispose(): Promise<void>
}

/**
 * Registers the shell lifecycle/status IPC handlers on a structural `ipcMain`.
 * Returns an unregister function that removes every handler it added.
 */
export function wireDesktopIpc(shell: DesktopShell, ipc: IpcMainLike): () => void {
  ipc.handle(DESKTOP_IPC_CHANNELS.getStatus, (): DesktopShellStatus => shell.status())
  ipc.handle(DESKTOP_IPC_CHANNELS.start, async (): Promise<DesktopShellStatus> => {
    await shell.ready()
    return shell.status()
  })
  ipc.handle(DESKTOP_IPC_CHANNELS.stop, async (): Promise<DesktopShellStatus> => {
    await shell.dispose()
    return shell.status()
  })
  return () => {
    ipc.removeHandler(DESKTOP_IPC_CHANNELS.getStatus)
    ipc.removeHandler(DESKTOP_IPC_CHANNELS.start)
    ipc.removeHandler(DESKTOP_IPC_CHANNELS.stop)
  }
}

/** Opens a real BrowserWindow for the cockpit URL (loads the URL on creation). */
async function createWindowHost(
  url: string,
  options: DesktopMainWindowOptions,
  windowOptions: WindowOptions | undefined,
): Promise<ShellWindow> {
  return createBrowserWindow(url, {
    ...windowOptions,
    loader: options.loader,
  })
}

/**
 * Builds the windowed desktop shell: a BrowserWindow host (injected Electron
 * loader), the shared agent lifecycle, and the status/lifecycle IPC bridge.
 */
export function createDesktopMain(options: DesktopMainWindowOptions): DesktopMain {
  const shellOptions: DesktopShellOptions = {
    startAgent: options.startAgent,
    plan: options.plan,
    agentOptions: options.agentOptions,
    host: options.host,
    onStatus: (status) => {
      options.onStatus?.(status)
      options.sendToRenderer?.(DESKTOP_IPC_CHANNELS.status, status)
    },
    createWindow: (url) => createWindowHost(url, options, options.window),
  }
  const shell = createDesktopShell(shellOptions)
  const unwire = wireDesktopIpc(shell, options.ipc)

  return {
    shell,
    status: () => shell.status(),
    start: async () => {
      await shell.ready()
      return shell.status()
    },
    stop: async () => {
      await shell.dispose()
      return shell.status()
    },
    dispose: async () => {
      unwire()
      await shell.dispose()
    },
  }
}
