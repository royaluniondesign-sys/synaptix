# Termora Roadmap

Termora is moving from mobile terminal access to a complete installable cockpit for machines, projects, agents, files, Git, and verification gates.

## Completed foundation

- [x] CI runs lint, typecheck, build, tests, app scaffold, desktop boundary/smoke/launch, platform readiness, security audit, cockpit dogfood, and web headless dogfood on Node 20/22/24.
- [x] Unified port config: `TERMORA_PORT` > `PORT`.
- [x] `TERMORA_MAX_SESSIONS` limit with WebSocket `max_sessions` error.
- [x] Secure QR/bootstrap pairing with JWT session auth and rate-limited auth endpoints.
- [x] Real PTY sessions with tmux persistence fallback.
- [x] PWA shell, manifest, icons, and mobile-first terminal cockpit.
- [x] Protected cockpit APIs: status, files, safe file preview, jobs, events, read-all, worktree fan-out/list/delete, and read-only GitHub status.
- [x] Web cockpit slices: notifications/unread, file inspector, GitHub status, split layout controls, multi-pane terminal view model.
- [x] CLI MVP: help/version/status/file with local fallback or authenticated remote mode.
- [x] Desktop app boundary: programmatic agent runtime seam, Electron launcher contracts, preload bridge, dynamic Electron loader, desktop tests, smoke/launch checks.
- [x] Unsigned desktop packaging dry-run helper, artifact build preflight, and platform readiness checker.
- [x] Security audit gate with production dependency audit clean.

## Capability parity tracker

These are first-class product surfaces, not cosmetic labels. Each item must end with backend/API support, UI controls, failure states, and verification.

| Surface | State | Acceptance criteria |
| --- | --- | --- |
| Mobile Companion | Live PWA / native scaffold | Pair from phone, monitor agents/sessions, send follow-ups, receive notifications, resume from anywhere. |
| Parallel Worktrees | Backend foundation + UI actions | Launch N isolated worktrees from one prompt, track N agents, compare diffs, merge winner, archive losers. |
| Terminal Splits | Partial UI + model | Create/resize/save split layouts; preserve scrollback across restart; WebGL terminal remains fast. |
| Design Mode | Planned | Click Chromium element; capture DOM/CSS/screenshot; attach to prompt/run record. |
| GitHub & task workflows | Read-only GitHub status live; task boards planned | Browse PRs/issues/boards; create worktree from task; review/merge without leaving app. |
| SSH Worktrees | Planned | Remote host registry, SSH launch, file editing, git, terminal, reconnect, port forwarding. |
| Annotate AI Diffs | Planned | Inline comments on generated diffs; send comments to agent; commit from reviewed diff. |
| Drag Files to Agents | Planned | Drag files/images into prompt; backend stores attachment; agent runner receives safe path/context. |
| Termora CLI | MVP | Script worktrees, snapshots, browser clicks/fills, agent runs, and gate watches. |
| Quick Open | Planned | One search for files, commands, sessions, agents, worktrees, repo docs. |
| Usage Tracking | Planned | Claude/Codex/OpenCode/Hermes usage, reset timers, provider/account switching. |
| Rich Repo Previews | Planned | Markdown, images, PDFs, docs, logs, web previews in cockpit panes. |
| Computer Use | Planned | Safe visible-UI operation for apps/browsers when CLI-only is insufficient. |
| Notifications/unread | Backend + UI partial | Push done/failed/needs-input/rate-limit-reset; unread task/session markers. |
| Any CLI Agent | Backend + UI live (beta) | Command-template registry (`/api/cockpit/agents`) with built-in profiles, custom agents, a heuristic status parser, and a cockpit panel to list/add/remove agents and classify output. Live session status badges still missing. |

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
## Milestone 8 — Desktop/mobile app packaging

- [x] Extract a programmatic `startAgent()` API from `packages/agent`.
- [x] Add Electron launcher/main/preload contracts that start the local agent and target the built web UI.
- [ ] Run real host GUI launch and installed-app smoke tests.
- [ ] Package macOS DMG/ZIP unsigned local build, then signed release.
- [ ] Package Linux AppImage after native module smoke tests.
- [ ] Package Windows NSIS after native module rebuild is stable.
- [ ] Expose the Termora CLI from desktop installers.
- [ ] Keep PWA as mobile baseline; add Expo shell for push/deep links/upload.
- [ ] Add relay/push only after local pairing and mobile shell are stable.

## Milestone 9 — Product truthfulness and first users

See `docs/product-plan.md` for the order and the reasoning.

- [x] Replace hard-coded sample tasks, agents and terminal text in the cockpit with real state or empty states.
- [x] Remove machine paths and names from the interface (guarded by `scripts/__tests__/web-truthfulness.test.mjs`).
- [x] Fix the mobile layout (bottom bar, clipped panels, phone mock overlap).
- [x] Layout and screenshot checks at desktop and phone sizes in CI (`.github/workflows/web-layout.yml`).
- [x] Linux AppImage passes the CI smoke test; version, icon and asar fixed. Still a workflow artifact, not a release: unsigned, placeholder icon, no GitHub Release.
- [ ] Public web page with real screenshots, install steps and download links.
- [ ] Ten real users and one pricing question before any paid tier is built.
