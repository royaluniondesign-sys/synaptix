# Synaptix app packaging blueprint

Synaptix must ship as a real app, not only as a dev server. This blueprint converts the Orca-style packaging lessons into Synaptix-owned implementation steps without copying proprietary code or assets.

## Target artifacts

### Desktop

- macOS: `.dmg` plus zipped app, arm64 first, x64/universal later.
- Windows: NSIS `.exe` installer.
- Linux: AppImage first, then `.deb`/`.rpm` after native dependency smoke tests.
- CLI: bundled executable exposed by installers as `synaptix`.
- Updates: start with GitHub Releases; add in-app updater after signed artifacts are stable.

### Mobile companion

- Current first-class mobile surface: installable PWA.
- Native mobile target: Expo/React Native shell when push notifications, native sharing, camera/QR, secure storage, and deep links require it.
- Android: APK in GitHub Releases first.
- iOS: App Store/TestFlight later, with explicit push entitlement configuration.

### Relay/push cloud

- Not first build step. Add only after desktop + PWA/mobile shell can pair locally.
- Relay must use outbound WebSockets from both desktop and mobile so NAT/firewalls do not require inbound desktop ports.
- Push gateway should be separate from relay transport and use versioned contracts.

## Packaging architecture

Synaptix keeps the current `packages/agent`, `packages/web`, and `packages/cli` as runtime building blocks.

Desktop app responsibilities:

1. start/stop the local Synaptix agent;
2. load the built web UI in a desktop shell;
3. expose pairing URL/QR and status in native chrome/tray;
4. package native runtime dependencies correctly;
5. ship the CLI and future updater metadata.

Mobile app responsibilities:

1. pair with a desktop/server host;
2. show agents, worktrees, notifications, diffs and terminal summaries;
3. send follow-ups/approvals;
4. upload files/images explicitly;
5. receive push notifications once relay/push exists.

## Build sequence

1. Add inert app scaffolds and a CI contract check. **Current step.**
2. Extract `startAgent()` from `packages/agent` so desktop can launch it programmatically.
3. Add Electron dependencies and a minimal `@synaptix/desktop` build.
4. Package macOS local unsigned build; verify installed app starts agent and UI.
5. Add Linux AppImage local build; verify node-pty/better-sqlite3 runtime.
6. Add Windows NSIS after native module rebuild is reliable.
7. Add Expo mobile shell once push/deep-link requirements are concrete.
8. Add relay/push cloud only after local pairing and mobile app are stable.

## Hard rules

- Do not claim a platform is supported until an artifact is built and smoke-tested.
- Do not include source/docs/tests inside desktop runtime bundles unless needed.
- Native executables and CLIs must live outside `app.asar` or equivalent archives.
- Tokens, terminal output and repo contents must not be cached by the mobile/PWA service worker.
- PR CI validates contracts without signing credentials; release workflows use gated secrets only.
