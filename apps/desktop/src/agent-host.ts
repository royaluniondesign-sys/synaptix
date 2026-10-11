// Termora desktop agent-host adapter.
// Describes how the shell should start the local agent without actually
// spawning anything. This keeps the launch contract testable and lets the
// future Electron main process swap in a real startAgent() call once the
// programmatic API exists in @termora/agent.

import type { AgentEntryStrategy, DesktopRuntimePlan } from './runtime-plan.js'

/**
 * Programmatic agent entrypoint in `@termora/agent`. The `exports` map of
 * `packages/agent/package.json` exposes `./runtime` → `dist/runtime.js`, which
 * exports `startAgent()`.
 */
export const AGENT_RUNTIME_MODULE = '@termora/agent/runtime'
export const AGENT_RUNTIME_SYMBOL = 'startAgent'

/** Module-qualified reference the Electron main process will import. */
export type AgentEntrypoint = {
  module: string
  symbol: string
}

export type AgentLaunchDescriptor = {
  strategy: AgentEntryStrategy
  /** Entrypoint symbol or command the shell will use. */
  target: string
  /** Arguments passed to the agent entrypoint (empty for programmatic mode). */
  args: string[]
  /** Environment applied on top of the inherited process environment. */
  env: Record<string, string>
  /** Import specifier + export symbol for the programmatic strategy, else null. */
  entrypoint: AgentEntrypoint | null
}

export type AgentLaunchOverrides = {
  strategy?: AgentEntryStrategy
  env?: Record<string, string>
}

/**
 * Builds the launch descriptor for the local agent from the runtime plan.
 * Pure and side-effect free so it can be asserted in tests and in the
 * boundary checker.
 */
export function describeAgentLaunch(
  plan: DesktopRuntimePlan,
  overrides: AgentLaunchOverrides = {},
): AgentLaunchDescriptor {
  const strategy = overrides.strategy ?? plan.agentEntry
  const target =
    strategy === 'programmatic' ? AGENT_RUNTIME_SYMBOL : 'node packages/agent/dist/index.js'

  return {
    strategy,
    target,
    args: [],
    env: {
      TERMORA_DESKTOP_SHELL: '1',
      ...overrides.env,
    },
    entrypoint:
      strategy === 'programmatic'
        ? { module: AGENT_RUNTIME_MODULE, symbol: AGENT_RUNTIME_SYMBOL }
        : null,
  }
}
