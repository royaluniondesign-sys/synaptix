<div align="center">

<img src="assets/termora-banner.svg" alt="termora — Your machine, in your hands." width="100%" />

<br /><br />

[![CI](https://github.com/royaluniondesign-sys/termora/actions/workflows/ci.yml/badge.svg)](https://github.com/royaluniondesign-sys/termora/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)]()

**Real terminal and agent control from any phone, tablet, or browser.**

A local-first, installable cockpit for Mac/Linux machines: real PTYs, multi-session terminal control, secure QR onboarding, tunnel status, persistent sessions, and a roadmap toward full SSH/SFTP, multi-machine, Git, worktree, and agent orchestration.

[Quickstart](#quickstart) · [Features](#features) · [How it works](#how-it-works) · [Multi-machine](#multi-machine) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

</div>

---

<div align="center">

![Termora mobile walkthrough](docs/images/termora-mobile-tour.gif)

<table>
<tr>
<td align="center"><img src="docs/images/phone-dashboard.png" width="200" /><br /><sub><b>Live Dashboard</b></sub></td>
<td align="center"><img src="docs/images/phone-terminal.png" width="200" /><br /><sub><b>Touch Terminal</b></sub></td>
<td align="center"><img src="docs/images/phone-tunnels.png" width="200" /><br /><sub><b>Tunnel Control</b></sub></td>
</tr>
<tr>
<td align="center"><img src="docs/images/phone-sessions.png" width="200" /><br /><sub><b>Session Overview</b></sub></td>
<td align="center"><img src="docs/images/phone-settings.png" width="200" /><br /><sub><b>Machine Settings</b></sub></td>
<td align="center"><img src="docs/images/desktop-dashboard.png" width="260" /><br /><sub><b>Desktop Web UI</b></sub></td>
</tr>
</table>

[MP4 demo](docs/images/termora-mobile-tour.mp4)

</div>

---

## Why Termora

Termora is built for developers who run serious work on real machines but want control from anywhere.

Compared with classic mobile SSH clients, Termora gives you a full browser/PWA interface, multi-session previews, custom terminal keyboards, QR pairing, session persistence, and a shareable authenticated URL.

Compared with cloud IDEs, Termora keeps the work on your own Mac/Linux/server. No hosted workspace lock-in, no fake shell, no remote filesystem copy. It streams your real PTY and local agent processes.

Compared with single-agent dashboards, Termora is designed to become the machine cockpit: terminals first today, then files, SSH/SFTP, Git, agents, worktrees, browser previews, notifications, and verification gates in one installable app.

## What works now

- **Real PTY streaming** — zsh/bash/tmux/vim/htop/Claude Code/OpenCode work as real terminal sessions.
- **PWA mobile UI** — install to home screen, fullscreen, custom terminal keyboard, touch action bar, session grid.
- **Secure onboarding** — QR/bootstrap token, JWT session auth, rate-limited auth endpoints.
- **Multi-session control** — create, rename, close, reconnect, preview, and resume terminal sessions.
- **Session persistence** — tmux control mode when available, with fallback to raw PTY.
- **Machine/tunnel status UI** — live dashboard, tunnel cards, QR pairing, and copyable access URL.
- **Connectivity fallback** — LAN/Wi-Fi today, with ngrok/SSH tunnel plumbing in the agent.

## Where it is going

Termora is evolving into an installable, multi-device developer cockpit:

- SSH/SFTP UI;
- Git/worktrees;
- agents/workers visual UI;
- files and previews;
- notifications and multi-machine central cockpit;
- project/workspace registry;
- diff/source-control review from phone;
- push notifications when work finishes or needs input;
- run records with lint/typecheck/test/build gates;
- desktop-grade panes: file tree, editor, terminal splits, logs, command palette.

See:

- [Product evolution plan](docs/product-evolution.md)
- [Roadmap](ROADMAP.md)
- [Protocol](docs/protocol.md)
- [Security](docs/security.md)
- [Multi-machine](docs/multi-machine.md)

---

## Quickstart

> Requires Node.js 20+ and macOS or Linux.

```bash
git clone https://github.com/royaluniondesign-sys/termora.git
cd termora
npm install
npm run dev
```

Scan the QR code printed in the terminal. Termora opens a real terminal session from your phone or browser.

Already installed:

```bash
cd termora
npm run dev
```

Stop it with `Ctrl+C` in the terminal where `npm run dev` is running.

---

## How it works

```text
  Phone / Tablet / Browser
        |
        | HTTPS + WebSocket
        v
  +---------------------------+
  |  Tunnel auto-selection    |
  |  1. ngrok static URL      |
  |  2. localhost.run SSH     |
  |  3. LAN / Wi-Fi fallback  |
  +------------+--------------+
               v
  +---------------------------+
  | termora agent             |
  | real PTYs + tmux control  |
  | SSH/SFTP + auth + routes  |
  | up to 8 live sessions     |
  +---------------------------+
```

1. `npm run dev` starts the backend agent and React frontend.
2. The agent spawns real terminal sessions through `node-pty`.
3. A tunnel exposes the agent over HTTPS or LAN.
4. A short-lived bootstrap token pairs your browser/phone.
5. xterm.js renders full ANSI terminal output with WebGL acceleration.
6. tmux keeps sessions alive across reconnects and restarts when installed.

---

## Features

### Terminal cockpit

- Multiple live PTY sessions.
- Session grid with previews.
- Rename, close, reconnect, and scrollback replay.
- Context strip for Esc, function keys, commit, diff, plan, Ctrl+C.
- Touch action bar for select/copy/paste/cut/tab/history.
- iOS-style and MacBook-style terminal keyboards.
- Sticky Shift/Ctrl/Opt/Cmd modifiers.
- Hardware-accelerated terminal rendering.

### Machine access

- Authenticated connection panel.
- Copyable one-click auth URL.
- QR onboarding.
- ngrok/SSH/LAN tunnel modes.
- Static URL support per machine.

### Security

| Layer | Protection |
| --- | --- |
| Pairing | Short-lived bootstrap token |
| Session auth | JWT rotation |
| Static access | Persistent token stored locally |
| Transport | HTTPS tunnel or local network |
| Auth routes | Rate limited |
| Terminal input | Size bounds and validation |
| Output flow | WebSocket backpressure |
| Secrets | Sensitive env stripped from PTY env |
| Storage | No hosted workspace or cloud file copy |

### Developer workflow

- TypeScript monorepo with npm workspaces.
- Turborepo tasks for lint/typecheck/test/build.
- CI workflow on Node 20 and 22.
- Shared protocol package for client/server message contracts.
- Vitest coverage for auth, protocol lifecycle, session persistence, worktree fan-out, and device revocation.

---

## Multi-machine

Run Termora on every machine you want to control.

```bash
git clone https://github.com/royaluniondesign-sys/termora.git
cd termora
npm install
npm run dev
```

Each machine prints its own QR/auth URL. Bookmark each URL or add each as a separate PWA icon.

Optional stable domains:

```bash
# Machine A
NGROK_STATIC_DOMAIN=macbook.ngrok-free.dev npm run dev

# Machine B
NGROK_STATIC_DOMAIN=server.ngrok-free.dev npm run dev
```

---

## Configuration

Create `.env` in the project root. All fields are optional.

```bash
NGROK_AUTHTOKEN=your_token
NGROK_STATIC_DOMAIN=your.ngrok-free.dev
TERMORA_PORT=4030
TERMORA_MAX_SESSIONS=8
TERMORA_NO_TMUX=1
TUNNEL=ssh
```

`TERMORA_PORT` takes precedence over `PORT`.

---

## Commands

```bash
npm run dev         # start agent + web client
npm run lint        # eslint all packages
npm run typecheck   # TypeScript checks
npm test            # Vitest suites
npm run build       # production build
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | React 18, TypeScript, Vite 6, Tailwind CSS v4, xterm.js |
| Agent | Node.js 20+, Express, ws, node-pty, better-sqlite3 |
| Sessions | PTY + tmux control mode |
| Tunnels | ngrok SDK, localhost.run SSH fallback, LAN fallback |
| Auth | jose JWT, bootstrap/static tokens, express-rate-limit |
| SSH/SFTP | ssh2, authenticated API routes |
| Monorepo | npm workspaces, Turborepo |
| Tests | Vitest |

---

## Project layout

```text
packages/agent   Local machine agent, auth, PTY, SSH/SFTP, tunnels
packages/web     Installable PWA/web cockpit
packages/shared  Shared WebSocket protocol types
packages/cli     CLI wrapper and automation entrypoint
docs/            Security, protocol, multi-machine, product evolution
```

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes verified with:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## License

MIT — see [LICENSE](LICENSE).
