import { type CockpitStatus, type FilePreview, type TermoraEnv } from './client.js';
export interface CliIo {
    out: (line: string) => void;
    err: (line: string) => void;
}
/** The subset of TermoraClient the CLI uses; easy to stub in tests. */
export interface CockpitClient {
    getStatus(): Promise<CockpitStatus>;
    getFile(path: string, maxBytes?: number): Promise<FilePreview>;
}
export interface RunDeps {
    version: string;
    env?: NodeJS.ProcessEnv;
    io?: CliIo;
    createClient?: (env: TermoraEnv) => CockpitClient;
}
export declare const HELP = "termora \u2014 remote cockpit CLI\n\nUsage:\n  termora help                 Show this help\n  termora version              Show the CLI version\n  termora status               Show status (remote cockpit, or a local fallback)\n  termora file <path>          Preview a repo file served by the agent\n         [--max-bytes <n>]     Cap preview bytes (agent caps at 256 KiB)\n\nEnvironment:\n  TERMORA_URL     Base URL of a running agent, e.g. http://127.0.0.1:4030\n  TERMORA_TOKEN   Bootstrap or static token for that agent\n\nWith TERMORA_URL and TERMORA_TOKEN set, \"status\" and \"file\" query the agent.\nWithout them, \"status\" prints local CLI info and makes no network calls.";
export declare function run(argv: readonly string[], deps: RunDeps): Promise<number>;
//# sourceMappingURL=run.d.ts.map