// Minimal HTTP client for a running Termora agent's cockpit API.
//
// Auth mirrors the web app: a static/bootstrap token is exchanged once for a
// session JWT via POST /api/auth/bootstrap. Tokens that already look like a JWT
// are used directly, so TERMORA_TOKEN can be either kind. Reading the two env
// vars lives here (rather than the entry point) so the contract is unit-testable
// without spawning a process.
export class TermoraError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'TermoraError';
    }
}
/** Reads the two env vars the CLI needs; returns null unless both are set. */
export function readEnv(env = process.env) {
    const url = env.TERMORA_URL?.trim();
    const token = env.TERMORA_TOKEN?.trim();
    if (!url || !token)
        return null;
    return { url, token };
}
/** Drops trailing slashes so path joining never doubles up. */
export function normalizeBaseUrl(url) {
    return url.replace(/\/+$/, '');
}
/** A JWT has exactly three dot-separated segments; a raw token does not. */
export function looksLikeJwt(token) {
    return token.length > 0 && token.split('.').length === 3;
}
async function readErrorMessage(res) {
    try {
        const data = (await res.json());
        if (data && typeof data.error === 'string')
            return data.error;
    }
    catch {
        // Body was not JSON; fall through to the generic message.
    }
    return `Request failed with status ${String(res.status)}`;
}
export class TermoraClient {
    baseUrl;
    token;
    fetchImpl;
    authHeader = null;
    constructor(env, fetchImpl = fetch) {
        this.baseUrl = normalizeBaseUrl(env.url);
        this.token = env.token;
        this.fetchImpl = fetchImpl;
    }
    async authHeaderValue() {
        if (this.authHeader !== null)
            return this.authHeader;
        const header = looksLikeJwt(this.token) ? `Bearer ${this.token}` : await this.exchangeToken();
        this.authHeader = header;
        return header;
    }
    async exchangeToken() {
        const res = await this.fetchImpl(`${this.baseUrl}/api/auth/bootstrap`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: this.token }),
        });
        if (!res.ok)
            throw new TermoraError(await readErrorMessage(res), res.status);
        const data = (await res.json());
        if (typeof data.token !== 'string' || data.token.length === 0) {
            throw new TermoraError('Authentication response did not include a token', res.status);
        }
        return `Bearer ${data.token}`;
    }
    async getStatus() {
        return this.getJson('/api/cockpit/status');
    }
    async getFile(path, maxBytes) {
        const params = new URLSearchParams({ path });
        if (maxBytes !== undefined)
            params.set('maxBytes', String(maxBytes));
        return this.getJson(`/api/cockpit/file?${params.toString()}`);
    }
    async getJson(pathname) {
        const res = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
            headers: { authorization: await this.authHeaderValue() },
        });
        if (!res.ok)
            throw new TermoraError(await readErrorMessage(res), res.status);
        return (await res.json());
    }
}
//# sourceMappingURL=client.js.map