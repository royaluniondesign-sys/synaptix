import { describe, expect, it, vi } from 'vitest'
import type { AgentHandleLike, StartAgentFn } from '../agent-lifecycle.js'
import { DESKTOP_IPC_CHANNELS, type IpcMainLike } from '../ipc-contract.js'
import {
  loadElectronMain,
  type ElectronImporter,
  type ElectronMainRuntime,
} from '../electron-loader.js'
import { resolvePreloadPath, startDesktopApp } from '../electron-main.js'
import type { BrowserWindowConstructorLike } from '../window.js'

type FakeRecord = {
  loads: string[]
  closed: boolean
  ready: number
  quit: number
  events: Map<string, (...args: unknown[]) => void>
}

function makeFakeElectron(): {
  module: ElectronMainRuntime
  record: FakeRecord
  handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
} {
  const record: FakeRecord = {
    loads: [],
    closed: false,
    ready: 0,
    quit: 0,
    events: new Map(),
  }
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()

  class FakeBrowserWindow {
    loadURL(url: string): Promise<void> {
      record.loads.push(url)
      return Promise.resolve()
    }

    show(): void {}

    close(): void {
      record.closed = true
      record.events.get('closed')?.()
    }

    destroy(): void {}

    on(event: string, listener: (...args: unknown[]) => void): void {
      record.events.set(event, listener)
    }
  }

  const ipcMain: IpcMainLike = {
    handle: (channel, listener) => {
      handlers.set(channel, listener)
    },
    removeHandler: (channel) => {
      handlers.delete(channel)
    },
  }

  const app = {
    whenReady: () => {
      record.ready += 1
      return Promise.resolve()
    },
    on: (event: string, listener: (...args: unknown[]) => void) => {
      record.events.set(event, listener)
    },
    quit: () => {
      record.quit += 1
    },
  }

  const module: ElectronMainRuntime = {
    app,
    ipcMain,
    BrowserWindow: FakeBrowserWindow as unknown as BrowserWindowConstructorLike,
  }
  return { module, record, handlers }
}

function fakeStartAgent(port = 4501): StartAgentFn {
  return () => Promise.resolve({ port, close: () => Promise.resolve() } satisfies AgentHandleLike)
}

describe('loadElectronMain', () => {
  it('resolves app, ipcMain, and BrowserWindow from the injected importer', async () => {
    const { module } = makeFakeElectron()
    const runtime = await loadElectronMain(() =>
      Promise.resolve(module as unknown as Record<string, unknown>),
    )
    expect(runtime.app).toBe(module.app)
    expect(runtime.ipcMain).toBe(module.ipcMain)
    expect(runtime.BrowserWindow).toBe(module.BrowserWindow)
  })

  it('defaults to the electron module specifier', async () => {
    const importer = vi.fn(() => Promise.reject(new Error('MODULE_NOT_FOUND')))
    await expect(loadElectronMain(importer)).rejects.toThrow(/could not load electron/)
    expect(importer).toHaveBeenCalledWith('electron')
  })

  it('fails clearly when an expected export is missing', async () => {
    const { module } = makeFakeElectron()
    const partial = { ...module, app: undefined } as unknown as Record<string, unknown>
    await expect(loadElectronMain(() => Promise.resolve(partial))).rejects.toThrow(/does not export app/)
  })
})

describe('resolvePreloadPath', () => {
  it('resolves the compiled preload next to the main entry', () => {
    const path = resolvePreloadPath('file:///app/dist/electron-main.js')
    expect(path).toBe('/app/dist/preload.js')
  })
})

describe('startDesktopApp', () => {
  it('waits for app readiness, starts the agent, opens the window, and wires IPC', async () => {
    const { module, record, handlers } = makeFakeElectron()
    const importer: ElectronImporter = () =>
      Promise.resolve(module as unknown as Record<string, unknown>)

    const runtime = await startDesktopApp({ importer, startAgent: fakeStartAgent(4501) })

    expect(record.ready).toBe(1)
    expect(record.loads).toEqual(['http://127.0.0.1:4501'])
    expect(runtime.main.status()).toMatchObject({ state: 'running', port: 4501 })

    const stopped = await handlers.get(DESKTOP_IPC_CHANNELS.stop)?.(null)
    expect(stopped).toMatchObject({ state: 'stopped', port: null })
    expect(record.closed).toBe(true)

    await runtime.quit()
    expect(record.quit).toBeGreaterThanOrEqual(1)
  })

  it('uses the resolved preload path by default and quits on window-all-closed', async () => {
    const { module, record } = makeFakeElectron()
    const importer: ElectronImporter = () =>
      Promise.resolve(module as unknown as Record<string, unknown>)

    const runtime = await startDesktopApp({ importer, startAgent: fakeStartAgent(4501) })
    record.events.get('window-all-closed')?.()
    await runtime.quit()
    expect(record.quit).toBeGreaterThanOrEqual(1)
  })
})
