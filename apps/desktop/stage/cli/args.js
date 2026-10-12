// Pure, side-effect-free argument parsing so the command grammar is unit-testable
// without spawning a process or touching the network.
const MAX_BYTES_FLAG = '--max-bytes';
function readMaxBytes(args) {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        let raw;
        if (arg === MAX_BYTES_FLAG)
            raw = args[index + 1];
        else if (arg.startsWith(`${MAX_BYTES_FLAG}=`))
            raw = arg.slice(MAX_BYTES_FLAG.length + 1);
        if (raw === undefined)
            continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0)
            return undefined;
        return Math.trunc(value);
    }
    return undefined;
}
export function parseArgs(argv) {
    const args = argv.filter((arg) => arg.trim().length > 0);
    const [first, ...rest] = args;
    if (first === undefined)
        return { kind: 'help' };
    switch (first) {
        case 'help':
        case '--help':
        case '-h':
            return { kind: 'help' };
        case 'version':
        case '--version':
        case '-v':
            return { kind: 'version' };
        case 'status':
            return { kind: 'status' };
        case 'file': {
            const path = rest.find((arg) => !arg.startsWith('-'));
            if (path === undefined)
                return { kind: 'unknown', input: 'file <path> (missing path)' };
            const maxBytes = readMaxBytes(rest);
            return maxBytes === undefined ? { kind: 'file', path } : { kind: 'file', path, maxBytes };
        }
        default:
            return { kind: 'unknown', input: first };
    }
}
//# sourceMappingURL=args.js.map