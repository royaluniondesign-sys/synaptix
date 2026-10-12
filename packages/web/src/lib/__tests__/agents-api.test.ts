import { describe, it, expect, vi } from 'vitest';
import { AgentsApiError, classifyOutput, draftToPayload, listAgents, registerAgent, removeAgent } from '../agents-api';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('draftToPayload', () => {
  it('trims fields, splits args by line and defaults to the prompt', () => {
    expect(draftToPayload({ id: ' mine ', name: ' Mine ', command: ' mine ', argsText: '--task\n\n  {prompt} \n' })).toEqual({
      id: 'mine', name: 'Mine', command: 'mine', args: ['--task', '{prompt}'],
    });
    expect(draftToPayload({ id: 'a', name: 'A', command: 'a', argsText: '  \n' }).args).toEqual(['{prompt}']);
  });
});

describe('agents api', () => {
  it('sends the bearer token and returns the agent list', async () => {
    const doFetch = vi.fn().mockResolvedValue(json(200, { agents: [{ id: 'claude' }] }));
    expect(await listAgents('tok', doFetch)).toEqual([{ id: 'claude' }]);
    expect(doFetch).toHaveBeenCalledWith('/api/cockpit/agents', { headers: { Authorization: 'Bearer tok' } });
  });

  it('turns a 401 into a re-pair message', async () => {
    const error = await listAgents('tok', vi.fn().mockResolvedValue(json(401, { error: 'Invalid or expired token' }))).catch((e) => e);
    expect(error).toBeInstanceOf(AgentsApiError);
    expect(error.status).toBe(401);
    expect(error.message).toMatch(/pair again/i);
  });

  it('surfaces the server validation message on 400', async () => {
    const doFetch = vi.fn().mockResolvedValue(json(400, { error: 'id is required' }));
    await expect(registerAgent('tok', { id: '', name: 'x', command: 'x', argsText: '' }, doFetch)).rejects.toThrow('id is required');
  });

  it('url-encodes ids and posts output for classification', async () => {
    const doFetch = vi.fn().mockResolvedValue(json(200, { state: 'waiting' }));
    expect(await classifyOutput('tok', 'a/b', 'Proceed? [y/n]', doFetch)).toBe('waiting');
    expect(doFetch.mock.calls[0][0]).toBe('/api/cockpit/agents/a%2Fb/status');
    expect(JSON.parse(doFetch.mock.calls[0][1].body)).toEqual({ output: 'Proceed? [y/n]' });
  });

  it('removes an agent and reports failures', async () => {
    await expect(removeAgent('tok', 'mine', vi.fn().mockResolvedValue(json(200, { removed: 'mine' })))).resolves.toBeUndefined();
    await expect(removeAgent('tok', 'claude', vi.fn().mockResolvedValue(json(400, { error: 'Built-in agents cannot be removed' })))).rejects.toThrow(/built-in/i);
  });
});
