# AGENTS.md

Rules for AI agents (Claude Code, Codex, OpenCode, Hermes, others) and people working in this repo. Human-facing setup is in `CONTRIBUTING.md`; this file is the short list of things that cause rework when missed.

## Layout

- `packages/agent`: backend. PTY sessions, WebSocket, auth, tunnels, cockpit API (`src/cockpit.ts`), agent registry (`src/agent-registry.ts`).
- `packages/web`: React + xterm.js cockpit and PWA.
- `packages/cli`: `termora` command.
- `apps/desktop`: Electron shell. Outside the root workspaces on purpose; it has its own `package-lock.json`.
- `apps/mobile`: Expo scaffold (contracts and tests only, no native build).
- `scripts/`: contract checks and packaging helpers. `docs/`: status, readiness checklist, release evidence manifest.

## Before you push

Run what CI runs, for the packages you touched:

```sh
npx turbo run lint typecheck build
npm test                                  # all packages
npm run check:platform-readiness          # if you touched docs, desktop, mobile or packaging
npm run check:desktop-boundary            # if you touched apps/desktop
npm run test:scripts                      # if you touched scripts/
npm run build:demo -w @termora/web && node scripts/check-web-layout.mjs   # if you touched packages/web (needs Playwright)
```

CI runs Node 20, 22 and 24. Desktop packaging needs Node 22+ and its own install: `npm --prefix apps/desktop ci`.

## Hard rules

- Never commit `.env`, tokens, pairing codes, JWT secrets, APNs/FCM keys or signing material. `.env` is git-ignored; keep it that way.
- Never skip, disable or quarantine a test to get green. Fix the cause or say what blocks you.
- Do not describe anything as released, signed, notarized, store-ready or supported unless its row in `docs/release-evidence-manifest.json` is satisfied. `npm run check:platform-readiness` enforces this for public docs.
- Packaging scripts never sign or publish. They refuse signing and publish credentials in the environment. Do not weaken that.
- Agents are launched as argv arrays, never through a shell. Spawning external agents stays behind `TERMORA_ENABLE_AGENT_SPAWN=1`.
- Do not hardcode machine paths (`/home/<user>`, `/Users/<user>`) in source. Resolve from PATH or config.
- Reference research on other products (`docs/reference-research/`) records patterns and structure only. Do not copy their code, assets or copy text.

## Conventions

- Match the surrounding code. Prettier is configured but existing files are not all formatted; do not reformat files you are not otherwise changing.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Status claims in `ROADMAP.md` and `docs/current-status.md` must match what is in `main`. Update them in the same PR as the change.
- New API routes go under `/api/cockpit/*`, require the auth guard, validate input, and get a test that covers the 401 case.

## Environment gotchas

- `node-pty` needs its native build. If PTY or `worktree-fanout` tests fail with a missing `spawn-helper`, the install ran with `--ignore-scripts`; run `npm rebuild better-sqlite3 node-pty`.
- Electron headers are downloaded at packaging time. Sandboxed environments without access to `electronjs.org` cannot rebuild native modules for Electron; use CI for that step.
- Tests that touch the registry file must set `TERMORA_AGENTS_FILE` to a temp path so they never write to `~/.termora`.
