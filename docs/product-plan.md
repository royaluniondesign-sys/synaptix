# Product plan: from working prototype to something people can install

Written 2026-10-12 from a review of `main`, the cockpit running locally, and market research. It lists what is missing, in order, with a way to verify each item. `ROADMAP.md` stays the checklist; this file explains the order and the reasoning.

## Where we are

- Technical base is solid: auth and pairing, PTY sessions, cockpit API, agent registry, CLI MVP, CI on Node 20/22/24.
- There is no installable artifact yet. A Linux AppImage builds in CI (PR #38) but has not passed its smoke test.
- The cockpit shows invented state. In `packages/web/src/components/DashboardView.tsx` the task list and agent queue are hard-coded constants (`TASKS`, `AGENTS`), and the terminal pane prints sample text when no session exists. A new user would see "Hermes · thinking" without having Hermes.
- No users, no public page, no pricing evidence.

## Order of work

### 1. The screen tells the truth (before anyone else sees it)

- Replace `TASKS`, `AGENTS` and the sample terminal text with real state or an honest empty state.
- Remove machine paths and names (`/home/rud/...`, `RUD-SERVER`) from the interface.
- Fix the mobile layout: bottom bar over the status text, clipped panels, and the phone mock covering side panels at 1440 px.
- Verify: Playwright screenshots at 1440x900 and 390x844 in CI; a test that fails when a hard-coded sample string reaches the rendered page.

### 2. An installable Linux build with evidence

- AppImage passes the smoke test in CI (`/api/health` and the web UI, with `ok: true`).
- Fix `/api/info` version (`0.0.0` in the packaged app), add a real icon and `desktopName`, enable `asar` with `asarUnpack` for native modules.
- Then macOS (`.dmg`, `.zip`) and Windows (NSIS), each only after a CI-built artifact passes its own smoke test.
- Record each artifact in `docs/release-evidence-manifest.json` and publish it in a GitHub Release with checksums. Signing and notarization need credentials and are the owner's decision.

### 3. Product gaps that matter to a first user

From `docs/reference-research/orca-evidence-ledger.md`: API snapshot in CI for the mobile-facing surface, hook adapter for Claude Code agent state (the output parser stays as fallback), previews for Markdown and images (#32), Quick Open (#30). SSH/SFTP (#26) waits for the OpenCode work that has not been found in any repository.

### 4. Public web page

- One page: what it does, real screenshots (not mocks), three-step install, download links to GitHub Releases, privacy statement, link to the repository.
- No pricing until step 5 has an answer.
- Verify: Lighthouse run in CI, every claim on the page traceable to a row in `docs/current-status.md`.

### 5. Validate demand before building anything paid

- Goal: ten real users who install it and use it more than once.
- Ask one question after first use: would you pay for X? Offer concrete options (sync across machines, mobile push, relay without a tunnel).
- Decision rule: build a paid tier only if at least three of the ten say yes to the same option. Otherwise keep the product free and open source and look at what blocked adoption.

## Monetization hypotheses (not commitments)

Market notes come from third-party pages found on 2026-10-12 and are not verified against official sources.

- Competing free options exist: Orca (MIT), Happy Coder (open source) and Anthropic's own Remote Control for Claude Code.
- Termius charges about 10 USD/month on annual billing; the paid value is cross-device sync.
- Hypothesis A: free local cockpit, paid relay and push (sync across machines, notifications without a tunnel). Needs a hosted service, so cost, uptime, abuse handling and a separate privacy policy come with it. Not passive income.
- Hypothesis B: one-time license for desktop builds with updates. Weak while a free equivalent exists.
- Hypothesis C: team features (shared hosts, audit log). Needs a customer who has asked for it.
- Do not build the relay until step 5 names it as the thing people would pay for.

## Legal checks

- Synaptix began as a fork of clsh (see `CHANGELOG.md`). The MIT notice in `LICENSE` must stay. Confirm the original author's license terms before charging for anything derived from it.
- Reference research on other products records patterns only. No code or assets are copied.

## What this plan does not promise

No dates. No revenue estimate. Each step ends with a check someone can run.
