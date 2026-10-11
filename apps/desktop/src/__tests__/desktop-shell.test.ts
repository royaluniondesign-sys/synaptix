import { describe, expect, it } from 'vitest'
import { describeAgentLaunch, AGENT_RUNTIME_MODULE, AGENT_RUNTIME_SYMBOL } from '../agent-host.js'
import { createDesktopBootstrap } from '../main.js'
import { createAgentLifecycle, type AgentHandleLike } from '../agent-lifecycle.js'
import { desktopRuntimePlan } from '../runtime-plan.js'

describe('desktop runtime plan', () => {
  it('stays in scaffold phase so packaging is not overclaimed', () => {
    expect(desktopRuntimePlan.phase).toBe('scaffold')
  })

  it('targets the existing web and cli build outputs', () => {
    expect(desktopRuntimePlan.webDistDir).toBe('packages/web/dist')
    expect(desktopRuntimePlan.cliDistDir).toBe('packages/cli/dist')
  })
})

describe('agent launch descriptor', () => {
  it('defaults to programmatic startAgent with no argv', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan)
    expect(descriptor.strategy).toBe('programmatic')
    expect(descriptor.target).toBe('startAgent')
    expect(descriptor.args).toEqual([])
  })

  it('points the programmatic entrypoint at the real agent runtime export', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan)
    expect(descriptor.entrypoint).toEqual({
      module: AGENT_RUNTIME_MODULE,
      symbol: AGENT_RUNTIME_SYMBOL,
    })
    expect(AGENT_RUNTIME_MODULE).toBe('@termora/agent/runtime')
  })

  it('supports a subprocess fallback strategy', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan, { strategy: 'subprocess' })
    expect(descriptor.strategy).toBe('subprocess')
    expect(descriptor.target).toContain('packages/agent/dist/index.js')
    expect(descriptor.entrypoint).toBeNull()
  })

  it('marks desktop-originated launches in the environment', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan, { env: { TERMORA_PORT: '4031' } })
    expect(descriptor.env.TERMORA_DESKTOP_SHELL).toBe('1')
    expect(descriptor.env.TERMORA_PORT).toBe('4031')
  })
})

describe('agent lifecycle', () => {
  const fakeHandle = (port: number): AgentHandleLike => ({
    port,
    close: () => Promise.resolve(),
  })

  it('starts the injected startAgent once and reports the port', async () => {
    let calls = 0
    const lifecycle = createAgentLifecycle(
      async () => {
        calls += 1
        return fakeHandle(4187)
      },
      { strategy: 'programmatic' },
    )

    const first = await lifecycle.start()
    const second = await lifecycle.start()
    expect(calls).toBe(1)
    expect(first).toBe(second)
    expect(lifecycle.isRunning()).toBe(true)
    expect(lifecycle.port).toBe(4187)
  })

  it('passes options through to the injected startAgent', async () => {
    let received: unknown
    const lifecycle = createAgentLifecycle(
      async (options) => {
        received = options
        return fakeHandle(4187)
      },
      { strategy: 'programmatic' },
      { log: false, recoverSessions: false },
    )
    await lifecycle.start()
    expect(received).toEqual({ log: false, recoverSessions: false })
  })

  it('stops the running agent idempotently and clears the port', async () => {
    let closed = 0
    const lifecycle = createAgentLifecycle(
      async () => {
        return {
          port: 4187,
          close: () => {
            closed += 1
            return Promise.resolve()
          },
        }
      },
      { strategy: 'programmatic' },
    )

    await lifecycle.start()
    await lifecycle.stop()
    await lifecycle.stop()
    expect(closed).toBe(1)
    expect(lifecycle.isRunning()).toBe(false)
    expect(lifecycle.port).toBeNull()
  })

  it('rejects a subprocess strategy so the shell cannot mislaunch an in-process agent', () => {
    expect(() =>
      createAgentLifecycle(async () => fakeHandle(4187), { strategy: 'subprocess' }),
    ).toThrow(/requires strategy 'programmatic'/)
  })
})

describe('desktop bootstrap', () => {
  it('exposes the plan and the resolved launch descriptor', () => {
    const bootstrap = createDesktopBootstrap()
    expect(bootstrap.plan).toBe(desktopRuntimePlan)
    expect(bootstrap.agent.target).toBe('startAgent')
  })
})
