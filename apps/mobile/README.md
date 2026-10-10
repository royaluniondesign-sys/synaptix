# Termora Mobile Companion Scaffold

This directory is the future native mobile companion boundary.

Current status: scaffold only. Termora's installable PWA remains the active mobile client until native push/deep links/camera/share-sheet justify an Expo app.

## Intended stack

- Expo / React Native shell.
- Shared protocol contracts from `packages/shared`.
- Secure device pairing with QR/deep link.
- Push notifications for done/failed/needs-input events.
- Explicit file/image upload into agent prompts.

## First real implementation tasks

1. Harden PWA mobile pairing and notification event model.
2. Define mobile protocol contracts in `packages/shared`.
3. Add Expo shell with secure storage and QR pairing.
4. Publish Android APK through GitHub Releases.
5. Add iOS TestFlight/App Store only after APNs entitlement flow is automated.
