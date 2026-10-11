import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  ELECTRON_WINDOW_MODULE,
  ELECTRON_WINDOW_SYMBOL,
  createBrowserWindow,
  loadElectron,
  type BrowserWindowConstructorLike,
  type ElectronWindowModule,
} from '../window.js'

type FakeRecord = {
  options: Record<string, unknown> | null
  loads: string[]
  shown: number
  closed: boolean
  listeners: Map<string, (...args: unknown[]) => void>
}

function makeFakeElectron(): { module: ElectronWindowModule; record: FakeRecord } {
  const record: FakeRecord = {
    options: null,
    loads: [],
    shown: 0,
    closed: false,
    listeners: new Map(),
  }
  class FakeBrowserWindow {
    constructor(readonly opts: Record<string, unknown>) {
      record.options = opts
    }

    loadURL(url: string): Promise<void> {
      record.loads.push(url)
      return Promise.resolve()
    }

    show(): void {
      record.shown += 1
    }

    close(): void {
      record.closed = true
      record.listeners.get('closed')?.()
    }

    destroy(): void {}

    on(event: string, listener: (...args: unknown[]) => void): void {
      record.listeners.set(event, listener)
    }
  }
  const module: ElectronWindowModule = {
    BrowserWindow: FakeBrowserWindow as unknown as BrowserWindowConstructorLike,
  }
  return { module, record }
}

const stubLoader = (module: ElectronWindowModule) => () => Promise.resolve(module)

describe('loadElectron', () => {
  it('resolves the BrowserWindow export from the injected module', async () => {
    const { module } = makeFakeElectron()
    const loaded = await loadElectron(ELECTRON_WINDOW_MODULE, () =>
      Promise.resolve({ [ELECTRON_WINDOW_SYMBOL]: module.BrowserWindow }),
    )
    expect(loaded.BrowserWindow).toBe(module.BrowserWindow)
  })

  it('defaults to the electron module specifier', async () => {
    const importer = vi.fn(() => Promise.reject(new Error('MODULE_NOT_FOUND')))
    await expect(loadElectron(undefined, importer)).rejects.toThrow(/could not load electron/)
    expect(importer).toHaveBeenCalledWith('electron')
  })

  it('fails clearly when the module lacks BrowserWindow', async () => {
    await expect(
      loadElectron(ELECTRON_WINDOW_MODULE, () => Promise.resolve({ notIt: true })),
    ).rejects.toThrow(/does not export BrowserWindow/)
  })
})

describe('createBrowserWindow', () => {
  it('builds a hidden window with safe default webPreferences and loads via loadURL', async () => {
    const { module, record } = makeFakeElectron()
    const win = await createBrowserWindow('http://127.0.0.1:4187', {
      loader: stubLoader(module),
    })

    expect(record.options?.width).toBe(DEFAULT_WINDOW_WIDTH)
    expect(record.options?.height).toBe(DEFAULT_WINDOW_HEIGHT)
    expect(record.options?.show).toBe(false)
    const prefs = record.options?.webPreferences as Record<string, unknown>
    expect(prefs.nodeIntegration).toBe(false)
    expect(prefs.contextIsolation).toBe(true)

    expect(record.loads).toEqual(['http://127.0.0.1:4187'])

    await win.loadUrl('http://127.0.0.1:4187')
    expect(record.loads).toEqual(['http://127.0.0.1:4187', 'http://127.0.0.1:4187'])
  })

  it('honors explicit options and passes the preload path through', async () => {
    const { module, record } = makeFakeElectron()
    await createBrowserWindow('http://u', {
      width: 800,
      height: 600,
      title: 'Termora Test',
      preload: '/preload.js',
      webPreferences: { nodeIntegration: true, contextIsolation: false },
      loader: stubLoader(module),
    })

    expect(record.options?.width).toBe(800)
    expect(record.options?.height).toBe(600)
    expect(record.options?.title).toBe('Termora Test')
    const prefs = record.options?.webPreferences as Record<string, unknown>
    expect(prefs.preload).toBe('/preload.js')
    expect(prefs.nodeIntegration).toBe(true)
    expect(prefs.contextIsolation).toBe(false)
  })

  it('shows the window on ready-to-show by default but not when suppressed', async () => {
    const first = makeFakeElectron()
    await createBrowserWindow('http://u', { loader: stubLoader(first.module) })
    first.record.listeners.get('ready-to-show')?.()
    expect(first.record.shown).toBe(1)

    const second = makeFakeElectron()
    await createBrowserWindow('http://u', {
      show: false,
      loader: stubLoader(second.module),
    })
    second.record.listeners.get('ready-to-show')?.()
    expect(second.record.shown).toBe(0)
  })

  it('fires the onClosed lifecycle hook exactly once', async () => {
    const { module, record } = makeFakeElectron()
    const onClosed = vi.fn()
    const win = await createBrowserWindow('http://u', {
      onClosed,
      loader: stubLoader(module),
    })

    await win.close?.()
    expect(record.closed).toBe(true)
    expect(onClosed).toHaveBeenCalledOnce()

    await win.close?.()
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('rethrows loader failures so the shell surfaces them', async () => {
    await expect(
      createBrowserWindow('http://u', {
        loader: () => Promise.reject(new Error('no electron')),
      }),
    ).rejects.toThrow('no electron')
  })
})
