export type Command = {
    kind: 'help';
} | {
    kind: 'version';
} | {
    kind: 'status';
} | {
    kind: 'file';
    path: string;
    maxBytes?: number;
} | {
    kind: 'unknown';
    input: string;
};
export declare function parseArgs(argv: readonly string[]): Command;
//# sourceMappingURL=args.d.ts.map