import { describe, expect, it } from 'vitest';
import { exerciseCockpit, looksLikeJwt, normalizeBaseUrl, readCockpitEnv, redact, } from '../../../../scripts/check-cockpit.mjs';
function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}
function mockFetch(handler) {
    let calls = 0;
    const impl = async (input) => {
        calls += 1;
        return handler(String(input), calls);
    };
    return { impl, calls: () => calls };
}
function statusBody() {
    return {
        machine: 'host',
        root: '/repo',
        git: { branch: 'main', dirty: false, status: '', lastCommit: 'abc' },
        agents: [],
        gates: [],
        commands: [],
        worktrees: [],
        recentJobs: [],
    };
}
/** Routes every dogfood endpoint to a healthy 200 so the run passes. */
function healthyFetch() {
    return mockFetch((input) => {
        if (input.endsWith('/api/auth/bootstrap'))
            return jsonResponse({ token: 'issued.jwt' });
        if (input.includes('/api/health'))
            return jsonResponse({ status: 'ok' });
        if (input.includes('/api/cockpit/status'))
            return jsonResponse(statusBody());
        if (input.includes('/api/cockpit/files'))
            return jsonResponse({ entries: [] });
        if (input.includes('/api/cockpit/file'))
            return jsonResponse({
                path: 'README.md',
                size: 7,
                truncated: false,
                binary: false,
                content: '# x',
            });
        if (input.includes('/api/cockpit/github'))
            return jsonResponse({ installed: true, authenticated: false });
        if (input.includes('/api/events'))
            return jsonResponse({ events: [], unreadCount: 0 });
        return jsonResponse({ error: 'not found' }, 404);
    });
}
describe('readCockpitEnv (skip when absent)', () => {
    it('returns null unless both TERMORA_URL and TERMORA_TOKEN are set', () => {
        expect(readCockpitEnv({})).toBeNull();
        expect(readCockpitEnv({ TERMORA_URL: 'http://x' })).toBeNull();
        expect(readCockpitEnv({ TERMORA_TOKEN: 't' })).toBeNull();
    });
    it('trims and returns both values', () => {
        expect(readCockpitEnv({ TERMORA_URL: ' http://x ', TERMORA_TOKEN: ' t ' })).toEqual({
            url: 'http://x',
            token: 't',
        });
    });
});
describe('normalizeBaseUrl', () => {
    it('strips trailing slashes', () => {
        expect(normalizeBaseUrl('http://x/')).toBe('http://x');
    });
});
describe('looksLikeJwt', () => {
    it('detects three-segment tokens only', () => {
        expect(looksLikeJwt('a.b.c')).toBe(true);
        expect(looksLikeJwt('static-token')).toBe(false);
    });
});
describe('redact', () => {
    it('replaces the raw token and any Bearer wrapper', () => {
        expect(redact('Authorization: Bearer static-token', 'static-token', 'jwt.signed.x')).toBe('Authorization: Bearer [redacted]');
    });
    it('also strips the exchanged JWT when it differs from the input token', () => {
        const output = redact('login jwt.signed.x then static-token', 'static-token', 'jwt.signed.x');
        expect(output).toBe('login [redacted] then [redacted]');
        expect(output).not.toContain('jwt.signed.x');
        expect(output).not.toContain('static-token');
    });
});
describe('exerciseCockpit', () => {
    it('exchanges a static token then passes every cockpit endpoint', async () => {
        const fetchImpl = healthyFetch();
        const result = await exerciseCockpit({ url: 'http://agent:4030/', token: 'static' }, fetchImpl.impl);
        expect(result.ok).toBe(true);
        // Bootstrap + the 6 probed endpoints.
        expect(fetchImpl.calls()).toBe(7);
    });
    it('skips bootstrapping when the token is already a JWT', async () => {
        const fetchImpl = healthyFetch();
        const result = await exerciseCockpit({ url: 'http://agent:4030', token: 'a.b.c' }, fetchImpl.impl);
        expect(result.ok).toBe(true);
        expect(result.results[0]?.label).toBe('health');
        // No bootstrap call was made.
        expect(fetchImpl.calls()).toBe(6);
    });
    it('redacts the token from error details', async () => {
        const fetchImpl = mockFetch((_input) => {
            throw new Error('connection refused while using abc123secret');
        });
        const result = await exerciseCockpit({ url: 'http://agent:4030', token: 'abc123secret' }, fetchImpl.impl);
        expect(result.ok).toBe(false);
        const lines = result.results.map((entry) => JSON.stringify(entry)).join(' ');
        expect(lines).toContain('[redacted]');
        expect(lines).not.toContain('abc123secret');
    });
    it('fails cleanly when bootstrap is rejected', async () => {
        const fetchImpl = mockFetch(() => jsonResponse({ error: 'Invalid or expired bootstrap token' }, 401));
        const result = await exerciseCockpit({ url: 'http://agent:4030', token: 'bad' }, fetchImpl.impl);
        expect(result.ok).toBe(false);
        expect(result.results[0]).toMatchObject({ label: 'auth/bootstrap', ok: false });
    });
    it('flags a 200 that returns the wrong shape', async () => {
        const healthy = healthyFetch();
        const fetchImpl = mockFetch((input) => {
            if (input.endsWith('/api/cockpit/status'))
                return jsonResponse({ unexpected: true });
            return healthy.impl(input);
        });
        const result = await exerciseCockpit({ url: 'http://agent:4030', token: 'a.b.c' }, fetchImpl.impl);
        const status = result.results.find((entry) => entry.label === 'cockpit/status');
        expect(status).toMatchObject({ ok: false, detail: 'unexpected response shape' });
    });
});
//# sourceMappingURL=cockpit-check.test.js.map