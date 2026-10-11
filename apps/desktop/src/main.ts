// Termora desktop entrypoint placeholder.
// No Electron dependency is installed yet. This module exposes the desktop
// shell bootstrap contract (runtime plan + agent launch descriptor + injected
// agent lifecycle) so the Electron main process added in a later phase only
// needs to consume it. The injected lifecycle calls a programmatic
// startAgent() supplied by the shell instead of shelling out.

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
  TERMORA_PRELOAD_KEY,
  createTermoraPreloadApi,
  exposeTermoraPreload,
  type DesktopShellState,
  type DesktopShellStatus,
  type IpcMainLike,
  type TermoraPreloadApi,
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

export { desktopRuntimePlan, describeAgentLaunch, createAgentLifecycle }
export { buildAgentWebUrl, createDesktopShell, loadAgentStartFn, runHeadlessDevShell }
export { DESKTOP_IPC_CHANNELS, TERMORA_PRELOAD_KEY, createTermoraPreloadApi, exposeTermoraPreload }
export { createBrowserWindow, loadElectron, createDesktopMain, wireDesktopIpc }
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
  TermoraPreloadApi,
  WindowOptions,
  CreateBrowserWindowOptions,
  ElectronLoader,
  ElectronWindowModule,
  BrowserWindowLike,
  BrowserWindowConstructorLike,
  DesktopMain,
  DesktopMainWindowOptions,
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
