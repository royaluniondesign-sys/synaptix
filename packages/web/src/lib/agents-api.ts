/** Client for the cockpit agent registry (`/api/cockpit/agents`). */

export const AGENT_STATES = ['idle', 'running', 'editing', 'testing', 'waiting', 'failed', 'done'] as const;
export type AgentState = (typeof AGENT_STATES)[number];

export interface RegistryAgent {
  id: string;
  name: string;
  command: string;
  args: string[];
  builtin: boolean;
  available: boolean;
}

export type AgentsFetch = (input: string, init?: RequestInit) => Promise<Response>;

export class AgentsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readError(response: Response): Promise<AgentsApiError> {
  let detail = '';
  try {
    detail = ((await response.json()) as { error?: string }).error ?? '';
  } catch {
    // Body was not JSON; fall back to the status text below.
  }
  if (response.status === 401) return new AgentsApiError('Session expired — pair again to manage agents', 401);
  return new AgentsApiError(detail || `Request failed (${response.status})`, response.status);
}

function headers(token: string, json = false): HeadersInit {
  return json ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { Authorization: `Bearer ${token}` };
}

export async function listAgents(token: string, doFetch: AgentsFetch = fetch): Promise<RegistryAgent[]> {
  const response = await doFetch('/api/cockpit/agents', { headers: headers(token) });
  if (!response.ok) throw await readError(response);
  return ((await response.json()) as { agents: RegistryAgent[] }).agents;
}

export interface AgentDraft {
  id: string;
  name: string;
  command: string;
  /** One argv element per line; blank lines are dropped. Empty means `{prompt}`. */
  argsText: string;
}

/** Turns the form draft into the API payload. */
export function draftToPayload(draft: AgentDraft) {
  const args = draft.argsText.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    command: draft.command.trim(),
    args: args.length > 0 ? args : ['{prompt}'],
  };
}

export async function registerAgent(token: string, draft: AgentDraft, doFetch: AgentsFetch = fetch): Promise<RegistryAgent> {
  const response = await doFetch('/api/cockpit/agents', {
    method: 'POST',
    headers: headers(token, true),
    body: JSON.stringify(draftToPayload(draft)),
  });
  if (!response.ok) throw await readError(response);
  return ((await response.json()) as { agent: RegistryAgent }).agent;
}

export async function removeAgent(token: string, id: string, doFetch: AgentsFetch = fetch): Promise<void> {
  const response = await doFetch(`/api/cockpit/agents/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers(token) });
  if (!response.ok) throw await readError(response);
}

export async function classifyOutput(token: string, id: string, output: string, doFetch: AgentsFetch = fetch): Promise<AgentState> {
  const response = await doFetch(`/api/cockpit/agents/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    headers: headers(token, true),
    body: JSON.stringify({ output }),
  });
  if (!response.ok) throw await readError(response);
  return ((await response.json()) as { state: AgentState }).state;
}
