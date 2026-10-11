// Termora desktop agent-host adapter.
// Describes how the shell should start the local agent without actually
// spawning anything. This keeps the launch contract testable and lets the
// future Electron main process swap in a real startAgent() call once the
// programmatic API exists in @termora/agent.

import type { AgentEntryStrategy, DesktopRuntimePlan } from './runtime-plan.js';

export type AgentLaunchDescriptor = {
  strategy: AgentEntryStrategy;
  /** Entrypoint symbol or command the shell will use. */
  target: string;
  /** Arguments passed to the agent entrypoint (empty for programmatic mode). */
  args: string[];
  /** Environment applied on top of the inherited process environment. */
  env: Record<string, string>;
};

export type AgentLaunchOverrides = {
  strategy?: AgentEntryStrategy;
  env?: Record<string, string>;
};

/**
 * Builds the launch descriptor for the local agent from the runtime plan.
 * Pure and side-effect free so it can be asserted in tests and in the
 * boundary checker.
 */
export function describeAgentLaunch(
  plan: DesktopRuntimePlan,
  overrides: AgentLaunchOverrides = {},
): AgentLaunchDescriptor {
  const strategy = overrides.strategy ?? plan.agentEntry;
  const target = strategy === 'programmatic' ? 'startAgent' : 'node packages/agent/dist/index.js';

  return {
    strategy,
    target,
    args: strategy === 'programmatic' ? [] : [],
    env: {
      TERMORA_DESKTOP_SHELL: '1',
      ...overrides.env,
    },
  };
}
