# Termora current status

This is the repo-level truth table for the current implementation. It exists to keep public README, roadmap, and platform claims aligned.

## Implemented

- Local-first agent + web/PWA cockpit.
- Real PTY sessions with tmux persistence when available.
- QR/bootstrap token exchange and JWT session authentication.
- Protected cockpit APIs for status, files, safe file preview, whitelisted actions, jobs, worktrees, GitHub status, events, and unread state.
- Web UI slices for terminal sessions, split layout controls, multi-pane terminal rendering, file inspector, notifications/unread, GitHub status, and feature buildout tracking.
- CLI MVP: `help`, `version`, `status`, `file`.
- Desktop boundary: Electron launcher contracts, dynamic loader, preload bridge, lifecycle tests, smoke checks, unsigned packaging dry-run.
- Dogfood checks: `npm run check:cockpit` and `npm run check:web-headless`.
- CI gates on Node 20/22/24: lint, typecheck, build, tests, scaffold, desktop checks, platform readiness, security audit, dogfood checks.

## Guarded

- Real Electron GUI launch on host machines.
- Unsigned desktop artifacts for macOS, Windows, and Linux.
- Native mobile app build from the Expo scaffold.
- CLI distribution through npm/installers.

## Missing / roadmap

- Signed/notarized desktop releases.
- GitHub Releases artifact upload, checksums, SBOM/provenance.
- Native mobile secure storage, push, APK/TestFlight/App Store flows.
- Full GitHub/task boards, Linear/task integrations, diff annotation, file attachments to agents, quick open, rich previews, computer-use workflows, and usage/account tracking.

## Non-claims

Termora has no store submission evidence, signed artifacts, notarization evidence, published installers, or app-store submission yet. Any public claim must stay scoped to the evidence above and the platform readiness checklist.
