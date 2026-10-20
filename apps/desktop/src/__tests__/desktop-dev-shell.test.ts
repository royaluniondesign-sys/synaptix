import { describe, expect, it, vi } from 'vitest'
import { AGENT_RUNTIME_MODULE, AGENT_RUNTIME_SYMBOL } from '../agent-host.js'
import type { AgentHandleLike, StartAgentFn } from '../agent-lifecycle.js'
import {
  DESKTOP_IPC_CHANNELS,
  SYNAPTIX_PRELOAD_KEY,
  createSynaptixPreloadApi,
  exposeSynaptixPreload,
  type DesktopShellStatus,
  type IpcRendererLike,
} from '../ipc-contract.js'
import {
  buildAgentWebUrl,
  createDesktopShell,
  loadAgentStartFn,
  runHeadlessDevShell,
  type ShellWindow,
} from '../shell.js'

function fakeHandle(port: number, onClose?: () => void): AgentHandleLike {
  return {
    port,
    close: () => {
      onClose?.()
      return Promise.resolve()
    },
  }
}

function fakeStartAgent(port = 4311, onClose?: () => void): StartAgentFn {
  return () => Promise.resolve(fakeHandle(port, onClose))
}

describe('buildAgentWebUrl', () => {
  it('builds a loopback URL from the agent port', () => {
    expect(buildAgentWebUrl(4311)).toBe('http://127.0.0.1:4311')
  })

  it('honors an explicit host', () => {
    expect(buildAgentWebUrl(4311, '0.0.0.0')).toBe('http://0.0.0.0:4311')
  })
})

describe('createDesktopShell', () => {
  it('starts the agent once, loads the cockpit URL, and reports running', async () => {
    let starts = 0
    const loaded: string[] = []
    const shell = createDesktopShell({
      startAgent: async () => {
        starts += 1
        return fakeHandle(4311)
      },
      createWindow: (url): ShellWindow => {
        loaded.push(url)
        return { loadUrl: () => undefined }
      },
    })

    expect(shell.status()).toMatchObject({ state: 'idle', port: null, webUrl: null })

    const status = await shell.ready()
    expect(starts).toBe(1)
    expect(loaded).toEqual(['http://127.0.0.1:4311'])
    expect(status).toEqual({
      state: 'running',
      port: 4311,
      webUrl: 'http://127.0.0.1:4311',
      error: null,
    })

    await shell.dispose()
  })

  it('emits status transitions: starting, running, stopped', async () => {
    const seen: DesktopShellStatus['state'][] = []
    const shell = createDesktopShell({
      startAgent: fakeStartAgent(4311),
      createWindow: () => ({ loadUrl: () => undefined }),
      onStatus: (status) => seen.push(status.state),
    })

    await shell.ready()
    await shell.dispose()
    expect(seen).toEqual(['starting', 'running', 'stopped'])
  })

  it('closes the window and stops the agent on dispose', async () => {
    let closed = 0
    let windowClosed = 0
    const shell = createDesktopShell({
      startAgent: fakeStartAgent(4311, () => {
        closed += 1
      }),
      createWindow: () => ({
        loadUrl: () => undefined,
        close: () => {
          windowClosed += 1
          return Promise.resolve()
        },
      }),
    })

    await shell.ready()
    await shell.dispose()
    await shell.dispose()
    expect(closed).toBe(1)
    expect(windowClosed).toBe(1)
    expect(shell.status()).toMatchObject({ state: 'stopped', port: null, webUrl: null })
  })

  it('reports an error state and rethrows when the agent fails to start', async () => {
    const shell = createDesktopShell({
      startAgent: () => Promise.reject(new Error('port busy')),
      createWindow: () => ({ loadUrl: () => undefined }),
    })

    await expect(shell.ready()).rejects.toThrow('port busy')
    expect(shell.status()).toMatchObject({ state: 'error', error: 'port busy', port: null })
  })
})

describe('loadAgentStartFn', () => {
  it('resolves the programmatic startAgent export', async () => {
    const startAgent = fakeStartAgent()
    const loaded = await loadAgentStartFn(undefined, () =>
      Promise.resolve({ [AGENT_RUNTIME_SYMBOL]: startAgent }),
    )
    expect(loaded).toBe(startAgent)
  })

  it('defaults to the agent runtime entrypoint', async () => {
    const importer = vi.fn(() => Promise.resolve({}))
    await expect(loadAgentStartFn(undefined, importer)).rejects.toThrow(/startAgent/)
    expect(importer).toHaveBeenCalledWith(AGENT_RUNTIME_MODULE)
  })

  it('fails clearly when the module cannot be resolved', async () => {
    await expect(
      loadAgentStartFn(undefined, () => Promise.reject(new Error('MODULE_NOT_FOUND'))),
    ).rejects.toThrow(/could not load @synaptix\/agent\/runtime/)
  })

  it('fails clearly when the export is missing', async () => {
    await expect(
      loadAgentStartFn(undefined, () => Promise.resolve({ notStartAgent: () => undefined })),
    ).rejects.toThrow(/does not export startAgent\(\)/)
  })
})

describe('preload contract', () => {
  it('invokes the status channel and returns the payload', async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({
        state: 'running',
        port: 4311,
        webUrl: 'http://127.0.0.1:4311',
        error: null,
      }),
    )
    const ipc: IpcRendererLike = {
      invoke,
      on: () => undefined,
      removeListener: () => undefined,
    }

    const api = createSynaptixPreloadApi(ipc)
    const status = await api.getStatus()
    expect(invoke).toHaveBeenCalledWith(DESKTOP_IPC_CHANNELS.getStatus)
    expect(status?.state).toBe('running')
  })

  it('subscribes and unsubscribes from status pushes', () => {
    let handler: ((event: unknown, status: DesktopShellStatus) => void) | undefined
    const removeListener = vi.fn()
    const ipc: IpcRendererLike = {
      invoke: () => Promise.resolve(null),
      on: (_channel, listener) => {
        handler = listener
      },
      removeListener,
    }

    const api = createSynaptixPreloadApi(ipc)
    const received: DesktopShellStatus[] = []
    const unsubscribe = api.onStatus((status) => received.push(status))

    handler?.(null, { state: 'running', port: 4311, webUrl: 'u', error: null })
    expect(received).toHaveLength(1)

    unsubscribe()
    expect(removeListener).toHaveBeenCalledWith(DESKTOP_IPC_CHANNELS.status, expect.any(Function))
  })

  it('exposes the API on the configured global key', () => {
    const exposeInMainWorld = vi.fn()
    const ipc: IpcRendererLike = {
      invoke: () => Promise.resolve(null),
      on: () => undefined,
      removeListener: () => undefined,
    }

    exposeSynaptixPreload({ exposeInMainWorld }, ipc)
    expect(exposeInMainWorld).toHaveBeenCalledWith(SYNAPTIX_PRELOAD_KEY, expect.any(Object))
  })
})

describe('runHeadlessDevShell', () => {
  it('boots the shell and returns the cockpit URL', async () => {
    const shell = await runHeadlessDevShell(fakeStartAgent(4399))
    expect(shell.url).toBe('http://127.0.0.1:4399')
    expect(shell.status).toMatchObject({ state: 'running', port: 4399 })
    await shell.stop()
  })

  it('propagates agent startup failures', async () => {
    await expect(runHeadlessDevShell(() => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    )
  })
})
