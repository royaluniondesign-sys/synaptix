# Termora Roadmap

Termora is moving from mobile terminal access to a complete installable cockpit for machines, projects, agents, files, Git, and verification gates.

## Completed foundation

- [x] CI runs lint, typecheck, build, and tests.
- [x] Unified port config: `TERMORA_PORT` > `PORT`.
- [x] `TERMORA_MAX_SESSIONS` limit with WebSocket `max_sessions` error.
- [x] Removed dead SSE path and sensitive unused env references.
- [x] Created `packages/shared` for WebSocket protocol contracts.
- [x] Prepared npm distribution wrapper and prepack safety.
- [x] SSH host manager and known_hosts verification.
- [x] SFTP browse/upload/download.
- [x] Multi-machine usage docs and connection panel.
- [x] PWA shell, manifest, icons, and service worker.

## Milestone 1 — Professional mobile cockpit

- [ ] Polish responsive project/session navigation.
- [ ] Add searchable scrollback per session.
- [ ] Add split terminal panes.
- [ ] Add theme import/export and terminal profile presets.
- [ ] Finish Spanish/English UI translation coverage.
- [ ] Add Windows/WSL support notes and smoke tests.

## Milestone 2 — Project and Git control

- [ ] Workspace registry for local repos/projects.
- [ ] Git status/diff endpoints with safe command execution.
- [ ] Mobile diff viewer.
- [ ] Stage/unstage/commit flow from the UI.
- [ ] Push/pull/fetch controls with explicit confirmation.
- [ ] Project memory links: README, docs, run reports, notes.

## Milestone 3 — Worktree task isolation

- [ ] Worktree registry: one task = one isolated branch/worktree.
- [ ] Create/archive/discard worktrees from mobile.
- [ ] Checkpoint before agent starts.
- [ ] Compare worktree diffs side by side.
- [ ] Race mode: run multiple agents on the same issue in separate worktrees.
- [ ] Winner flow: select, squash/cherry-pick, archive losers.

## Milestone 4 — Agent cockpit

- [ ] Agent profile registry for Claude Code, Codex, OpenCode, Hermes, Aider, Gemini, Goose, and custom CLIs.
- [ ] Launch agent sessions from the UI.
- [ ] Agent transcript/chat view plus raw terminal mode.
- [ ] Status parser hooks: running, editing, testing, waiting, failed, done.
- [ ] Usage and rate-limit badges per provider/account.
- [ ] Prompt templates and quick commands per project.
- [ ] File/image attachments where supported by the underlying agent.

## Milestone 5 — Multi-device app experience

- [ ] Host list across paired machines and servers.
- [ ] Push notifications for done/failed/needs-input/rate-limit-reset.
- [ ] Notification action buttons: continue, retry tests, show diff, commit, stop.
- [ ] Browser preview panel per project/worktree.
- [ ] File explorer and lightweight editor.
- [ ] Markdown/Mermaid/PDF/image viewers.
- [ ] Desktop-grade command palette.

## Milestone 6 — Install and distribution

- [ ] Harden PWA install flow.
- [ ] Publish npm global CLI when explicitly approved.
- [ ] Linux AppImage/deb packaging.
- [ ] macOS wrapper.
- [ ] Windows/WSL installer path.
- [ ] Update/checksum/signing plan.

## Milestone 7 — Automation surface

- [ ] Run records: objective, plan, commands, diffs, gates, final report.
- [ ] Verification gates: lint, typecheck, tests, build, security scan, custom commands.
- [ ] MCP server exposing safe Termora tools.
- [ ] Webhook API for GitHub/Linear/Telegram/automation triggers.
- [ ] Scheduled jobs: nightly tests, repo health checks, long-running monitors.
- [ ] Multi-agent coordinator: lead agent plus isolated worker worktrees.

## Definition of done

A feature is done only when:

- it is visible or controllable from the UI when applicable;
- it has typed protocol/API coverage;
- it handles disconnects and failures safely;
- it has tests for backend/shared behavior where applicable;
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
