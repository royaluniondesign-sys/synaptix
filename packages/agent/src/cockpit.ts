import express from 'express';
import { execFile, spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { hostname } from 'node:os';
import type { Express } from 'express';
import { createFanoutWorktrees, listFanoutWorktrees, removeWorktree, slugify } from './worktree.js';

type JobStatus = 'running' | 'success' | 'failed';

type CockpitJob = {
  id: string;
  action: string;
  command: string;
  status: JobStatus;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  output: string;
};

type AuthGuard = (
  req: express.Request,
  res: express.Response,
) => Promise<{ jti: string } | null>;

type WorktreeLaunchBody = {
  prompt?: string;
  count?: number;
  agentCommand?: string;
  runAgents?: boolean;
};

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const jobs = new Map<string, CockpitJob>();
const MAX_OUTPUT = 32_000;

function runCommand(command: string, args: string[] = []): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolveCommand) => {
    execFile(command, args, { cwd: repoRoot, timeout: 10_000, maxBuffer: 64_000 }, (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`.trim();
      resolveCommand({ ok: !error, output });
    });
  });
}

function safePath(pathValue = '.'): string {
  const target = resolve(repoRoot, pathValue);
  if (target !== repoRoot && !target.startsWith(`${repoRoot}/`)) {
    throw new Error('Path escapes repository root');
  }
  return target;
}

function listFiles(pathValue = '.', limit = 80) {
  const target = safePath(pathValue);
  const entries = readdirSync(target, { withFileTypes: true })
    .filter((entry) => !['node_modules', '.git', 'dist', 'coverage'].includes(entry.name))
    .slice(0, Math.min(Math.max(limit, 1), 200))
    .map((entry) => {
      const full = join(target, entry.name);
      const stats = statSync(full);
      return {
        name: entry.name,
        path: relative(repoRoot, full) || '.',
        kind: entry.isDirectory() ? 'dir' : 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    });
  return {
    root: repoRoot,
    path: relative(repoRoot, target) || '.',
    parent: target === repoRoot ? null : relative(repoRoot, resolve(target, '..')) || '.',
    entries,
  };
}

function startJob(action: string, command: string, args: string[], cwd = repoRoot): CockpitJob {
  const id = `${action}-${Date.now().toString(36)}`;
  const job: CockpitJob = {
    id,
    action,
    command: [command, ...args].join(' '),
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: '',
  };
  jobs.set(id, job);

  const child = spawn(command, args, { cwd, shell: false, env: process.env });
  const append = (chunk: Buffer) => {
    job.output = `${job.output}${chunk.toString()}`.slice(-MAX_OUTPUT);
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('close', (code) => {
    job.exitCode = code;
    job.status = code === 0 ? 'success' : 'failed';
    job.finishedAt = new Date().toISOString();
  });
  child.on('error', (error) => {
    job.exitCode = 1;
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.output = `${job.output}\n${error.message}`.slice(-MAX_OUTPUT);
  });

  return job;
}


async function launchWorktreeFanout(body: WorktreeLaunchBody) {
  const prompt = String(body.prompt ?? '').trim();
  if (!prompt) throw new Error('prompt is required');
  const count = Math.min(Math.max(Number(body.count ?? 2), 1), 5);
  const promptSlug = slugify(prompt);
  const worktrees = await createFanoutWorktrees(repoRoot, count, promptSlug);
  const runAgents = body.runAgents === true && process.env.TERMORA_ENABLE_AGENT_SPAWN === '1';
  const agentCommand = String(body.agentCommand ?? '').trim();
  const agentJobs: CockpitJob[] = [];

  if (body.runAgents === true && !runAgents) {
    return {
      prompt,
      count: worktrees.length,
      worktrees,
      agentJobs,
      agentSpawn: 'disabled',
      note: 'Set TERMORA_ENABLE_AGENT_SPAWN=1 to execute external agent commands from this endpoint.',
    };
  }

  if (runAgents && agentCommand) {
    const [command, ...args] = agentCommand.split(/\s+/);
    for (const worktree of worktrees) {
      agentJobs.push(startJob('agent-worktree', command, args.map((arg) => arg === '{prompt}' ? prompt : arg), worktree.path));
    }
  }

  return { prompt, count: worktrees.length, worktrees, agentJobs, agentSpawn: runAgents ? 'started' : 'not-requested' };
}

async function buildStatus() {
  const [branch, status, lastCommit, opencodeVersion] = await Promise.all([
    runCommand('git', ['branch', '--show-current']),
    runCommand('git', ['status', '--short']),
    runCommand('git', ['log', '-1', '--oneline']),
    existsSync('/home/rud/.opencode/bin/opencode')
      ? runCommand('/home/rud/.opencode/bin/opencode', ['--version'])
      : Promise.resolve({ ok: false, output: 'opencode not installed at expected path' }),
  ]);

  return {
    machine: hostname(),
    root: repoRoot,
    git: {
      branch: branch.output || 'unknown',
      dirty: status.output.length > 0,
      status: status.output,
      lastCommit: lastCommit.output,
    },
    agents: [
      { id: 'hermes', name: 'Hermes', state: 'orchestrating', available: true },
      { id: 'opencode', name: 'OpenCode', state: opencodeVersion.ok ? 'ready' : 'unavailable', available: opencodeVersion.ok, version: opencodeVersion.output },
      { id: 'ci', name: 'GitHub CI', state: 'remote', available: true },
    ],
    gates: ['lint', 'typecheck', 'test', 'build'],
    commands: ['git-status', 'run-gates', 'list-files', 'opencode-smoke', 'create-worktree-fanout', 'list-worktrees'],
    worktrees: await listFanoutWorktrees(repoRoot),
    recentJobs: [...jobs.values()].slice(-8).reverse(),
    files: listFiles('.', 40),
  };
}

export function mountCockpitRoutes(app: Express, requireAuth: AuthGuard): void {
  app.get('/api/cockpit/status', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.json(await buildStatus());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to build cockpit status' });
    }
  });

  app.get('/api/cockpit/files', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.json(listFiles(String(req.query.path ?? '.'), Number(req.query.limit ?? 80)));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to list files' });
    }
  });

  app.post('/api/cockpit/actions', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const body = req.body as { action?: string; path?: string };
    try {
      switch (body.action) {
        case 'list-files':
          res.json({ action: body.action, result: listFiles(body.path ?? '.', 80) });
          return;
        case 'git-status':
          res.json({ action: body.action, result: await runCommand('git', ['status', '--short', '--branch']) });
          return;
        case 'run-gates':
          res.status(202).json({ action: body.action, job: startJob('run-gates', 'npm', ['run', 'lint']) });
          return;
        case 'opencode-smoke':
          res.json({ action: body.action, result: await runCommand('/home/rud/.opencode/bin/opencode', ['--version']) });
          return;
        case 'list-worktrees':
          res.json({ action: body.action, result: await listFanoutWorktrees(repoRoot) });
          return;
        case 'create-worktree-fanout':
          res.status(201).json({ action: body.action, result: await launchWorktreeFanout(req.body as WorktreeLaunchBody) });
          return;
        default:
          res.status(400).json({ error: `Unsupported cockpit action: ${body.action ?? 'missing'}` });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Action failed' });
    }
  });


  app.get('/api/cockpit/worktrees', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.json({ worktrees: await listFanoutWorktrees(repoRoot) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to list worktrees' });
    }
  });

  app.post('/api/cockpit/worktrees/fanout', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.status(201).json(await launchWorktreeFanout(req.body as WorktreeLaunchBody));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create worktree fan-out' });
    }
  });

  app.delete('/api/cockpit/worktrees', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      const force = String(req.query.force ?? 'false') === 'true';
      const worktrees = await listFanoutWorktrees(repoRoot);
      const removed: string[] = [];
      for (const worktree of worktrees) {
        await removeWorktree(repoRoot, worktree.path, force);
        removed.push(worktree.path);
      }
      res.json({ removed });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to remove worktrees' });
    }
  });

  app.get('/api/cockpit/jobs/:id', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const job = jobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  });
}
