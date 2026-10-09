# Security Policy

Termora provides authenticated access to real terminals. Treat every deployment as sensitive infrastructure.

## Supported versions

Security fixes target the `main` branch until the project starts publishing versioned releases.

## Reporting a vulnerability

Open a private GitHub security advisory or contact the maintainers directly. Do not publish exploit details before a fix is available.

## Security model

- The agent runs locally on the user's machine/server.
- Browser/mobile access is authenticated through bootstrap/static tokens and JWT sessions.
- SSH/SFTP APIs require authenticated requests.
- Raw secrets must not be logged, committed, or exposed through the web UI.
- Destructive operations should require explicit confirmation.

## Recommended deployment

- Prefer localhost/Tailscale/LAN for private use.
- Use static HTTPS tunnels only when needed.
- Rotate tokens if a URL was shared too broadly.
- Keep Node.js and dependencies current.
