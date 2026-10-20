// Synaptix desktop Electron runtime loader (dev shell only).
//
// Resolves the Electron main-process and preload primitives through an injected
// importer whose default is a computed `import(specifier)`. Nothing here binds
// `electron` at build time, so the desktop boundary typechecks and the smoke
// contract can prove Electron is only ever resolved at runtime. The real main
// and preload entries use this; tests inject a fake module.

import type { ContextBridgeLike, IpcMainLike, IpcRendererLike } from './ipc-contract.js'
import type { BrowserWindowConstructorLike } from './window.js'

/** Electron module specifier, kept in a variable so no literal import exists. */
export const ELECTRON_MODULE = 'electron'
export const ELECTRON_APP_SYMBOL = 'app'
export const ELECTRON_IPC_MAIN_SYMBOL = 'ipcMain'
export const ELECTRON_IPC_RENDERER_SYMBOL = 'ipcRenderer'
export const ELECTRON_CONTEXT_BRIDGE_SYMBOL = 'contextBridge'
export const ELECTRON_BROWSER_WINDOW_SYMBOL = 'BrowserWindow'

/** Injected importer shape: the default is a computed dynamic import. */
export type ElectronImporter = (specifier: string) => Promise<Record<string, unknown>>

export const defaultElectronImporter: ElectronImporter = (specifier) => import(specifier)

/** Structural subset of Electron's `app` the launcher drives. */
export interface ElectronAppLike {
  whenReady(): Promise<void>
  on(event: string, listener: (...args: unknown[]) => void): void
  quit(): void
}

/** Electron main-process primitives the desktop shell consumes. */
export interface ElectronMainRuntime {
  app: ElectronAppLike
  ipcMain: IpcMainLike
  BrowserWindow: BrowserWindowConstructorLike
}

/** Electron preload primitives the context bridge consumes. */
export interface ElectronPreloadRuntime {
  contextBridge: ContextBridgeLike
  ipcRenderer: IpcRendererLike
}

function requireExport(
  mod: Record<string, unknown>,
  symbol: string,
  specifier: string,
): unknown {
  const value = mod[symbol]
  if (value === undefined) {
    throw new Error(`desktop launcher: ${specifier} does not export ${symbol}`)
  }
  return value
}

async function importElectron(
  specifier: string,
  importer: ElectronImporter,
): Promise<Record<string, unknown>> {
  try {
    return await importer(specifier)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(
      `desktop launcher could not load ${specifier}; install Electron in apps/desktop (${detail})`,
      { cause },
    )
  }
}

/**
 * Resolves Electron's `app`, `ipcMain`, and `BrowserWindow` for the main
 * process. Throws a clear, actionable error when Electron is not installed or
 * an expected export is missing.
 */
export async function loadElectronMain(
  importer: ElectronImporter = defaultElectronImporter,
  specifier: string = ELECTRON_MODULE,
): Promise<ElectronMainRuntime> {
  const mod = await importElectron(specifier, importer)
  return {
    app: requireExport(mod, ELECTRON_APP_SYMBOL, specifier) as ElectronAppLike,
    ipcMain: requireExport(mod, ELECTRON_IPC_MAIN_SYMBOL, specifier) as IpcMainLike,
    BrowserWindow: requireExport(
      mod,
      ELECTRON_BROWSER_WINDOW_SYMBOL,
      specifier,
    ) as BrowserWindowConstructorLike,
  }
}

/**
 * Resolves Electron's `contextBridge` and `ipcRenderer` for the preload entry.
 */
export async function loadElectronPreload(
  importer: ElectronImporter = defaultElectronImporter,
  specifier: string = ELECTRON_MODULE,
): Promise<ElectronPreloadRuntime> {
  const mod = await importElectron(specifier, importer)
  return {
    contextBridge: requireExport(
      mod,
      ELECTRON_CONTEXT_BRIDGE_SYMBOL,
      specifier,
    ) as ContextBridgeLike,
    ipcRenderer: requireExport(
      mod,
      ELECTRON_IPC_RENDERER_SYMBOL,
      specifier,
    ) as IpcRendererLike,
  }
}
