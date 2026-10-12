import { describe, it, expect } from 'vitest';
import { agentScript, runLine } from '../fake-shell';
import { BUILTIN_AGENTS, classifyDemoOutput } from '../cockpit-data';

describe('simulated shell', () => {
  it('answers the documented commands', () => {
    expect(runLine('pwd').output).toBe('/home/demo/demo-project');
    expect(runLine('ls').output).toContain('README.md');
    expect(runLine('echo hello world').output).toBe('hello world');
    expect(runLine('git status').output).toContain('On branch main');
    expect(runLine('clear')).toEqual({ output: '', clear: true });
    expect(runLine('   ')).toEqual({ output: '' });
  });

  it('says plainly when a command is not simulated', () => {
    expect(runLine('rm -rf /').output).toMatch(/not found.*simulated/);
    expect(runLine('git push').output).toMatch(/not simulated/);
  });

  it('labels the scripted agent reply as a demo', () => {
    const steps = agentScript('fix the bug');
    expect(steps[0]).toContain('fix the bug');
    expect(steps[steps.length - 1]).toContain('no agent ran');
  });
});

describe('demo data', () => {
  it('classifies output like the real status rules', () => {
    expect(classifyDemoOutput('')).toBe('idle');
    expect(classifyDemoOutput('Apply changes? [y/n]')).toBe('waiting');
    expect(classifyDemoOutput('Error: boom')).toBe('failed');
    expect(classifyDemoOutput('Tests: 5 passed, 0 failed')).toBe('running');
  });

  it('keeps built-in agent ids unique', () => {
    const ids = BUILTIN_AGENTS.map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
