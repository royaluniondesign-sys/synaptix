// Termora desktop headless dev-shell entry (dev only, no installer claim).
//
// Runs the real desktop shell contract without Electron: it resolves the
// programmatic startAgent() from @termora/agent/runtime and logs the cockpit
// URL the Electron main process would load. This is the smallest runnable dev
// shell step — it proves the agent lifecycle wiring end to end.
//
// Requires @termora/agent to be built so the workspace root can resolve
// `@termora/agent/runtime`. Run from apps/desktop: npm run dev

import { DESKTOP_IPC_CHANNELS } from './ipc-contract.js'
import { loadAgentStartFn, runHeadlessDevShell } from './shell.js'

async function main(): Promise<void> {
  const startAgent = await loadAgentStartFn()
  const shell = await runHeadlessDevShell(startAgent, {
    onStatus: (status) => {
      const port = status.port === null ? '-' : String(status.port)
      console.log(`[termora-desktop] ${status.state} port=${port} url=${status.webUrl ?? '-'}`)
    },
  })

  console.log(`[termora-desktop] dev shell ready at ${shell.url}`)
  console.log(
    `[termora-desktop] ipc: ${DESKTOP_IPC_CHANNELS.getStatus} | ${DESKTOP_IPC_CHANNELS.status}`,
  )

  const shutdown = (): void => {
    void shell.stop().then(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

void main().catch((cause: unknown) => {
  const detail = cause instanceof Error ? cause.message : String(cause)
  console.error(`[termora-desktop] dev shell failed: ${detail}`)
  process.exit(1)
})
