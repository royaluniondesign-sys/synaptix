import { describe, expect, it, vi } from 'vitest';
import { run, HELP } from '../run.js';
function makeIo() {
    const out = [];
    const err = [];
    const io = {
        out: (line) => out.push(line),
        err: (line) => err.push(line),
    };
    return { io, out, err };
}
const textPreview = {
    path: 'a.txt',
    size: 3,
    truncated: false,
    binary: false,
    content: 'hey',
};
function stubClient(overrides = {}) {
    return {
        getStatus: async () => {
            throw new Error('not used');
        },
        getFile: async () => textPreview,
        ...overrides,
    };
}
describe('run', () => {
    it('prints help and exits 0 by default', async () => {
        const { io, out } = makeIo();
        const code = await run([], { version: '9.9.9', env: {}, io });
        expect(code).toBe(0);
        expect(out.join('\n')).toContain('termora — remote cockpit CLI');
    });
    it('prints the version', async () => {
        const { io, out } = makeIo();
        const code = await run(['version'], { version: '9.9.9', env: {}, io });
        expect(code).toBe(0);
        expect(out).toEqual(['9.9.9']);
    });
    it('reports unknown commands', async () => {
        const { io, out, err } = makeIo();
        const code = await run(['nope'], { version: '1.0.0', env: {}, io });
        expect(code).toBe(1);
        expect(err.join('\n')).toContain('Unknown command: nope');
        expect(out.join('\n')).toBe(HELP);
    });
    it('falls back to local status when env is not configured', async () => {
        const { io, out } = makeIo();
        const code = await run(['status'], { version: '1.0.0', env: {}, io });
        expect(code).toBe(0);
        expect(out.join('\n')).toContain('local mode');
        expect(out.join('\n')).toContain('TERMORA_URL and TERMORA_TOKEN');
    });
    it('refuses file without env, without contacting anything', async () => {
        const createClient = vi.fn();
        const { io, err } = makeIo();
        const code = await run(['file', 'a.txt'], { version: '1.0.0', env: {}, io, createClient });
        expect(code).toBe(1);
        expect(err.join('\n')).toContain('must both be set');
        expect(createClient).not.toHaveBeenCalled();
    });
    it('renders remote status through the injected client', async () => {
        const createClient = vi.fn(() => stubClient({
            getStatus: async () => ({
                machine: 'buildbox',
                root: '/repo',
                git: { branch: 'main', dirty: true, status: ' M x', lastCommit: 'deadbee msg' },
                agents: [{ id: 'ci', name: 'GitHub CI', state: 'remote', available: true }],
                gates: ['lint', 'typecheck'],
                commands: [],
                worktrees: [],
                recentJobs: [],
            }),
        }));
        const { io, out } = makeIo();
        const code = await run(['status'], {
            version: '1.0.0',
            env: { TERMORA_URL: 'http://x', TERMORA_TOKEN: 't' },
            io,
            createClient,
        });
        expect(code).toBe(0);
        expect(out.join('\n')).toContain('machine: buildbox');
        expect(out.join('\n')).toContain('branch:  main (dirty)');
        expect(out.join('\n')).toContain('GitHub CI(remote)');
    });
    it('prints a text preview', async () => {
        const createClient = vi.fn(() => stubClient());
        const { io, out } = makeIo();
        const code = await run(['file', 'a.txt'], {
            version: '1.0.0',
            env: { TERMORA_URL: 'http://x', TERMORA_TOKEN: 't' },
            io,
            createClient,
        });
        expect(code).toBe(0);
        expect(out.join('\n')).toContain('# a.txt — 3 bytes');
        expect(out.join('\n')).toContain('hey');
    });
    it('notes binary previews without printing content', async () => {
        const createClient = vi.fn(() => stubClient({
            getFile: async () => ({
                path: 'logo.png',
                size: 10,
                truncated: false,
                binary: true,
                content: '',
            }),
        }));
        const { io, out } = makeIo();
        const code = await run(['file', 'logo.png'], {
            version: '1.0.0',
            env: { TERMORA_URL: 'http://x', TERMORA_TOKEN: 't' },
            io,
            createClient,
        });
        expect(code).toBe(0);
        expect(out.join('\n')).toContain('binary (not shown)');
    });
    it('surfaces client errors on stderr with exit 1', async () => {
        const createClient = vi.fn(() => stubClient({
            getStatus: async () => {
                throw new Error('Session revoked');
            },
        }));
        const { io, err } = makeIo();
        const code = await run(['status'], {
            version: '1.0.0',
            env: { TERMORA_URL: 'http://x', TERMORA_TOKEN: 't' },
            io,
            createClient,
        });
        expect(code).toBe(1);
        expect(err.join('\n')).toContain('Session revoked');
    });
});
//# sourceMappingURL=run.test.js.map