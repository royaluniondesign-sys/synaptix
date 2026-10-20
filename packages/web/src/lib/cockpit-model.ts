/**
 * Pure derivations from the cockpit status the agent reports. Everything the
 * dashboard shows about tasks, agents and capabilities comes through here, so
 * the screen can only display state the backend actually returned.
 */

export type DotTone = 'green' | 'orange' | 'red' | 'muted';

export interface CockpitStatusLike {
  machine: string;
  root: string;
  git: { branch: string; dirty: boolean; lastCommit: string };
  agents: Array<{ id: string; name: string; state: string; available: boolean }>;
  worktrees?: Array<{ index: number; path: string; branch: string }>;
  recentJobs: Array<{ id: string; action: string; status: string; output: string }>;
  gates?: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  meta: string;
  status: DotTone;
  agent: string;
  next: string;
  command: string;
}

export interface AgentItem {
  id: string;
  name: string;
  state: string;
  work: string;
  tone: DotTone;
}

export const OVERVIEW_TASK_ID = 'overview';

const JOB_TONE: Record<string, DotTone> = { running: 'orange', success: 'green', failed: 'red' };

export function overviewTask(status: CockpitStatusLike | null): TaskItem {
  return {
    id: OVERVIEW_TASK_ID,
    title: status ? `${status.machine} · ${status.git.branch || 'detached'}` : 'Connecting…',
    meta: status ? status.git.lastCommit || 'no commits' : 'waiting for the agent',
    status: status ? (status.git.dirty ? 'orange' : 'green') : 'muted',
    agent: '—',
    next: '',
    command: 'git status',
  };
}

/** Tasks are the things the backend knows about: fan-out worktrees and recent jobs. */
export function deriveTasks(status: CockpitStatusLike | null): TaskItem[] {
  if (!status) return [];
  const worktrees = (status.worktrees ?? []).map((worktree): TaskItem => ({
    id: `worktree:${worktree.branch}`,
    title: worktree.branch,
    meta: worktree.path,
    status: 'green',
    agent: '—',
    next: '',
    command: `cd ${worktree.path}`,
  }));
  const jobs = status.recentJobs.map((job): TaskItem => ({
    id: `job:${job.id}`,
    title: job.action,
    meta: job.status,
    status: JOB_TONE[job.status] ?? 'muted',
    agent: '—',
    next: '',
    command: job.action,
  }));
  return [...worktrees, ...jobs];
}

export function deriveAgents(status: CockpitStatusLike | null): AgentItem[] {
  if (!status) return [];
  return status.agents.map((agent): AgentItem => ({
    id: agent.id,
    name: agent.name,
    state: agent.available ? 'installed' : 'not installed',
    work: agent.available ? 'found on PATH' : 'not found on PATH',
    tone: agent.available ? 'green' : 'muted',
  }));
}

/** One line about the last `run-gates` job, or an honest "never run". */
export function gateSummary(status: CockpitStatusLike | null): string {
  const job = status?.recentJobs.find((candidate) => candidate.action === 'run-gates');
  if (!job) return 'Gates have not been run from this cockpit yet.';
  return `Last gate run (lint): ${job.status}.`;
}

export type CapabilityState = 'live' | 'backend' | 'planned';
export interface CapabilityItem {
  name: string;
  state: CapabilityState;
  detail: string;
  action: string;
}

/** Mirrors the capability table in ROADMAP.md. Change both together. */
export const CAPABILITIES: CapabilityItem[] = [
  { name: 'Mobile Companion', state: 'backend', detail: 'PWA works; native app is a scaffold', action: 'native build, push, secure storage' },
  { name: 'Parallel Worktrees', state: 'backend', detail: 'fan-out API and UI actions', action: 'compare diffs, merge winner' },
  { name: 'Terminal Splits', state: 'backend', detail: 'split layouts and multi-pane view', action: 'save layouts, keep scrollback' },
  { name: 'Design Mode', state: 'planned', detail: 'not started', action: 'DOM/CSS capture into a prompt' },
  { name: 'GitHub & task workflows', state: 'backend', detail: 'read-only GitHub status', action: 'PRs, issues, task boards' },
  { name: 'SSH Worktrees', state: 'planned', detail: 'not started', action: 'host registry, SSH launch' },
  { name: 'Annotate AI Diffs', state: 'planned', detail: 'not started', action: 'inline comments to the agent' },
  { name: 'Drag Files to Agents', state: 'planned', detail: 'not started', action: 'attachments into prompts' },
  { name: 'Synaptix CLI', state: 'live', detail: 'help, version, status, file', action: 'worktrees, snapshots, agent runs' },
  { name: 'Quick Open', state: 'backend', detail: 'Cmd+K fuzzy search', action: 'sessions, views, quick actions' },
  { name: 'Usage Tracking', state: 'planned', detail: 'not started', action: 'rate limits and accounts' },
  { name: 'Rich Repo Previews', state: 'backend', detail: 'text file preview only', action: 'Markdown, images, PDF' },
  { name: 'Computer Use', state: 'planned', detail: 'not started', action: 'safe visible-UI workflows' },
  { name: 'Notifications/unread', state: 'backend', detail: 'backend events and unread view', action: 'push for done/failed/needs input' },
  { name: 'Any CLI Agent', state: 'live', detail: 'registry and status parser (beta)', action: 'live session status badges' },
];
