# Synaptix Mobile Companion Scaffold

This directory is the future native mobile companion boundary.

Current status: **scaffold + phase-1 contracts only**. Synaptix's installable PWA remains the
active mobile client until native push/deep links/camera/share-sheet justify an Expo app.
Native builds and store publishing are intentionally **gated**; see
[`docs/platform-readiness-checklist.md`](../../docs/platform-readiness-checklist.md).

## Intended stack

- Expo / React Native shell.
- Shared protocol contracts from `packages/shared`.
- Secure device pairing with QR/deep link.
- Push notifications for done/failed/needs-input events.
- Explicit file/image upload into agent prompts.

## Phase-1 contracts (implemented, pure TypeScript)

`src/mobile-companion/` defines the platform-independent contracts the native shell must
satisfy. They import no React Native, Expo, or native module, so they typecheck and test in CI
while builds stay gated.

| Module                | Contract                                                                              |
| --------------------- | ------------------------------------------------------------------------------------- |
| `pairing.ts`          | Parses `https://host/?token=…` and `synaptix://pair?url=…&token=…` into a descriptor; never returns a raw token from logs. |
| `secure-storage.ts`   | `SecureStorage` interface (get/set/delete/keys) plus an in-memory implementation for tests. Real Keychain/Keystore wiring is gated. |
| `push.ts`             | `PushPermissionState` model: undetermined/granted/denied, device-token registration, and an honest `describePushReadiness`. |

Run the contract checks from the repo root:

```sh
npm run check:mobile-scaffold
```

This runs the pure-TS vitest suite plus a `tsc --noEmit` typecheck of `apps/mobile`. It installs
nothing, builds nothing, and contacts no network.

## What is explicitly gated

- Expo native shell, Android APK, and iOS TestFlight/App Store builds are **not** enabled.
- No signing certificates, push credentials, or store claims exist in this repo.
- Real secure storage (expo-secure-store) and push registration are unwired placeholders.
- `npm run dev` / `android` / `ios` intentionally print a gated notice and exit 0.

## First real implementation tasks

1. Harden PWA mobile pairing and notification event model.
2. Define mobile protocol contracts in `packages/shared`.
3. Add Expo shell with secure storage and QR pairing.
4. Publish Android APK through GitHub Releases.
5. Add iOS TestFlight/App Store only after APNs entitlement flow is automated.
