// Termora desktop preload entry (dev shell only, unsigned).
//
// Electron runs this module in the preload context before the cockpit loads. It
// resolves `contextBridge`/`ipcRenderer` through the computed loader and hands
// them to the existing `exposeTermoraPreload`, which publishes the renderer API
// under `window.termora`. No static `electron` import exists here; the auto-bind
// block only runs inside a real Electron runtime.

import {
  defaultElectronImporter,
  loadElectronPreload,
  type ElectronImporter,
} from './electron-loader.js'
import { exposeTermoraPreload, type TermoraPreloadApi } from './ipc-contract.js'

/**
 * Builds and exposes the renderer-facing Termora preload API. Pure with respect
 * to Electron (the importer is injected), so tests exercise it in Node.
 */
export async function bootstrapTermoraPreload(
  importer: ElectronImporter = defaultElectronImporter,
): Promise<TermoraPreloadApi> {
  const { contextBridge, ipcRenderer } = await loadElectronPreload(importer)
  return exposeTermoraPreload(contextBridge, ipcRenderer)
}

// Only bind the bridge inside a real Electron preload context; importing this
// module in Node (tests, contract checks) must have no side effects.
const electronRuntime = (process.versions as unknown as Record<string, string | undefined>).electron
if (electronRuntime) {
  void bootstrapTermoraPreload().catch((cause: unknown) => {
    const detail = cause instanceof Error ? cause.message : String(cause)
    console.error(`[termora-desktop] preload bridge failed: ${detail}`)
  })
}
