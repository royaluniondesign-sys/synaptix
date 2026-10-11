// Termora desktop window adapter (dev shell only).
//
// Maps Electron's `BrowserWindow` onto the shell's `ShellWindow` contract while
// keeping the Electron-free, dependency-free pattern of the rest of the shell.
// Electron is resolved lazily through an injected loader (the real importer is a
// computed `import('electron')`) so this module typechecks and tests before
// Electron is installed. It loads the cockpit URL via `loadURL`, applies the
// window options, and exposes the `closed` lifecycle hook so the main process
// can stop the agent. No packaging, signing, or installer claim.

import type { ShellWindow } from './shell.js'

export interface WindowOptions {
  width?: number
  height?: number
  title?: string
  /** Absolute path to the preload bundle exposing `window[TERMORA_PRELOAD_KEY]`. */
  preload?: string
  /** Show the window once the page is ready to paint (default true). */
  show?: boolean
  webPreferences?: {
    nodeIntegration?: boolean
    contextIsolation?: boolean
  }
  /** Lifecycle hook: invoked once when the window is closed. */
  onClosed?: () => void
}

export const DEFAULT_WINDOW_WIDTH = 1200
export const DEFAULT_WINDOW_HEIGHT = 800

/** Structural subset of Electron's `BrowserWindow` the shell needs. */
export interface BrowserWindowLike {
  loadURL(url: string): Promise<void>
  show(): void
  close(): void
  destroy(): void
  on(event: string, listener: (...args: unknown[]) => void): void
}

/** Structural subset of Electron's `BrowserWindow` constructor. */
export interface BrowserWindowConstructorLike {
  new (options: Record<string, unknown>): BrowserWindowLike
}

/** The slice of Electron's main module the window adapter consumes. */
export interface ElectronWindowModule {
  BrowserWindow: BrowserWindowConstructorLike
}

export const ELECTRON_WINDOW_MODULE = 'electron'
export const ELECTRON_WINDOW_SYMBOL = 'BrowserWindow'

export type ElectronLoader = (specifier: string) => Promise<ElectronWindowModule>

/**
 * Resolves Electron's `BrowserWindow` through an injected importer (defaults to
 * a computed `import('electron')` specifier) so nothing here is statically bound
 * to Electron. The real main process passes the default; tests pass a stub.
 */
export async function loadElectron(
  specifier: string = ELECTRON_WINDOW_MODULE,
  importer: (specifier: string) => Promise<Record<string, unknown>> = (specifier) =>
    import(specifier),
): Promise<ElectronWindowModule> {
  let mod: Record<string, unknown>
  try {
    mod = await importer(specifier)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(
      `desktop window adapter could not load ${specifier}; install Electron to run the real shell (${detail})`,
      { cause },
    )
  }

  const Candidate = mod[ELECTRON_WINDOW_SYMBOL]
  if (typeof Candidate !== 'function') {
    throw new Error(
      `desktop window adapter: ${specifier} does not export ${ELECTRON_WINDOW_SYMBOL}`,
    )
  }
  return { BrowserWindow: Candidate as BrowserWindowConstructorLike }
}

export type CreateBrowserWindowOptions = WindowOptions & {
  loader?: ElectronLoader
}

/**
 * Creates a real BrowserWindow for the given cockpit URL and wraps it in the
 * shell's `ShellWindow`. Constructs the window hidden, loads the target URL via
 * `loadURL`, and shows it on `ready-to-show` unless `show` is disabled. The
 * `onClosed` lifecycle hook fires exactly once when the window closes.
 */
export async function createBrowserWindow(
  url: string,
  options: CreateBrowserWindowOptions = {},
): Promise<ShellWindow> {
  const electron = await (options.loader ?? loadElectron)(ELECTRON_WINDOW_MODULE)
  const win = new electron.BrowserWindow({
    width: options.width ?? DEFAULT_WINDOW_WIDTH,
    height: options.height ?? DEFAULT_WINDOW_HEIGHT,
    title: options.title ?? 'Termora',
    show: false,
    webPreferences: {
      preload: options.preload,
      nodeIntegration: options.webPreferences?.nodeIntegration ?? false,
      contextIsolation: options.webPreferences?.contextIsolation ?? true,
    },
  })

  let closed = false
  win.on('closed', () => {
    closed = true
    options.onClosed?.()
  })
  win.on('ready-to-show', () => {
    if (!closed && options.show !== false) win.show()
  })

  await win.loadURL(url)

  return {
    async loadUrl(loaded: string): Promise<void> {
      await win.loadURL(loaded)
    },
    close(): void {
      if (closed) return
      win.close()
    },
  }
}
