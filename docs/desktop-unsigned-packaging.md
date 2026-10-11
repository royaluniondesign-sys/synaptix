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
