// Termora desktop Electron main-process entry (dev shell only, unsigned).
//
// This is the module Electron executes as the app's main process. It resolves
// the Electron runtime through the computed loader, loads the programmatic
// startAgent() from @termora/agent, and hands both to `createDesktopMain`, which
// owns the shell lifecycle plus the status/lifecycle IPC bridge. The preload
// entry (`preload.ts`) exposes the renderer API under `window.termora`.
//
// Nothing here packages, signs, or installs anything, and there is no static
// `electron` import: everything Electron-specific is injected through
// `loadElectronMain`/`loadElectron`, so the module typechecks and unit-tests
// before Electron is installed. The auto-start block only runs when executed by
// a real Electron runtime.

import { fileURLToPath } from 'node:url'
import type { StartAgentFn } from './agent-lifecycle.js'
import {
  ELECTRON_MODULE,
  loadElectronMain,
  type ElectronImporter,
} from './electron-loader.js'
import { createDesktopMain, type DesktopMain } from './main-window.js'
import { loadAgentStartFn } from './shell.js'
import { loadElectron, type ElectronLoader } from './window.js'

export interface StartDesktopAppOptions {
  /** Programmatic agent entrypoint. Defaults to @termora/agent's startAgent(). */
  startAgent?: StartAgentFn
  /** Injected Electron importer (tests pass a fake; production computes it). */
  importer?: ElectronImporter
  /** Injected BrowserWindow loader (tests pass a fake). */
  loader?: ElectronLoader
  /** Absolute path to the compiled preload bundle. */
  preload?: string
}

export interface DesktopAppRuntime {
  /** The windowed shell (lifecycle + IPC) driving the app. */
  main: DesktopMain
  /** Disposes the shell and quits the Electron app. Idempotent. */
  quit(): Promise<void>
}

/**
 * Resolves the compiled preload entry next to this module's build output.
 * Kept as a pure path helper so it can be asserted without Electron.
 */
export function resolvePreloadPath(from: string = import.meta.url): string {
  return fileURLToPath(new URL('./preload.js', from))
}

/**
 * Boots the real Electron desktop shell: waits for the app to be ready, starts
 * the local agent, opens the cockpit window wired to the preload bridge, and
 * registers the `window-all-closed` shutdown. Resolves to the running shell.
 */
export async function startDesktopApp(
  options: StartDesktopAppOptions = {},
): Promise<DesktopAppRuntime> {
  const electron = await loadElectronMain(options.importer)
  const startAgent = options.startAgent ?? (await loadAgentStartFn())
  const electronRecord = electron as unknown as Record<string, unknown>

  const main = createDesktopMain({
    startAgent,
    ipc: electron.ipcMain,
    loader:
      options.loader ?? (() => loadElectron(ELECTRON_MODULE, () => Promise.resolve(electronRecord))),
    window: { preload: options.preload ?? resolvePreloadPath() },
  })

  await electron.app.whenReady()
  await main.start()

  electron.app.on('window-all-closed', () => {
    void main.dispose().then(() => {
      electron.app.quit()
    })
  })

  return {
    main,
    async quit(): Promise<void> {
      await main.dispose()
      electron.app.quit()
    },
  }
}

// Only auto-start inside a real Electron main process; importing this module in
// Node (tests, contract checks) must have no side effects.
const electronRuntime = (process.versions as unknown as Record<string, string | undefined>).electron
if (electronRuntime) {
  void startDesktopApp().catch((cause: unknown) => {
    const detail = cause instanceof Error ? cause.message : String(cause)
    console.error(`[termora-desktop] electron main failed: ${detail}`)
    process.exitCode = 1
  })
}
