import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, chmodSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AgentProfileError,
  AgentRegistry,
  expandArgs,
  isCommandAvailable,
  parseAgentStatus,
  validateProfile,
} from '../agent-registry.js';

describe('validateProfile', () => {
  const ok = { id: 'my-agent', name: 'My Agent', command: 'my-agent', args: ['--task', '{prompt}'] };

  it('accepts a well-formed profile and defaults args to the prompt', () => {
    expect(validateProfile(ok)).toMatchObject({ id: 'my-agent', builtin: false });
    expect(validateProfile({ ...ok, args: undefined }).args).toEqual(['{prompt}']);
  });

  it.each([
    ['bad id', { id: 'Bad Id' }],
    ['empty name', { name: ' ' }],
    ['shell metacharacters', { command: 'sh; rm -rf /' }],
    ['spaces in command', { command: 'my agent' }],
    ['relative path', { command: 'bin/agent' }],
    ['parent traversal', { command: '/usr/../bin/agent' }],
    ['args not array', { args: 'x' }],
    ['nul in arg', { args: ['a\0b'] }],
    ['unknown state', { statusRules: [{ state: 'sleeping', pattern: 'x' }] }],
    ['broken regex', { statusRules: [{ state: 'done', pattern: '(' }] }],
    ['huge pattern', { statusRules: [{ state: 'done', pattern: 'a'.repeat(500) }] }],
  ])('rejects %s', (_label, patch) => {
    expect(() => validateProfile({ ...ok, ...patch })).toThrow(AgentProfileError);
  });
});

describe('expandArgs', () => {
  it('keeps the prompt as a single argv element, shell syntax intact', () => {
    const profile = validateProfile({ id: 'x', name: 'X', command: 'x', args: ['--msg={prompt}', '{prompt}'] });
    const prompt = 'fix "it"; rm -rf / $(whoami) && echo hi';
    expect(expandArgs(profile, { prompt })).toEqual([`--msg=${prompt}`, prompt]);
  });
});

describe('parseAgentStatus', () => {
  it('reports idle for empty output and running for unmatched output', () => {
    expect(parseAgentStatus(null, '')).toBe('idle');
    expect(parseAgentStatus(null, '  \n\n')).toBe('idle');
    expect(parseAgentStatus(null, 'thinking about the problem')).toBe('running');
  });

  it.each([
    ['Do you want to proceed? [y/n]', 'waiting'],
    ['Error: ENOENT no such file', 'failed'],
    ['Traceback (most recent call last):', 'failed'],
    ['Rate limited, retrying in 3s', 'failed'],
    ['> vitest run', 'testing'],
    ['Updating src/server.ts', 'editing'],
    ['Task complete', 'done'],
  ])('classifies %j as %s', (line, state) => {
    expect(parseAgentStatus(null, line)).toBe(state);
  });

  it('does not treat "0 failed" test summaries as failure', () => {
    expect(parseAgentStatus(null, 'Tests: 54 passed, 0 failed')).toBe('running');
  });

  it('lets the newest matching line decide', () => {
    expect(parseAgentStatus(null, 'Error: boom\nupdating src/a.ts')).toBe('editing');
    expect(parseAgentStatus(null, 'updating src/a.ts\nError: boom')).toBe('failed');
  });

  it('ignores ANSI colour and cursor escapes', () => {
    expect(parseAgentStatus(null, '\u001b[31m\u001b[1mError: bad\u001b[0m\u001b[2K')).toBe('failed');
  });

  it('applies custom rules ahead of the defaults', () => {
    const rules = [{ state: 'editing' as const, pattern: '^patching' }];
    expect(parseAgentStatus({ statusRules: rules }, 'patching error handler')).toBe('editing');
  });

  it('stays fast on pathological lines', () => {
    const evil = 'a'.repeat(200_000) + '!';
    const start = Date.now();
    parseAgentStatus({ statusRules: [{ state: 'done', pattern: '(a+)+$' }] }, evil);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe('isCommandAvailable', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'synaptix-agents-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('finds executables on a given PATH and ignores non-executables', () => {
    const exe = join(dir, 'agent-x');
    writeFileSync(exe, '#!/bin/sh\n');
    chmodSync(exe, 0o755);
    writeFileSync(join(dir, 'plain'), 'x');
    chmodSync(join(dir, 'plain'), 0o644);
    expect(isCommandAvailable('agent-x', dir)).toBe(true);
    expect(isCommandAvailable('plain', dir)).toBe(false);
    expect(isCommandAvailable('missing', dir)).toBe(false);
    expect(isCommandAvailable(exe, '')).toBe(true);
  });
});

describe('AgentRegistry', () => {
  let dir = '';
  let file = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'synaptix-registry-')); file = join(dir, 'nested', 'agents.json'); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('lists built-ins and persists custom agents across instances', () => {
    const registry = new AgentRegistry(file);
    expect(registry.list().map((a) => a.id)).toEqual(expect.arrayContaining(['claude', 'codex', 'opencode', 'hermes']));
    registry.register({ id: 'mine', name: 'Mine', command: 'mine' });
    expect(new AgentRegistry(file).get('mine')?.name).toBe('Mine');
    expect(JSON.parse(readFileSync(file, 'utf8'))[0]).not.toHaveProperty('builtin');
  });

  it('refuses to shadow a built-in id', () => {
    expect(() => new AgentRegistry(file).register({ id: 'claude', name: 'Fake', command: 'fake' })).toThrow(/built-in/);
  });

  it('removes custom agents only', () => {
    const registry = new AgentRegistry(file);
    registry.register({ id: 'mine', name: 'Mine', command: 'mine' });
    expect(registry.remove('mine')).toBe(true);
    expect(registry.remove('mine')).toBe(false);
    expect(registry.remove('claude')).toBe(false);
    expect(registry.get('claude')).toBeDefined();
  });

  it('survives a corrupt file and skips invalid entries', () => {
    const registry = new AgentRegistry(file);
    registry.register({ id: 'mine', name: 'Mine', command: 'mine' });
    writeFileSync(file, JSON.stringify([{ id: 'ok', name: 'Ok', command: 'ok' }, { id: 'BAD ID' }, { id: 'claude', name: 'x', command: 'x' }]));
    const reloaded = new AgentRegistry(file);
    expect(reloaded.get('ok')).toBeDefined();
    expect(reloaded.get('claude')?.builtin).toBe(true);
    writeFileSync(file, '{not json');
    expect(() => new AgentRegistry(file)).not.toThrow();
    expect(existsSync(file)).toBe(true);
  });

  it('caps the number of custom agents', () => {
    const registry = new AgentRegistry(file);
    for (let i = 0; i < 32; i += 1) registry.register({ id: `a${i}`, name: `A${i}`, command: 'a' });
    expect(() => registry.register({ id: 'overflow', name: 'O', command: 'o' })).toThrow(/at most/);
    expect(() => registry.register({ id: 'a0', name: 'Renamed', command: 'a' })).not.toThrow();
  });
});
