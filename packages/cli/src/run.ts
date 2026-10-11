// Command dispatch, separated from the process entry point so it can be driven
// with a fake IO and client in tests. Returns an exit code instead of calling
// process.exit directly.

import { parseArgs } from './args.js'
import {
  readEnv,
  TermoraClient,
  TermoraError,
  type CockpitStatus,
  type FilePreview,
  type TermoraEnv,
} from './client.js'

export interface CliIo {
  out: (line: string) => void
  err: (line: string) => void
}

/** The subset of TermoraClient the CLI uses; easy to stub in tests. */
export interface CockpitClient {
  getStatus(): Promise<CockpitStatus>
  getFile(path: string, maxBytes?: number): Promise<FilePreview>
}

export interface RunDeps {
  version: string
  env?: NodeJS.ProcessEnv
  io?: CliIo
  createClient?: (env: TermoraEnv) => CockpitClient
}

export const HELP = `termora — remote cockpit CLI

Usage:
  termora help                 Show this help
  termora version              Show the CLI version
  termora status               Show status (remote cockpit, or a local fallback)
  termora file <path>          Preview a repo file served by the agent
         [--max-bytes <n>]     Cap preview bytes (agent caps at 256 KiB)

Environment:
  TERMORA_URL     Base URL of a running agent, e.g. http://127.0.0.1:4030
  TERMORA_TOKEN   Bootstrap or static token for that agent

With TERMORA_URL and TERMORA_TOKEN set, "status" and "file" query the agent.
Without them, "status" prints local CLI info and makes no network calls.`

const defaultIo: CliIo = {
  out: (line) => {
    process.stdout.write(`${line}\n`)
  },
  err: (line) => {
    process.stderr.write(`${line}\n`)
  },
}

function printLocalStatus(io: CliIo, version: string): number {
  io.out('termora CLI (local mode — no agent configured)')
  io.out(`  version:  ${version}`)
  io.out(`  node:     ${process.version}`)
  io.out(`  platform: ${process.platform} ${process.arch}`)
  io.out(`  cwd:      ${process.cwd()}`)
  io.out('')
  io.out('Set TERMORA_URL and TERMORA_TOKEN to query a running agent.')
  return 0
}

function printRemoteStatus(io: CliIo, status: CockpitStatus): void {
  io.out(`machine: ${status.machine}`)
  io.out(`root:    ${status.root}`)
  io.out(`branch:  ${status.git.branch}${status.git.dirty ? ' (dirty)' : ''}`)
  io.out(`commit:  ${status.git.lastCommit}`)
  const agents = status.agents.map((agent) => `${agent.name}(${agent.state})`).join(', ')
  io.out(`agents:  ${agents || 'none'}`)
  io.out(`gates:   ${status.gates.join(', ')}`)
}

function printPreview(io: CliIo, preview: FilePreview): void {
  if (preview.binary) {
    io.out(`${preview.path} — ${preview.size} bytes, binary (not shown)`)
    return
  }
  const suffix = preview.truncated ? ', truncated' : ''
  io.out(`# ${preview.path} — ${preview.size} bytes${suffix}`)
  io.out(preview.content)
}

export async function run(argv: readonly string[], deps: RunDeps): Promise<number> {
  const io = deps.io ?? defaultIo
  const command = parseArgs(argv)

  switch (command.kind) {
    case 'help':
      io.out(HELP)
      return 0
    case 'version':
      io.out(deps.version)
      return 0
    case 'unknown':
      io.err(`Unknown command: ${command.input}`)
      io.out(HELP)
      return 1
    default:
      break
  }

  const env = readEnv(deps.env)
  if (env === null) {
    if (command.kind === 'status') return printLocalStatus(io, deps.version)
    io.err('TERMORA_URL and TERMORA_TOKEN must both be set for "termora file".')
    io.out(HELP)
    return 1
  }

  const client = (
    deps.createClient ?? ((value: TermoraEnv): CockpitClient => new TermoraClient(value))
  )(env)
  try {
    if (command.kind === 'status') {
      printRemoteStatus(io, await client.getStatus())
      return 0
    }
    printPreview(io, await client.getFile(command.path, command.maxBytes))
    return 0
  } catch (error) {
    io.err(
      error instanceof TermoraError || error instanceof Error ? error.message : 'Unexpected error',
    )
    return 1
  }
}
