// Synaptix desktop entrypoint surface.
// This module exposes the desktop shell bootstrap contract (runtime plan +
// agent launch descriptor + injected agent lifecycle) and re-exports the real
// Electron launcher (`electron-main.ts`), preload bridge (`preload.ts`), and the
// computed-import loader (`electron-loader.ts`). Electron is declared only in
// apps/desktop/package.json and is always resolved at runtime, never bound at
// build time.

import { describeAgentLaunch, type AgentLaunchDescriptor } from './agent-host.js'
import { desktopRuntimePlan, type DesktopRuntimePlan } from './runtime-plan.js'
import {
  createAgentLifecycle,
  type AgentHandleLike,
  type AgentLifecycle,
  type StartAgentFn,
  type StartAgentOptionsLike,
} from './agent-lifecycle.js'
import {
  buildAgentWebUrl,
  createDesktopShell,
  loadAgentStartFn,
  runHeadlessDevShell,
  type DesktopShell,
  type DesktopShellOptions,
  type HeadlessDevShell,
  type ShellWindow,
} from './shell.js'
import {
  DESKTOP_IPC_CHANNELS,
  SYNAPTIX_PRELOAD_KEY,
  createSynaptixPreloadApi,
  exposeSynaptixPreload,
  type DesktopShellState,
  type DesktopShellStatus,
  type IpcMainLike,
  type SynaptixPreloadApi,
} from './ipc-contract.js'
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  ELECTRON_WINDOW_MODULE,
  ELECTRON_WINDOW_SYMBOL,
  createBrowserWindow,
  loadElectron,
  type BrowserWindowConstructorLike,
  type BrowserWindowLike,
  type CreateBrowserWindowOptions,
  type ElectronLoader,
  type ElectronWindowModule,
  type WindowOptions,
} from './window.js'
import {
  createDesktopMain,
  wireDesktopIpc,
  type DesktopMain,
  type DesktopMainWindowOptions,
} from './main-window.js'
import {
  resolvePreloadPath,
  startDesktopApp,
  type DesktopAppRuntime,
  type StartDesktopAppOptions,
} from './electron-main.js'
import { bootstrapSynaptixPreload } from './preload.js'
import {
  ELECTRON_MODULE,
  loadElectronMain,
  loadElectronPreload,
  type ElectronImporter,
  type ElectronMainRuntime,
  type ElectronPreloadRuntime,
} from './electron-loader.js'

export { desktopRuntimePlan, describeAgentLaunch, createAgentLifecycle }
export { buildAgentWebUrl, createDesktopShell, loadAgentStartFn, runHeadlessDevShell }
export { DESKTOP_IPC_CHANNELS, SYNAPTIX_PRELOAD_KEY, createSynaptixPreloadApi, exposeSynaptixPreload }
export { createBrowserWindow, loadElectron, createDesktopMain, wireDesktopIpc }
export { startDesktopApp, resolvePreloadPath, bootstrapSynaptixPreload }
export { ELECTRON_MODULE, loadElectronMain, loadElectronPreload }
export {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  ELECTRON_WINDOW_MODULE,
  ELECTRON_WINDOW_SYMBOL,
}
export type {
  DesktopRuntimePlan,
  AgentLaunchDescriptor,
  AgentHandleLike,
  AgentLifecycle,
  StartAgentFn,
  StartAgentOptionsLike,
  DesktopShell,
  DesktopShellOptions,
  HeadlessDevShell,
  ShellWindow,
  DesktopShellState,
  DesktopShellStatus,
  IpcMainLike,
  SynaptixPreloadApi,
  WindowOptions,
  CreateBrowserWindowOptions,
  ElectronLoader,
  ElectronWindowModule,
  BrowserWindowLike,
  BrowserWindowConstructorLike,
  DesktopMain,
  DesktopMainWindowOptions,
  DesktopAppRuntime,
  StartDesktopAppOptions,
  ElectronImporter,
  ElectronMainRuntime,
  ElectronPreloadRuntime,
}

export type DesktopBootstrap = {
  plan: DesktopRuntimePlan
  agent: AgentLaunchDescriptor
}

/**
 * Pure bootstrap descriptor. The Electron main process will call this and
 * then start the agent according to `agent.strategy`.
 */
export function createDesktopBootstrap(
  plan: DesktopRuntimePlan = desktopRuntimePlan,
): DesktopBootstrap {
  return {
    plan,
    agent: describeAgentLaunch(plan),
  }
}
