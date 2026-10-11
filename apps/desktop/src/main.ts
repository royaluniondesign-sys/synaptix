// Termora desktop entrypoint placeholder.
// No Electron dependency is installed yet. This module exposes the desktop
// shell bootstrap contract (runtime plan + agent launch descriptor) so the
// Electron main process added in a later phase only needs to consume it.
// The real implementation must call a programmatic startAgent() instead of
// shelling out.

import { describeAgentLaunch, type AgentLaunchDescriptor } from './agent-host.js';
import { desktopRuntimePlan, type DesktopRuntimePlan } from './runtime-plan.js';

export { desktopRuntimePlan, describeAgentLaunch };
export type { DesktopRuntimePlan, AgentLaunchDescriptor };

export type DesktopBootstrap = {
  plan: DesktopRuntimePlan;
  agent: AgentLaunchDescriptor;
};

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
  };
}
