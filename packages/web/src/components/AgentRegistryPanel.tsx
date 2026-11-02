import { useCallback, useEffect, useState } from 'react';
import { AgentIcon } from '../lib/agent-icons';
import {
  AGENT_STATES,
  classifyOutput,
  listAgents,
  registerAgent,
  removeAgent,
  type AgentState,
  type RegistryAgent,
} from '../lib/agents-api';

interface AgentRegistryPanelProps {
  authToken: string | null;
}

const EMPTY_DRAFT = { id: '', name: '', command: '', argsText: '' };

export function AgentRegistryPanel({ authToken }: AgentRegistryPanelProps) {
  const [agents, setAgents] = useState<RegistryAgent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [probeAgent, setProbeAgent] = useState('claude');
  const [probeOutput, setProbeOutput] = useState('');
  const [probeState, setProbeState] = useState<AgentState | null>(null);

  const refresh = useCallback(async () => {
    if (!authToken) return;
    try {
      setAgents(await listAgents(authToken));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load agents');
    }
  }, [authToken]);

  useEffect(() => { void refresh(); }, [refresh]);

  const guarded = async (work: () => Promise<void>) => {
    if (!authToken || busy) return;
    setBusy(true);
    try {
      await work();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const onAdd = (event: React.FormEvent) => {
    event.preventDefault();
    void guarded(async () => {
      await registerAgent(authToken as string, draft);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
      await refresh();
    });
  };

  const onRemove = (id: string) => void guarded(async () => {
    await removeAgent(authToken as string, id);
    await refresh();
  });

  const onProbe = () => void guarded(async () => {
    setProbeState(await classifyOutput(authToken as string, probeAgent, probeOutput));
  });

  const ready = agents?.filter((agent) => agent.available).length ?? 0;

  return (
    <section className="tm-oct-agent-pane tm-registry-pane">
      <div className="tm-oct-pane-head">
        <div><strong>Agent registry</strong></div>
        <span>{agents ? `${ready}/${agents.length} installed` : '…'}</span>
      </div>
      {!authToken ? (
        <p className="tm-oct-github-note">Pair this device to manage agents.</p>
      ) : (
        <>
          {error && <p className="tm-oct-github-note tm-registry-error" role="alert">{error}</p>}
          {!agents && !error && <p className="tm-oct-github-note">Loading agents…</p>}
          {agents && agents.length === 0 && <p className="tm-oct-github-note">No agents registered. Add one below.</p>}
          {agents && agents.length > 0 && (
            <ul className="tm-registry-list">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <span style={{ display: 'flex', flexShrink: 0, opacity: agent.available ? 1 : 0.4 }} title={agent.available ? 'installed' : 'not found on PATH'}>
                    <AgentIcon agent={agent.id} size={14} />
                  </span>
                  <div>
                    <strong>{agent.name}</strong>
                    <span>{agent.command} {agent.args.join(' ')}</span>
                  </div>
                  {agent.builtin
                    ? <em>built-in</em>
                    : <button type="button" disabled={busy} onClick={() => onRemove(agent.id)} aria-label={`Remove ${agent.name}`}>Remove</button>}
                </li>
              ))}
            </ul>
          )}
          {adding ? (
            <form className="tm-registry-form" onSubmit={onAdd}>
              <input aria-label="Agent id" placeholder="id (e.g. my-agent)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} required />
              <input aria-label="Agent name" placeholder="Display name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              <input aria-label="Agent command" placeholder="command (name or absolute path)" value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value })} required />
              <textarea aria-label="Agent arguments" placeholder={'one argument per line\n{prompt} is replaced by the task'} rows={3} value={draft.argsText} onChange={(e) => setDraft({ ...draft, argsText: e.target.value })} />
              <div>
                <button type="submit" disabled={busy}>Save agent</button>
                <button type="button" onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className="tm-oct-github-refresh" onClick={() => setAdding(true)}>Add agent</button>
          )}
          <div className="tm-registry-probe">
            <strong>Status check</strong>
            <select aria-label="Agent to classify with" value={probeAgent} onChange={(e) => setProbeAgent(e.target.value)}>
              {(agents ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            <textarea aria-label="Terminal output to classify" placeholder="Paste terminal output" rows={3} value={probeOutput} onChange={(e) => setProbeOutput(e.target.value)} />
            <button type="button" disabled={busy || !agents?.length} onClick={onProbe}>Classify</button>
            {probeState && <span className={`tm-registry-state ${probeState}`}>{probeState}</span>}
            <small>Heuristic: states are one of {AGENT_STATES.join(', ')}.</small>
          </div>
        </>
      )}
    </section>
  );
}
