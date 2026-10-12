import express from 'express';
import { execFile, spawn } from 'node:child_process';
import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { hostname } from 'node:os';
import type { Express } from 'express';
import { createFanoutWorktrees, listFanoutWorktrees, removeWorktree, slugify } from './worktree.js';
import { collectGithubStatus } from './github.js';
import { notificationStore } from './event-bus.js';
import { AGENT_STATES, AgentProfileError, AgentRegistry, expandArgs, parseAgentStatus } from './agent-registry.js';

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
  /** Registered agent profile id; takes precedence over agentCommand. */
  agentId?: string;
  runAgents?: boolean;
};

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const jobs = new Map<string, CockpitJob>();
let agentRegistry: AgentRegistry | undefined;

function getAgentRegistry(): AgentRegistry {
  agentRegistry ??= new AgentRegistry(process.env.TERMORA_AGENTS_FILE || undefined);
  return agentRegistry;
}
const MAX_OUTPUT = 32_000;
const MAX_STATUS_INPUT = 64_000;
const MAX_PREVIEW_BYTES = 256 * 1024;
const BINARY_SNIFF_BYTES = 8_000;

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

type FilePreview = {
  path: string;
  size: number;
  truncated: boolean;
  binary: boolean;
  content: string;
};

/**
 * Read-only preview of a repo file for cockpit panes (markdown, logs, diffs).
 * Bounded by MAX_PREVIEW_BYTES so a huge file can never stream the whole repo
 * into a response, and refuses directories/non-regular files. Reuses the same
 * safePath guard as the file listing so a preview can never escape the repo root.
 */
function readFilePreview(pathValue = '.', maxBytes = MAX_PREVIEW_BYTES): FilePreview {
  const target = safePath(pathValue);
  const stats = statSync(target);
  if (stats.isDirectory()) throw new Error('Path is a directory');
  if (!stats.isFile()) throw new Error('Path is not a regular file');

  const truncated = stats.size > maxBytes;
  const readSize = Math.min(stats.size, maxBytes);
  const buffer = Buffer.alloc(readSize);
  const fd = openSync(target, 'r');
  try {
    readSync(fd, buffer, 0, readSize, 0);
  } finally {
    closeSync(fd);
  }

  const snifflen = Math.min(buffer.length, BINARY_SNIFF_BYTES);
  const binary = buffer.subarray(0, snifflen).includes(0);

  return {
    path: relative(repoRoot, target) || '.',
    size: stats.size,
    truncated,
    binary,
    content: binary ? '' : buffer.toString('utf8'),
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
    notifyJobFinished(job);
  });
  child.on('error', (error) => {
    job.exitCode = 1;
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.output = `${job.output}\n${error.message}`.slice(-MAX_OUTPUT);
    notifyJobFinished(job);
  });

  return job;
}

/** Surfaces a finished async job as a cockpit notification (unread event). */
function notifyJobFinished(job: CockpitJob): void {
  if (job.status === 'running') return;
  notificationStore.push({
    title: job.status === 'success' ? 'Job finished' : 'Job failed',
    body: `${job.action} — ${job.command}${job.exitCode == null ? '' : ` (exit ${job.exitCode})`}`,
    level: job.status === 'success' ? 'success' : 'failed',
  });
}


async function launchWorktreeFanout(body: WorktreeLaunchBody) {
  const prompt = String(body.prompt ?? '').trim();
  if (!prompt) throw new Error('prompt is required');
  const count = Math.min(Math.max(Number(body.count ?? 2), 1), 5);
  const promptSlug = slugify(prompt);
  const worktrees = await createFanoutWorktrees(repoRoot, count, promptSlug);
  const runAgents = body.runAgents === true && process.env.TERMORA_ENABLE_AGENT_SPAWN === '1';
  const agentId = String(body.agentId ?? '').trim();
  const profile = agentId ? getAgentRegistry().get(agentId) : undefined;
  if (agentId && !profile) throw new Error(`Unknown agent: ${agentId}`);
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

  if (runAgents && profile) {
    for (const worktree of worktrees) {
      agentJobs.push(startJob('agent-worktree', profile.command, expandArgs(profile, { prompt }), worktree.path));
    }
  } else if (runAgents && agentCommand) {
    const [command, ...args] = agentCommand.split(/\s+/);
    for (const worktree of worktrees) {
      agentJobs.push(startJob('agent-worktree', command, args.map((arg) => arg === '{prompt}' ? prompt : arg), worktree.path));
    }
  }

  return { prompt, count: worktrees.length, worktrees, agentJobs, agentSpawn: runAgents ? 'started' : 'not-requested' };
}

async function buildStatus() {
  const [branch, status, lastCommit] = await Promise.all([
    runCommand('git', ['branch', '--show-current']),
    runCommand('git', ['status', '--short']),
    runCommand('git', ['log', '-1', '--oneline']),
  ]);
  const registered = getAgentRegistry().list();

  return {
    machine: hostname(),
    root: repoRoot,
    git: {
      branch: branch.output || 'unknown',
      dirty: status.output.length > 0,
      status: status.output,
      lastCommit: lastCommit.output,
    },
    agents: registered.map((agent) => ({ id: agent.id, name: agent.name, state: agent.available ? 'ready' : 'unavailable', available: agent.available })),
    gates: ['lint', 'typecheck', 'test', 'build'],
    commands: ['git-status', 'run-gates', 'list-files', 'read-file', 'opencode-smoke', 'create-worktree-fanout', 'list-worktrees', 'github-status'],
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

  app.get('/api/cockpit/file', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      const requested = Number(req.query.maxBytes ?? MAX_PREVIEW_BYTES);
      const maxBytes = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 1), MAX_PREVIEW_BYTES)
        : MAX_PREVIEW_BYTES;
      res.json(readFilePreview(String(req.query.path ?? '.'), maxBytes));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to read file' });
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
        case 'read-file':
          res.json({ action: body.action, result: readFilePreview(body.path ?? '.') });
          return;
        case 'git-status':
          res.json({ action: body.action, result: await runCommand('git', ['status', '--short', '--branch']) });
          return;
        case 'run-gates':
          res.status(202).json({ action: body.action, job: startJob('run-gates', 'npm', ['run', 'lint']) });
          return;
        case 'opencode-smoke':
          res.json({ action: body.action, result: await runCommand('opencode', ['--version']) });
          return;
        case 'github-status':
          res.json({ action: body.action, result: await collectGithubStatus(runCommand) });
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


  app.get('/api/cockpit/github', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.json(await collectGithubStatus(runCommand));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to read GitHub status' });
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

  app.get('/api/cockpit/agents', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    res.json({ agents: getAgentRegistry().list(), states: AGENT_STATES });
  });

  app.post('/api/cockpit/agents', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    try {
      res.status(201).json({ agent: getAgentRegistry().register(req.body ?? {}) });
    } catch (error) {
      if (error instanceof AgentProfileError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to register agent' });
    }
  });

  app.delete('/api/cockpit/agents/:id', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const profile = getAgentRegistry().get(req.params.id);
    if (profile?.builtin) {
      res.status(400).json({ error: 'Built-in agents cannot be removed' });
      return;
    }
    if (!getAgentRegistry().remove(req.params.id)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ removed: req.params.id });
  });

  app.post('/api/cockpit/agents/:id/status', async (req, res) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const profile = getAgentRegistry().get(req.params.id);
    if (!profile) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const output = typeof req.body?.output === 'string' ? req.body.output : '';
    if (output.length > MAX_STATUS_INPUT) {
      res.status(413).json({ error: `output exceeds ${MAX_STATUS_INPUT} characters` });
      return;
    }
    res.json({ id: profile.id, state: parseAgentStatus(profile, output) });
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
