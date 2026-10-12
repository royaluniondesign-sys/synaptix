# Orca evidence ledger

Reference research on Orca (`stablyai/orca`), a comparable product. Purpose: turn what a shipped product does into verifiable Termora requirements.

**Rules**

- Orca is MIT-licensed (copyright Lovecast Inc.). This ledger records patterns, structure and behavior only. No Orca code, assets, names or copy go into Termora.
- Every row cites a path in the Orca checkout at commit `5f1f9ea0` (2026-10-12), read directly from source. Nothing here comes from running or decompiling a binary.
- "Termora state" is checked against this repo's `main` at the time of writing. If a row says `missing`, there is no code for it.
- Inferences are marked. A row without evidence stays out.

## Findings

| # | Observation | Evidence in Orca | Inference | Decision for Termora | Verifiable requirement | Termora state |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Phone and desktop never connect directly. Both open outbound WebSockets to a relay that pairs the sessions and splices frames. | `cloud/README.md`; `cloud/packages/relay-contract` (shared wire contract) | A relay lets phones reach hosts behind NAT without opening ports. The shared contract package keeps desktop, mobile and relay in step. | Keep local pairing as the free baseline. Define a versioned relay contract package before any relay server exists. | A `relay-contract` package with frame shapes and close codes, tested by contract tests used by desktop and mobile. | missing (docs/feature-platform-map.md defers relay) |
| 2 | Push notifications go through a separate gateway that holds the APNs key and sends to APNs and FCM. It is outside the relay data path. | `cloud/README.md` (`apps/push`, `packages/push-contract`) | Isolating push keys from the data path limits the blast radius of a relay compromise. | Never put push credentials in the agent or the mobile app. Gateway is a separate service. | Push contract tests; no APNs/FCM secrets in any non-gateway package (grep gate in CI). | partial (`apps/mobile/src/mobile-companion/push.ts` has the client contract only) |
| 3 | The desktop app hosts a WebSocket RPC server for the mobile app (port 6768 in dev), with a recorded RPC surface that is diffed in CI. | `mobile/README.md`; scripts `rpc:diff`, `rpc:record` (referenced there) | RPC drift between desktop and mobile is treated as a test failure. | Record the mobile-facing API surface and diff it in CI. | A checked-in API snapshot for `/api/cockpit/*` and WS messages; CI fails on unreviewed change. | missing |
| 4 | Release is split into many workflows: per-platform builds, release cut, release policy, ref validation, updater tests on macOS and Windows, a Windows signing rehearsal, Android and iOS mobile release. | `.github/workflows/` (`release-cut.yml`, `release-policy.yml`, `release-ref-validation.yml`, `macos-updater-tests.yml`, `win-update-e2e.yml`, `windows-signing-rehearsal.yml`, `mobile-android-release.yml`, `mobile-ios-release.yml`) | Updates and signing are tested before a release exists, not after. | Add a release workflow only after an unsigned artifact builds on each host. Rehearse signing without secrets first. | `docs/release-evidence-manifest.json` rows flip to satisfied only with a CI-produced artifact and smoke log. | gated (manifest exists; no artifact) |
| 5 | The release build chain fails early on a missing environment: `build:mac:release` runs `verify-macos-release-env.mjs` before building. Native helpers are built and verified as separate steps. | `package.json` scripts `build:mac:release`, `build:release*` | Preflight beats a late failure in notarization. | Keep `check:desktop-artifact-preflight` and make it strict in the release job. | Release job runs preflight with `--strict`; it fails when signing env is absent. | partial (preflight is advisory in PR CI) |
| 6 | Agent state is derived from hooks and state files, with versioned rules published by their own workflow, not from guessing at terminal text alone. | `src/main/agent-hooks/`; `.github/workflows/agent-state-rules-publish.yml`; `src/main/agent-state-file-reader.ts` | Hook-based status is more reliable than parsing output. Rules are data that can ship independently of the app. | Treat the output parser added in #36 as the fallback. Add per-agent hook adapters later, and ship rule sets as data. | A hook adapter for one agent (Claude Code) feeding the same `AgentState` values; parser used only when no hook exists. | partial (parser only, PR #36) |
| 7 | Workspace trust for agents is handled explicitly: trust presets, a trust guard and tests for the failure path. | `src/main/agent-workspace-trust*.ts`, `agent-trust-presets.ts` | Launching an agent in an untrusted directory is a recognized risk with its own code path. | Fan-out and agent launch should state what directory trust is granted. Keep spawn behind an explicit flag. | A test that agent launch outside the repo/worktree root is refused. | partial (spawn flag exists; no trust model) |
| 8 | Remote hosts are tested against hostile SSH hosts and Windows SSH hosts in CI. | `.github/workflows/ssh-hostile-hosts.yml`, `ssh-windows-hosts.yml` | SSH features need adversarial tests, not only happy-path ones. | When SSH/SFTP lands, include a hostile-host test suite from the first PR (host-key change, banner abuse, path traversal in SFTP). | Tests for host-key mismatch refusal and SFTP path escape. | missing |
| 9 | Terminal quality has its own CI: rendering, IME, scroll restore, performance contracts, Windows restart and crash survival. | `.github/workflows/terminal-perf.yml`, `terminal-ime-e2e.yml`, `performance-contracts.yml`, `win-crash-survival-e2e.yml` | Terminal regressions are the product's main risk and are tested on real renderers. | Add a headless-browser terminal check (resize, resume, scrollback) to `check:web-headless`. | A Playwright check that reconnects a session and asserts scrollback is preserved. | partial (`check:web-headless` exists; scope not verified for scrollback) |
| 10 | The monorepo carries CLI, desktop, renderer, mobile and cloud as separate workspaces with their own lockfiles, plus `AGENTS.md`/`CLAUDE.md` for agent contributors. | repo root listing (`mobile/`, `cloud/`, `src/cli`, `AGENTS.md`, `CLAUDE.md`) | Agent-facing contributor docs reduce rework when agents write most of the code. | Add an `AGENTS.md` with Termora's gates and no-go rules (never commit `.env`, never skip tests). | `AGENTS.md` exists and is referenced from CONTRIBUTING.md. | missing |

## What this ledger does not claim

- It does not show how Orca performs, only how it is built and tested.
- It does not describe Orca's closed or hosted components, if any. Only the public repository was read.
- Pairing and onboarding flows in the mobile app were not traced end to end; row 3 and the pairing UX are open items for a second pass.
- Monetization: nothing here shows Orca's pricing. Any Termora Pro boundary is a separate product decision.

## Suggested backlog from the rows above

1. Row 3: snapshot and diff the mobile-facing API in CI.
2. Row 6: first hook adapter for Claude Code.
3. Row 10: `AGENTS.md`.
4. Row 9: scrollback-resume assertion in `check:web-headless`.
5. Rows 1, 2, 8: design docs only until local pairing and the mobile shell are stable; SSH/SFTP waits for the unlocated OpenCode work.
