import { describe, expect, it } from 'vitest';
import { describeAgentLaunch } from '../agent-host.js';
import { createDesktopBootstrap } from '../main.js';
import { desktopRuntimePlan } from '../runtime-plan.js';

describe('desktop runtime plan', () => {
  it('stays in scaffold phase so packaging is not overclaimed', () => {
    expect(desktopRuntimePlan.phase).toBe('scaffold');
  });

  it('targets the existing web and cli build outputs', () => {
    expect(desktopRuntimePlan.webDistDir).toBe('packages/web/dist');
    expect(desktopRuntimePlan.cliDistDir).toBe('packages/cli/dist');
  });
});

describe('agent launch descriptor', () => {
  it('defaults to programmatic startAgent with no argv', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan);
    expect(descriptor.strategy).toBe('programmatic');
    expect(descriptor.target).toBe('startAgent');
    expect(descriptor.args).toEqual([]);
  });

  it('supports a subprocess fallback strategy', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan, { strategy: 'subprocess' });
    expect(descriptor.strategy).toBe('subprocess');
    expect(descriptor.target).toContain('packages/agent/dist/index.js');
  });

  it('marks desktop-originated launches in the environment', () => {
    const descriptor = describeAgentLaunch(desktopRuntimePlan, { env: { TERMORA_PORT: '4031' } });
    expect(descriptor.env.TERMORA_DESKTOP_SHELL).toBe('1');
    expect(descriptor.env.TERMORA_PORT).toBe('4031');
  });
});

describe('desktop bootstrap', () => {
  it('exposes the plan and the resolved launch descriptor', () => {
    const bootstrap = createDesktopBootstrap();
    expect(bootstrap.plan).toBe(desktopRuntimePlan);
    expect(bootstrap.agent.target).toBe('startAgent');
  });
});
