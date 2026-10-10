# Termora Desktop App Scaffold

This directory is the desktop packaging boundary.

Current status: scaffold only. It is intentionally not part of root npm workspaces yet, so current CI remains stable while the desktop runtime API is extracted.

## Intended stack

- Electron + electron-builder.
- Load `packages/web/dist` in production.
- Start the local `packages/agent` through a programmatic `startAgent()` API.
- Package the CLI from `packages/cli` as a real installer binary.

## First real implementation tasks

1. Extract `startAgent(options)` from `packages/agent`.
2. Add Electron main process that starts/stops the agent.
3. Add `electron-builder` local config and unsigned macOS package.
4. Add smoke test: installed app starts agent and serves the web UI.
