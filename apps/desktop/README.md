# Synaptix Desktop App Scaffold

This directory is the desktop packaging boundary.

Current status: scaffold plus a real, wired Electron launcher. It is intentionally not part of root npm workspaces, so root CI never installs Electron; the Electron dependency lives in `apps/desktop/package.json` only.

## Intended stack

- Electron + electron-builder.
- Load `packages/web/dist` in production.
- Start the local `packages/agent` through a programmatic `startAgent()` API.
- Package the CLI from `packages/cli` as a real installer binary.

## Real launcher (main + preload)

The main process entry is `src/electron-main.ts` (built to `dist/electron-main.js`, which is the
package `main`), and the preload bridge is `src/preload.ts`. Both resolve Electron through the
computed-import loader in `src/electron-loader.ts` — nothing binds `electron` at build time, so the
desktop boundary typechecks and the smoke contract stays honest without an installed runtime.

```sh
npm --prefix apps/desktop install       # pulls Electron into apps/desktop only
npm --prefix apps/desktop run build     # tsc -> dist/electron-main.js + dist/preload.js
npm --prefix apps/desktop run launch    # dry run: prints the exact launch command
npm --prefix apps/desktop run launch:run # spawns Electron (real GUI, needs a display)
```

`scripts/launch-electron.mjs` is dry-run by default and exits `2` when Electron is not installed.
This shim does not sign, notarize, or publish, and it makes no store-readiness claims.

## Unsigned local packaging

`scripts/package-desktop-unsigned.mjs` (exposed as `package:unsigned*` scripts) can produce
unsigned local artifacts for smoke testing. It is dry-run by default, refuses signing/publish
credentials, and always passes `--publish never`. Nothing here signs, notarizes, or publishes.

```sh
npm --prefix apps/desktop run package:unsigned        # dry run
npm --prefix apps/desktop run package:unsigned:mac    # build on darwin
```

Before a real build, run the deterministic preflight (advisory by default; `:strict` fails on
missing prerequisites):

```sh
npm run check:desktop-artifact-preflight
npm --prefix apps/desktop run preflight:artifact
npm --prefix apps/desktop run preflight:artifact:strict
```

See `docs/desktop-unsigned-packaging.md` and `docs/platform-readiness-checklist.md`.

## Remaining real implementation tasks

1. Extract `startAgent(options)` from `packages/agent` into a supported public API.
2. Run and verify the real GUI launcher on each host (blocked: no display in CI).
3. Add `electron-builder` local config and an unsigned macOS package that actually builds.
4. Add smoke test: installed app starts agent and serves the web UI.
