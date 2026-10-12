import { describe, it, expect } from 'vitest';
import { CAPABILITIES, deriveAgents, deriveTasks, gateSummary, overviewTask, type CockpitStatusLike } from '../cockpit-model';

const status: CockpitStatusLike = {
  machine: 'devbox',
  root: '/srv/termora',
  git: { branch: 'main', dirty: true, lastCommit: 'abc123 fix' },
  agents: [
    { id: 'claude', name: 'Claude Code', state: 'ready', available: true },
    { id: 'codex', name: 'Codex', state: 'unavailable', available: false },
  ],
  worktrees: [{ index: 1, path: '/tmp/wt-1', branch: 'fanout/a-1' }],
  recentJobs: [
    { id: 'j1', action: 'run-gates', status: 'failed', output: '' },
    { id: 'j2', action: 'agent-worktree', status: 'running', output: '' },
  ],
};

describe('cockpit model', () => {
  it('has no tasks or agents before the agent answers', () => {
    expect(deriveTasks(null)).toEqual([]);
    expect(deriveAgents(null)).toEqual([]);
    expect(overviewTask(null).title).toMatch(/connecting/i);
  });

  it('derives tasks only from worktrees and jobs the backend reported', () => {
    const tasks = deriveTasks(status);
    expect(tasks.map((task) => task.id)).toEqual(['worktree:fanout/a-1', 'job:j1', 'job:j2']);
    expect(tasks[1].status).toBe('red');
    expect(tasks[2].status).toBe('orange');
  });

  it('derives agents from detection, never from a fixed list', () => {
    expect(deriveAgents(status)).toEqual([
      expect.objectContaining({ id: 'claude', state: 'installed', tone: 'green' }),
      expect.objectContaining({ id: 'codex', state: 'not installed', tone: 'muted' }),
    ]);
  });

  it('describes the overview from the repository state', () => {
    expect(overviewTask(status)).toMatchObject({ title: 'devbox · main', status: 'orange', meta: 'abc123 fix' });
  });

  it('reports gates honestly', () => {
    expect(gateSummary(null)).toMatch(/not been run/);
    expect(gateSummary(status)).toBe('Last gate run (lint): failed.');
  });

  it('marks only the shipped surfaces as live', () => {
    expect(CAPABILITIES.filter((item) => item.state === 'live').map((item) => item.name).sort()).toEqual(['Any CLI Agent', 'Termora CLI']);
  });
});
