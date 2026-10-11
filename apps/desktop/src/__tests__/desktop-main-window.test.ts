import { describe, expect, it, vi } from 'vitest'
import type { AgentHandleLike, StartAgentFn } from '../agent-lifecycle.js'
import { DESKTOP_IPC_CHANNELS, type IpcMainLike } from '../ipc-contract.js'
import { createDesktopMain, wireDesktopIpc } from '../main-window.js'
import { createDesktopShell } from '../shell.js'
import type { BrowserWindowConstructorLike, ElectronWindowModule } from '../window.js'

function fakeHandle(port: number): AgentHandleLike {
  return { port, close: () => Promise.resolve() }
}

function fakeStartAgent(port = 4455): StartAgentFn {
  return () => Promise.resolve(fakeHandle(port))
}

function makeFakeIpc(): {
  ipc: IpcMainLike
  handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
} {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
  const ipc: IpcMainLike = {
    handle: (channel, listener) => {
      handlers.set(channel, listener)
    },
    removeHandler: (channel) => {
      handlers.delete(channel)
    },
  }
  return { ipc, handlers }
}

function makeFakeWindowModule(): {
  module: ElectronWindowModule
  record: { loads: string[]; closed: boolean }
} {
  const record = { loads: [] as string[], closed: false }
  class FakeBrowserWindow {
    loadURL(url: string): Promise<void> {
      record.loads.push(url)
      return Promise.resolve()
    }

    show(): void {}

    close(): void {
      record.closed = true
    }

    destroy(): void {}

    on(): void {}
  }
  const module: ElectronWindowModule = {
    BrowserWindow: FakeBrowserWindow as unknown as BrowserWindowConstructorLike,
  }
  return { module, record }
}

describe('createDesktopMain', () => {
  it('serves status and lifecycle over the IPC bridge', async () => {
    const { ipc, handlers } = makeFakeIpc()
    const window = makeFakeWindowModule()
    const main = createDesktopMain({
      startAgent: fakeStartAgent(4455),
      ipc,
      loader: () => Promise.resolve(window.module),
    })

    expect(main.status()).toMatchObject({ state: 'idle', port: null, webUrl: null })

    const started = await handlers.get(DESKTOP_IPC_CHANNELS.start)?.(null)
    expect(started).toMatchObject({ state: 'running', port: 4455 })
    expect(window.record.loads).toEqual(['http://127.0.0.1:4455'])

    const current = await handlers.get(DESKTOP_IPC_CHANNELS.getStatus)?.(null)
    expect(current).toMatchObject({ state: 'running', port: 4455 })

    const stopped = await handlers.get(DESKTOP_IPC_CHANNELS.stop)?.(null)
    expect(stopped).toMatchObject({ state: 'stopped', port: null, webUrl: null })
    expect(window.record.closed).toBe(true)
  })

  it('pushes status snapshots to the renderer over the status channel', async () => {
    const { ipc, handlers } = makeFakeIpc()
    const sendToRenderer = vi.fn()
    const main = createDesktopMain({
      startAgent: fakeStartAgent(4455),
      ipc,
      loader: () => Promise.resolve(makeFakeWindowModule().module),
      sendToRenderer,
    })

    await handlers.get(DESKTOP_IPC_CHANNELS.start)?.(null)
    expect(sendToRenderer).toHaveBeenCalled()
    const channels = sendToRenderer.mock.calls.map((call) => call[0])
    expect(channels.every((channel) => channel === DESKTOP_IPC_CHANNELS.status)).toBe(true)

    await main.dispose()
  })

  it('dispose unregisters IPC handlers and stops the shell', async () => {
    const { ipc, handlers } = makeFakeIpc()
    const window = makeFakeWindowModule()
    const main = createDesktopMain({
      startAgent: fakeStartAgent(4455),
      ipc,
      loader: () => Promise.resolve(window.module),
    })

    await handlers.get(DESKTOP_IPC_CHANNELS.start)?.(null)
    await main.dispose()

    expect(handlers.has(DESKTOP_IPC_CHANNELS.start)).toBe(false)
    expect(handlers.has(DESKTOP_IPC_CHANNELS.getStatus)).toBe(false)
    expect(main.status()).toMatchObject({ state: 'stopped', webUrl: null })
    expect(window.record.closed).toBe(true)
  })
})

describe('wireDesktopIpc', () => {
  it('returns an unregister function that removes the handlers it added', async () => {
    const { ipc, handlers } = makeFakeIpc()
    const shell = createDesktopShell({
      startAgent: fakeStartAgent(4455),
      createWindow: () => ({ loadUrl: () => undefined }),
    })

    const unwire = wireDesktopIpc(shell, ipc)
    const started = await handlers.get(DESKTOP_IPC_CHANNELS.start)?.(null)
    expect(started).toMatchObject({ state: 'running', port: 4455 })

    unwire()
    expect(handlers.has(DESKTOP_IPC_CHANNELS.start)).toBe(false)
    expect(handlers.has(DESKTOP_IPC_CHANNELS.stop)).toBe(false)

    await shell.dispose()
  })
})
