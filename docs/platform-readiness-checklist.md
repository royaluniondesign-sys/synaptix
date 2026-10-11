# Termora platform readiness checklist

This document tracks what is actually ready to ship to real users across Electron desktop,
PWA, Expo native mobile, and GitHub Releases. It is a status tracker and contract, **not** a
compliance certification. Termora is **not** store-ready, notarized, or signed for distribution.

The checklist is machine-checked by `npm run check:platform-readiness`
(`scripts/check-platform-readiness.mjs`). The checker verifies required docs/config placeholders
exist and that no unqualified platform claims are made in public docs. It never installs
dependencies, reads secrets, or contacts a network.

## Status legend

- **Implemented** — present in the repo and covered by an automated, CI-checkable contract.
- **Gated** — a real scaffold/config placeholder exists, but a human action (signing
  certificate, notarization, push credentials, store account, physical-device smoke test)
  blocks shipping.
- **Missing** — not implemented; roadmap only. No claim of support is allowed.

## Platform matrix

| Surface                             | Status      | Evidence                                                                         | Blocker                                                     |
| ----------------------------------- | ----------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Desktop shell (Electron)            | Gated       | `apps/desktop/**`, desktop boundary checker                                      | Electron deps intentionally absent; not in root workspaces  |
| macOS artifact (`.dmg`, `.zip`)     | Gated       | `apps/desktop/electron-builder.config.cjs`, `docs/desktop-unsigned-packaging.md` | Unsigned; no notarization; unsigned helper never run in CI  |
| Windows artifact (`NSIS`)           | Gated       | `apps/desktop/electron-builder.config.cjs`, `docs/desktop-unsigned-packaging.md` | Native module rebuild unverified; unsigned                  |
| Linux artifact (`AppImage`, `.deb`) | Gated       | `apps/desktop/electron-builder.config.cjs`, `docs/desktop-unsigned-packaging.md` | Native module smoke test missing                            |
| Signing and notarization            | Missing     | this doc                                                                         | No certificate values, no CI signing job                    |
| Desktop auto-update                 | Missing     | `docs/app-packaging-blueprint.md`                                                | GitHub Releases feed not wired                              |
| PWA mobile client                   | Implemented | `packages/web/**`, app scaffold contract                                         | Install/offline behavior covered by web build               |
| Expo native mobile                  | Gated       | `apps/mobile/app.config.js`                                                      | Native builds disabled; APNs entitlement flow pending       |
| GitHub Releases distribution        | Missing     | `ROADMAP.md` milestone 6                                                         | No release workflow, checksums, or artifact upload          |
| CLI distribution                    | Gated       | `packages/cli/**`                                                                | npm/global publish not approved; installer bundling pending |
| Relay and push cloud                | Missing     | `docs/feature-platform-map.md`                                                   | Deliberately deferred until local pairing is stable         |

## Desktop (Electron) readiness

- **Implemented:** packaging config placeholders for macOS, Windows, and Linux targets.
- **Gated:** Electron runtime, real installer build, and installed-app smoke test.
- **Missing:** code signing, notarization, entitlements review, and auto-update.
- Native executables and the bundled CLI must stay outside `app.asar`/equivalent archives.
- Source, docs, and tests must not be bundled into desktop runtime artifacts unless required.
- Entitlements/permissions must be declared before any release: file access, network,
  notifications, and any future screen capture.
- Data handling: the desktop app must not persist terminal output or repo contents outside
  the local agent data directory, and must never log tokens or pairing secrets.

## Unsigned local artifact builds

Packaging helpers exist so contributors can produce **unsigned** local artifacts for smoke
testing. None of them sign, notarize, publish, or upload. See
`docs/desktop-unsigned-packaging.md` for the full contract.

- **Implemented:** `scripts/package-desktop-unsigned.mjs` and the `package:unsigned*` scripts.
  The helper is dry-run by default, refuses signing/publish credentials, and always passes
  `--publish never`.
- **Gated:** a real unsigned build on each host, because Electron and electron-builder are
  intentionally absent from the scaffold today.
- **Missing:** signed/notarized artifacts and any release upload.
- Commands: `npm run package:desktop:unsigned` (dry run) and
  `npm --prefix apps/desktop run package:unsigned:{mac,linux,win}` (build on the matching host).
- Every target is marked **pending/manual** until its artifact evidence row is satisfied.

## PWA readiness

- **Implemented:** installable manifest, icons, service worker, HTTPS/tunnel onboarding.
- **Gated:** nothing shipping-blocking for the beta PWA client.
- The service worker **must not** cache tokens, terminal output, or repository contents.
- Pairing tokens stay in local storage scoped to origin; no third-party analytics by default.
- Push notifications remain roadmap until an explicit offline/push contract exists.

## Native mobile (Expo) readiness

- **Implemented:** inert `apps/mobile/app.config.js` scaffold with iOS `bundleIdentifier`,
  Android `package`, and an `aps-environment` push entitlement placeholder.
- **Gated:** native builds, secure storage, QR/deep-link pairing, and push registration.
- **Missing:** store listing assets, privacy nutrition labels, and store submission.
- Permissions to declare before release: camera/QR, photos/files, and notifications.
- Device tokens must live in secure storage; no push credentials or signing values in the repo.
- Android is intended to ship as an APK on GitHub Releases first; iOS App Store/TestFlight later.

## Privacy and data handling

- Default posture: local-first, **no telemetry** unless explicitly opted in.
- Attachments must have an explicit retention/expiry policy and user-visible deletion.
- Logs must redact tokens, pairing codes, terminal secrets, and repo path PII where shared.
- Credentials and device tokens must never be committed, printed, or cached by the service worker.
- Any future relay/push gateway must use versioned contracts and outbound-only WebSockets.

## Security and release gates

- PR CI runs contracts **without** signing credentials; release jobs use gated secrets only.
- Signing certificate names and values must never appear in the repo or logs.
- GitHub Releases must publish checksums and a changelog entry per artifact.
- A release must be blocked until the matching artifact evidence row below is satisfied.

## Artifact evidence checklist

No artifact may be described as supported, released, signed, notarized, or store-ready until
its row below is satisfied and the artifact is recorded in a GitHub Release.

| Artifact                 | Status  | Evidence required before claiming support                    | Exact next evidence (command → observation)                                                                 |
| ------------------------ | ------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| macOS `.dmg`             | Missing | Signed + notarized build installed and smoke-tested on macOS | `npm --prefix apps/desktop run package:unsigned:mac` → `release/desktop/*.dmg` installs, agent + web UI run |
| macOS `.zip`             | Missing | Zipped app launches agent and serves the web UI              | Same unsigned build → unzip `release/desktop/*.zip`, app serves the web UI                                  |
| Windows `NSIS` installer | Missing | Native modules rebuilt; installed app starts agent           | `npm --prefix apps/desktop run package:unsigned:win` → installer runs, agent starts on win32                |
| Linux `AppImage`         | Missing | `node-pty`/`better-sqlite3` runtime verified on Linux        | `npm --prefix apps/desktop run package:unsigned:linux` → AppImage opens a real terminal on linux            |
| Linux `.deb`             | Missing | Package installs and starts after AppImage is stable         | `npm --prefix apps/desktop run package:unsigned:linux` → `.deb` installs and starts the agent               |
| Android `.apk`           | Missing | Expo build on GitHub Releases with device smoke test         | `npx expo build` (mobile, gated) → APK installs on a physical device                                        |
| iOS App Store build      | Missing | APNs entitlement flow automated; TestFlight build verified   | Mobile gated: automate `aps-environment` flow → TestFlight build launches                                   |
| CLI binary               | Missing | Bundled by installers and runnable as `termora`              | After an installer build → run `termora --help` from the installed app                                      |

## What `npm run check:platform-readiness` enforces

- Required docs and app/config placeholders exist.
- This checklist declares the `implemented`, `gated`, and `missing` status categories.
- Platform, privacy, and release topics above are present.
- Desktop/mobile configs contain only placeholders, never signing secrets or push credentials.
- The unsigned packaging helper exists, defaults to dry-run, refuses signing/publish credentials,
  and always passes `--publish never`.
- PR CI does not reference signing secrets.
- Public docs make no unqualified claims (for example "store-ready", "submission-ready",
  "fully notarized", or "signed release available") without artifact evidence.

## Known blockers

1. No signing/notarization credentials or CI release job.
2. Desktop build is a scaffold; Electron runtime and installer builds are disabled. The unsigned
   helper `scripts/package-desktop-unsigned.mjs` can produce local artifacts once Electron and
   electron-builder are installed on the matching host.
3. Native mobile builds and APNs entitlement flow are not automated.
4. No GitHub Releases artifact publication or checksum verification.
5. Relay/push cloud is deferred until local pairing and the mobile shell are stable.

## False-claim rule

Do not claim a platform is store-ready, notarized, signed, or supported until the matching
artifact evidence row is satisfied. When in doubt, mark the row **gated** or **missing**.
