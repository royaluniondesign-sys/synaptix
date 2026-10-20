/**
 * Browser-only demo backend. When the web app is built with VITE_DEMO=1 it
 * replaces fetch, WebSocket and EventSource for same-origin requests with
 * in-memory fakes so the real interface can be tried with no server.
 *
 * Everything it returns is sample data and a banner says so. It is never
 * included in a normal build.
 */

import { BUILTIN_AGENTS, DEMO_FILES, DEMO_FILE_CONTENT, DEMO_GITHUB, DEMO_NOTIFICATIONS, classifyDemoOutput, type DemoAgent } from './cockpit-data';
import { DEMO_PROJECT, agentScript, runLine } from './fake-shell';

type Json = Record<string, unknown>;

interface DemoJob { id: string; action: string; status: string; startedAt: string; finishedAt: string | null; exitCode: number | null; output: string }
interface DemoWorktree { index: number; path: string; branch: string }

const state = {
  customAgents: [] as DemoAgent[],
  worktrees: [] as DemoWorktree[],
  jobs: [] as DemoJob[],
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const allAgents = (): DemoAgent[] => [...BUILTIN_AGENTS, ...state.customAgents];

function cockpitStatus(): Json {
  return {
    machine: 'demo-machine',
    root: `/home/demo/${DEMO_PROJECT}`,
    gates: ['lint', 'typecheck', 'test', 'build'],
    git: { branch: 'main', dirty: true, status: ' M src/server.ts', lastCommit: '3f9c2a1 Add retry to the upload worker' },
    agents: allAgents().map((agent) => ({ id: agent.id, name: agent.name, state: agent.available ? 'ready' : 'unavailable', available: agent.available })),
    worktrees: state.worktrees,
    recentJobs: [...state.jobs].reverse().slice(0, 8),
    files: { entries: DEMO_FILES },
  };
}

async function route(method: string, url: URL, body: Json): Promise<Response | null> {
  const path = url.pathname;
  if (method === 'POST' && path === '/api/auth/bootstrap') return json({ token: 'demo' });
  if (method === 'GET' && path === '/api/health') return json({ status: 'ok', timestamp: new Date().toISOString() });
  if (method === 'GET' && path === '/api/info') return json({ tunnelUrl: null, tunnelMethod: null, authUrl: null, machineName: 'demo-machine', version: 'demo' });
  if (method === 'GET' && path === '/api/devices') return json({ devices: [{ id: 'demo', deviceName: 'This browser (demo)', createdAt: '2026-10-12T09:00:00.000Z', lastSeen: '2026-10-12T09:00:00.000Z', current: true }] });
  if (path.startsWith('/api/devices')) return json({ ok: true });
  if (method === 'POST' && path === '/api/events/read') return json({ ok: true });
  if (method === 'GET' && path === '/api/cockpit/status') return json(cockpitStatus());
  if (method === 'GET' && path === '/api/cockpit/github') return json(DEMO_GITHUB);
  if (method === 'GET' && path === '/api/cockpit/file') {
    const target = url.searchParams.get('path') ?? '';
    const content = DEMO_FILE_CONTENT[target];
    if (content === undefined) return json({ error: 'File not found (demo)' }, 404);
    return json({ path: target, size: content.length, truncated: false, binary: false, content });
  }
  if (method === 'GET' && path === '/api/cockpit/worktrees') return json({ worktrees: state.worktrees });
  if (method === 'POST' && path === '/api/cockpit/worktrees/fanout') {
    const count = Math.min(Math.max(Number(body.count ?? 2), 1), 5);
    const prompt = String(body.prompt ?? '').trim();
    if (!prompt) return json({ error: 'prompt is required' }, 400);
    const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24).replace(/^-|-$/g, '');
    const created = Array.from({ length: count }, (_, i) => ({ index: state.worktrees.length + i + 1, path: `/tmp/demo-worktrees/${slug}-${i + 1}`, branch: `fanout/${slug}-${i + 1}` }));
    state.worktrees.push(...created);
    return json({ prompt, count, worktrees: created, agentJobs: [], agentSpawn: 'not-requested' }, 201);
  }
  if (method === 'DELETE' && path === '/api/cockpit/worktrees') {
    const removed = state.worktrees.map((worktree) => worktree.path);
    state.worktrees = [];
    return json({ removed });
  }
  if (method === 'POST' && path === '/api/cockpit/actions') {
    const action = String(body.action ?? '');
    if (action === 'run-gates') {
      const job: DemoJob = { id: `demo-job-${state.jobs.length + 1}`, action, status: 'success', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), exitCode: 0, output: 'simulated: lint passed' };
      state.jobs.push(job);
      return json({ action, job }, 202);
    }
    if (action === 'github-status') return json({ action, result: DEMO_GITHUB });
    if (action === 'list-files') return json({ action, result: { entries: DEMO_FILES } });
    return json({ action, result: { ok: true, output: 'simulated' } });
  }
  if (method === 'GET' && path === '/api/cockpit/ports') return json({ ports: [] });
  if (method === 'GET' && path === '/api/cockpit/agents') {
    return json({ agents: allAgents(), states: ['idle', 'running', 'editing', 'testing', 'waiting', 'failed', 'done'] });
  }
  if (method === 'POST' && path === '/api/cockpit/agents') {
    const id = String(body.id ?? '').trim();
    const name = String(body.name ?? '').trim();
    const command = String(body.command ?? '').trim();
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(id)) return json({ error: 'id must be 1-32 chars of a-z, 0-9 or "-"' }, 400);
    if (!name || !command || /[\s;|&$`'"]/.test(command)) return json({ error: 'name and a plain command are required' }, 400);
    if (allAgents().some((agent) => agent.id === id)) return json({ error: `"${id}" already exists` }, 400);
    const args = Array.isArray(body.args) ? (body.args as unknown[]).map(String) : ['{prompt}'];
    const agent: DemoAgent = { id, name, command, args, builtin: false, available: false };
    state.customAgents.push(agent);
    return json({ agent }, 201);
  }
  const agentMatch = /^\/api\/cockpit\/agents\/([^/]+)(\/status)?$/.exec(path);
  if (agentMatch) {
    const id = decodeURIComponent(agentMatch[1]);
    if (method === 'DELETE') {
      if (BUILTIN_AGENTS.some((agent) => agent.id === id)) return json({ error: 'Built-in agents cannot be removed' }, 400);
      const before = state.customAgents.length;
      state.customAgents = state.customAgents.filter((agent) => agent.id !== id);
      return before === state.customAgents.length ? json({ error: 'Agent not found' }, 404) : json({ removed: id });
    }
    if (method === 'POST' && agentMatch[2]) {
      if (!allAgents().some((agent) => agent.id === id)) return json({ error: 'Agent not found' }, 404);
      return json({ id, state: classifyDemoOutput(String(body.output ?? '')) });
    }
  }
  return null;
}

function installFetch(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      let body: Json = {};
      try { body = init?.body ? (JSON.parse(String(init.body)) as Json) : {}; } catch { /* not JSON */ }
      const response = await route((init?.method ?? 'GET').toUpperCase(), url, body);
      return response ?? json({ error: 'Not available in the demo' }, 404);
    }
    return realFetch(input, init);
  };
}

interface DemoSession { id: string; shell: string; name: string; line: string }

class DemoWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readyState = 0;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private sessions = new Map<string, DemoSession>();
  private counter = 0;
  private timers: number[] = [];

  constructor(url: string | URL) {
    this.url = String(url);
    this.timers.push(window.setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event('open'));
    }, 30));
  }

  private emit(message: Json): void {
    window.setTimeout(() => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) })), 0);
  }

  private out(sessionId: string, data: string): void {
    this.emit({ type: 'stdout', sessionId, data });
  }

  private prompt(session: DemoSession): string {
    return session.shell === 'claude' ? '\x1b[35m>\x1b[0m ' : `\x1b[32mdemo@demo-machine\x1b[0m ${DEMO_PROJECT} % `;
  }

  private create(shell: string, name?: string): void {
    this.counter += 1;
    const id = `demo-${this.counter}`;
    const label = name ?? `${shell} ${this.counter}`;
    const session: DemoSession = { id, shell, name: label, line: '' };
    this.sessions.set(id, session);
    this.emit({ type: 'session', sessionId: id, shell, pid: 1000 + this.counter, name: label, cwd: `/home/demo/${DEMO_PROJECT}`, status: 'run' });
    const banner = shell === 'claude'
      ? '\x1b[33mSimulated agent session. Type a task and press Enter. No agent is running.\x1b[0m\r\n'
      : '\x1b[33mSimulated shell. Type help. Nothing here runs on a real machine.\x1b[0m\r\n';
    this.timers.push(window.setTimeout(() => this.out(id, banner + this.prompt(session)), 60));
  }

  private stdin(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    for (const char of data) {
      if (char === '\r') {
        const line = session.line;
        session.line = '';
        this.out(sessionId, '\r\n');
        this.run(session, line);
      } else if (char === '\x7f') {
        if (session.line.length > 0) { session.line = session.line.slice(0, -1); this.out(sessionId, '\b \b'); }
      } else if (char >= ' ') {
        session.line += char;
        this.out(sessionId, char);
      }
    }
  }

  private run(session: DemoSession, line: string): void {
    if (session.shell === 'claude') {
      const steps = agentScript(line);
      steps.forEach((step, index) => {
        this.timers.push(window.setTimeout(() => {
          this.out(session.id, `${step}\r\n`);
          if (index === steps.length - 1) this.out(session.id, this.prompt(session));
        }, 500 * (index + 1)));
      });
      return;
    }
    const result = runLine(line);
    if (result.clear) this.out(session.id, '\x1b[2J\x1b[H');
    else if (result.output) this.out(session.id, `${result.output}\r\n`);
    this.out(session.id, this.prompt(session));
  }

  send(raw: string): void {
    let message: Json;
    try { message = JSON.parse(raw) as Json; } catch { return; }
    switch (message.type) {
      case 'ping': this.emit({ type: 'pong' }); break;
      case 'session_list':
        this.emit({ type: 'session_list', sessions: [...this.sessions.values()].map((session, index) => ({ id: session.id, shell: session.shell, pid: 1001 + index, name: session.name, cwd: `/home/demo/${DEMO_PROJECT}`, status: 'run' })) });
        break;
      case 'session_create': this.create(String(message.shell ?? 'zsh'), typeof message.name === 'string' ? message.name : undefined); break;
      case 'stdin': this.stdin(String(message.sessionId), String(message.data ?? '')); break;
      case 'session_close':
        this.sessions.delete(String(message.sessionId));
        this.emit({ type: 'exit', sessionId: String(message.sessionId), exitCode: 0 });
        break;
      case 'session_rename': {
        const session = this.sessions.get(String(message.sessionId));
        if (session) { session.name = String(message.name ?? session.name); this.emit({ type: 'session_update', sessionId: session.id, name: session.name, cwd: `/home/demo/${DEMO_PROJECT}`, status: 'run' }); }
        break;
      }
      case 'worktree_fanout': {
        const count = Math.min(Math.max(Number(message.count ?? 2), 1), 5);
        this.emit({ type: 'worktree_fanout_started', count, branches: Array.from({ length: count }, (_, i) => `fanout/demo-${i + 1}`) });
        break;
      }
      case 'worktree_cleanup': this.emit({ type: 'worktree_cleanup_done', removed: 0 }); break;
      default: break;
    }
  }

  close(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close', { code: 1000 }));
  }
}

class DemoEventSource {
  private listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  constructor() {
    window.setTimeout(() => {
      const data = JSON.stringify({ events: DEMO_NOTIFICATIONS, unreadCount: DEMO_NOTIFICATIONS.length });
      this.listeners.get('notifications-snapshot')?.forEach((listener) => listener(new MessageEvent('notifications-snapshot', { data })));
    }, 100);
  }
  addEventListener(name: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  removeEventListener(name: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(name, (this.listeners.get(name) ?? []).filter((item) => item !== listener));
  }
  close(): void { this.listeners.clear(); }
}

function showBanner(): void {
  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.textContent = 'DEMO · simulated backend. Nothing here runs on a real machine.';
  banner.style.cssText = 'position:fixed;right:10px;top:8px;z-index:99999;padding:4px 9px;border-radius:999px;font:600 10px system-ui,sans-serif;background:#f5a524;color:#1a1200;box-shadow:0 2px 12px rgba(0,0,0,.4);pointer-events:none';
  document.body.appendChild(banner);
}

export function installDemoBackend(): void {
  try { window.localStorage.setItem('synaptix_jwt', 'demo'); } catch { /* storage unavailable: the auth screen will show */ }
  installFetch();
  window.WebSocket = DemoWebSocket as unknown as typeof WebSocket;
  window.EventSource = DemoEventSource as unknown as typeof EventSource;
  showBanner();
}
