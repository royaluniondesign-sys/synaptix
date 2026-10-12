export type FetchLike = typeof fetch;
export interface TermoraEnv {
    url: string;
    token: string;
}
export interface CockpitAgent {
    id: string;
    name: string;
    state: string;
    available: boolean;
    version?: string;
}
export interface CockpitStatus {
    machine: string;
    root: string;
    git: {
        branch: string;
        dirty: boolean;
        status: string;
        lastCommit: string;
    };
    agents: CockpitAgent[];
    gates: string[];
    commands: string[];
    worktrees: unknown[];
    recentJobs: unknown[];
}
export interface FilePreview {
    path: string;
    size: number;
    truncated: boolean;
    binary: boolean;
    content: string;
}
export declare class TermoraError extends Error {
    readonly status?: number | undefined;
    constructor(message: string, status?: number | undefined);
}
/** Reads the two env vars the CLI needs; returns null unless both are set. */
export declare function readEnv(env?: NodeJS.ProcessEnv): TermoraEnv | null;
/** Drops trailing slashes so path joining never doubles up. */
export declare function normalizeBaseUrl(url: string): string;
/** A JWT has exactly three dot-separated segments; a raw token does not. */
export declare function looksLikeJwt(token: string): boolean;
export declare class TermoraClient {
    private readonly baseUrl;
    private readonly token;
    private readonly fetchImpl;
    private authHeader;
    constructor(env: TermoraEnv, fetchImpl?: FetchLike);
    private authHeaderValue;
    private exchangeToken;
    getStatus(): Promise<CockpitStatus>;
    getFile(path: string, maxBytes?: number): Promise<FilePreview>;
    private getJson;
}
//# sourceMappingURL=client.d.ts.map