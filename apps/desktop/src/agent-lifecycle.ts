// Synaptix desktop agent lifecycle adapter.
//
// Dependency-free and runtime-agnostic: the Electron main process injects the
// real `startAgent` from `@synaptix/agent/runtime`, so this module never imports
// Electron or the agent package. That keeps the desktop boundary typecheckable
// and testable before either dependency is installed, while giving the shell a
// concrete lifecycle (start once, report the port, stop cleanly) to call.

import type { AgentLaunchDescriptor } from './agent-host.js'

/**
 * Structural subset of `@synaptix/agent/runtime`'s `AgentHandle` that the
 * shell depends on. Declared locally to avoid importing the agent package.
 */
export interface AgentHandleLike {
  readonly port: number
  close(): Promise<void>
}

/** Structural subset of `@synaptix/agent/runtime`'s `StartAgentOptions`. */
export interface StartAgentOptionsLike {
  log?: boolean
  recoverSessions?: boolean
}

/** Structural signature of `@synaptix/agent/runtime`'s `startAgent`. */
export type StartAgentFn = (options?: StartAgentOptionsLike) => Promise<AgentHandleLike>

export interface AgentLifecycle {
  /** Starts the agent once; concurrent/repeat calls resolve to the same handle. */
  start(): Promise<AgentHandleLike>
  /** Stops the running agent. Idempotent and safe to call before start. */
  stop(): Promise<void>
  /** Whether the agent is currently running. */
  isRunning(): boolean
  /** Actual listening port, or null before the agent starts. */
  readonly port: number | null
}

/**
 * Wraps an injected `startAgent` with single-instance lifecycle semantics.
 *
 * Only the `programmatic` strategy is supported: a `subprocess` launch is owned
 * by the shell's process manager, not this adapter, so it is rejected early
 * rather than silently starting an in-process agent.
 */
export function createAgentLifecycle(
  startAgent: StartAgentFn,
  descriptor: Pick<AgentLaunchDescriptor, 'strategy'>,
  options: StartAgentOptionsLike = {},
): AgentLifecycle {
  if (descriptor.strategy !== 'programmatic') {
    throw new Error(
      `agent lifecycle requires strategy 'programmatic', received '${descriptor.strategy}'`,
    )
  }

  let handle: AgentHandleLike | null = null
  let pending: Promise<AgentHandleLike> | null = null

  return {
    async start(): Promise<AgentHandleLike> {
      if (handle) return handle
      pending ??= startAgent(options).then((started) => {
        handle = started
        return started
      })
      return pending
    },
    async stop(): Promise<void> {
      if (!handle) return
      const running = handle
      handle = null
      pending = null
      await running.close()
    },
    isRunning(): boolean {
      return handle !== null
    },
    get port(): number | null {
      return handle?.port ?? null
    },
  }
}
