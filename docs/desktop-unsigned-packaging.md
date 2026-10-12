# Unsigned desktop packaging (local only)

Termora desktop artifacts are **unsigned** and **not notarized**, and nothing here publishes or
uploads anything. This document describes how to produce unsigned local artifacts for smoke
testing only, using `scripts/package-desktop-unsigned.mjs`.

These are local, pending/manual builds. They require artifact evidence in
`docs/platform-readiness-checklist.md` before any support claim is allowed.

## Guardrails

- Dry-run by default; `--run` is required to execute electron-builder.
- Refuses to run when signing or notarization credentials are present in the environment
  (`CSC_LINK`, `CSC_KEY_PASSWORD`, `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`, `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`). In `--run` mode it also refuses
  `GH_TOKEN`/`GITHUB_TOKEN`.
- Always passes `--publish never` and strips publish credentials from the child environment.
- Builds only for the current host platform, so cross-platform output is never implied.
- Performs no signing, no notarization, no store submission, and no upload.

## Preflight before building

`scripts/check-desktop-artifact-preflight.mjs` is the deterministic preflight for a real unsigned
build. It never builds, signs, notarizes, publishes, or touches the network; it only inspects the
local host and repo state:

```sh
npm run check:desktop-artifact-preflight                 # advisory (exit 0 with blockers)
npm --prefix apps/desktop run preflight:artifact          # same, from the desktop package
npm --prefix apps/desktop run preflight:artifact:strict   # --strict: missing prerequisites exit 1
```

It verifies the host platform maps to a supported target, `apps/desktop/package-lock.json` exists
and names `@termora/desktop-app`, `electron` and `electron-builder` resolve under `apps/desktop`,
`release/` is git-ignored, and no signing/publish credentials are present. Without `--strict`,
missing prerequisites are reported as blockers and the command stays CI-safe; with `--strict` they
are fatal. Signing/publish credentials in the environment always fail (exit `2`).

## Commands

Dry run (safe on any machine, no toolchain required):

```sh
npm run package:desktop:unsigned
npm --prefix apps/desktop run package:unsigned
```

Build on the matching host (requires Electron + electron-builder installed in `apps/desktop`,
still unsigned):

```sh
npm --prefix apps/desktop run package:unsigned:mac    # darwin host
npm --prefix apps/desktop run package:unsigned:linux  # linux host
npm --prefix apps/desktop run package:unsigned:win    # win32 host
```

Each command wraps:

```sh
npx --no-install electron-builder <--mac|--win|--linux> --publish never
```

with `CSC_IDENTITY_AUTO_DISCOVERY=false`.

## Targets and expected outputs

| Target | Host   | Format       | Expected output                                  | Status         |
| ------ | ------ | ------------ | ------------------------------------------------ | -------------- |
| mac    | darwin | dmg, zip     | `release/desktop/*.dmg`, `release/desktop/*.zip` | pending/manual |
| win    | win32  | nsis         | `release/desktop/*-setup.exe`                    | pending/manual |
| linux  | linux  | AppImage,deb | `release/desktop/*.AppImage`, `*.deb`            | pending/manual |

`release/` is git-ignored; never commit local artifacts or installer output.

## Why these stay pending/manual

- The `electron` dependency is scoped to `apps/desktop` for the real launcher, but `electron-builder`
  is intentionally absent from the desktop scaffold.
- No per-platform native module rebuild (`node-pty`, `better-sqlite3`) has been verified.
- No installed-app smoke test has run on any platform.

A successful local build is not evidence of support. Record the smoke test in the readiness
checklist first.

## Linux AppImage in CI (unsigned)

`.github/workflows/desktop-linux.yml` builds and smoke-tests an unsigned AppImage on `ubuntu-24.04`.
It runs on changes to the desktop app, agent, web, CLI or the packaging scripts, and on demand.

Steps, all reproducible locally on a Linux host:

```sh
npm ci && npx turbo run build
npm --prefix apps/desktop ci
npm --prefix apps/desktop run build
npm --prefix apps/desktop run stage                       # scripts/stage-app.mjs
node scripts/package-desktop-unsigned.mjs --target linux --run
node scripts/smoke-appimage.mjs                           # runs under xvfb-run if DISPLAY is unset
```

- `stage` builds `apps/desktop/stage/`, a self-contained app directory that mirrors the relative
  lookups the agent does for the web UI. electron-builder packages that directory
  (`directories.app` in `electron-builder.config.cjs`) and rebuilds `better-sqlite3` and `node-pty`
  against Electron's ABI. The rebuild downloads Electron headers, so it needs network access.
- electron-builder only packages dependencies declared in the app manifest, so `stage` declares the
  agent and the web UI as `file:` dependencies (installed with `--install-links`) instead of copying them
  into `node_modules` by hand, which it silently drops.
- Known gap: the agent reads its version from `node_modules/package.json` and falls back to `0.0.0`
  in the packaged app, so `/api/info` reports `0.0.0` until that lookup is fixed.
- `asar` is disabled for now: the agent reads the web UI relative to its own files and `node-pty`
  ships a helper that must stay executable. Enabling asar with `asarUnpack` is a follow-up.
- The smoke test launches the packaged app with a throwaway `HOME`, waits for `/api/health`, checks
  that `/` serves HTML, then stops it. It prints a JSON evidence record and fails with the app's log tail.
- The workflow fails when the smoke test fails (the evidence is written to a file first so the exit code
  is not masked by a pipe) and still uploads the evidence for inspection.
- The workflow uploads the AppImage, `SHA256SUMS` and the smoke evidence as a **workflow artifact**
  kept for 7 days. It does not create a GitHub Release, sign, or notarize anything.

A passing run is evidence for the `Linux AppImage` row only after it is recorded in
`docs/release-evidence-manifest.json` and a GitHub Release carries the artifact. Until then the
row stays `missing`. The `.deb` target is not built.
