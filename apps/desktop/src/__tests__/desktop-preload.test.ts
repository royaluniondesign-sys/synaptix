import { describe, expect, it, vi } from 'vitest'
import {
  DESKTOP_IPC_CHANNELS,
  TERMORA_PRELOAD_KEY,
  type ContextBridgeLike,
  type IpcRendererLike,
} from '../ipc-contract.js'
import { loadElectronPreload, type ElectronImporter } from '../electron-loader.js'
import { bootstrapTermoraPreload } from '../preload.js'

function fakeContextBridge(): {
  bridge: ContextBridgeLike
  exposeInMainWorld: ReturnType<typeof vi.fn>
} {
  const exposeInMainWorld = vi.fn()
  return { bridge: { exposeInMainWorld }, exposeInMainWorld }
}

function fakeIpcRenderer(): IpcRendererLike {
  return {
    invoke: vi.fn(() => Promise.resolve(null)),
    on: vi.fn(),
    removeListener: vi.fn(),
  }
}

describe('loadElectronPreload', () => {
  it('resolves contextBridge and ipcRenderer from the injected importer', async () => {
    const { bridge } = fakeContextBridge()
    const ipcRenderer = fakeIpcRenderer()
    const runtime = await loadElectronPreload(() =>
      Promise.resolve({ contextBridge: bridge, ipcRenderer }),
    )

    expect(runtime.contextBridge).toBe(bridge)
    expect(runtime.ipcRenderer).toBe(ipcRenderer)
  })

  it('defaults to the electron module specifier', async () => {
    const importer = vi.fn(() => Promise.reject(new Error('MODULE_NOT_FOUND')))
    await expect(loadElectronPreload(importer)).rejects.toThrow(/could not load electron/)
    expect(importer).toHaveBeenCalledWith('electron')
  })

  it('fails clearly when contextBridge is missing', async () => {
    await expect(loadElectronPreload(() => Promise.resolve({ ipcRenderer: {} }))).rejects.toThrow(
      /does not export contextBridge/,
    )
  })
})

describe('bootstrapTermoraPreload', () => {
  it('exposes the Termora API on the configured global key and forwards status calls', async () => {
    const { bridge, exposeInMainWorld } = fakeContextBridge()
    const ipcRenderer = fakeIpcRenderer()
    const importer: ElectronImporter = () =>
      Promise.resolve({ contextBridge: bridge, ipcRenderer })

    const api = await bootstrapTermoraPreload(importer)

    expect(exposeInMainWorld).toHaveBeenCalledWith(TERMORA_PRELOAD_KEY, expect.any(Object))
    await api.getStatus()
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(DESKTOP_IPC_CHANNELS.getStatus)
  })
})
