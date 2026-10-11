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

export { desktopRuntimePlan, describeAgentLaunch, createAgentLifecycle }
export type {
  DesktopRuntimePlan,
  AgentLaunchDescriptor,
  AgentHandleLike,
  AgentLifecycle,
  StartAgentFn,
  StartAgentOptionsLike,
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
