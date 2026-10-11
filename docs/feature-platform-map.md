# Termora feature platform map

This maps the required agent-cockpit features to desktop, mobile, backend, and optional cloud surfaces.

| Feature | Desktop app | Mobile companion | Backend/agent | Relay/cloud |
| --- | --- | --- | --- | --- |
| Mobile Companion | QR pairing, device list, handoff controls | Agent inbox, follow-ups, approvals, push targets | Persistent sessions/events | Relay + push fanout |
| Parallel Worktrees | Create/list/open/compare worktrees | Monitor lanes and pause/resume | Safe git worktree APIs, locks, cleanup | Sync status only |
| Terminal Splits | Saved split layouts and real PTYs | Read summaries/logs, send approved commands | PTY multiplexing, scrollback | Stream compressed output |
| Design Mode | Chromium preview, DOM/CSS/screenshot capture | Review and approve visual changes | Preview server + capture jobs | Optional preview tunnel |
| GitHub & Linear | PR/issues/tasks inside app | Triage/review/approve | OAuth, webhooks, task mapping | Webhook receiver |
| GitHub workflow (live) | gh auth/repo status + branch/PR hints via local `gh` | Triage/review/approve UI | `GET /api/cockpit/github`, `github-status` action | OAuth bonuses + webhooks |
| SSH Worktrees | Remote host registry and worktree UI | Monitor remote agents | Remote agent install, SSH, port forward | NAT relay optional |
| Annotate AI Diffs | Inline diff comments and review flow | Quick review/comment | Diff parser and prompt→change trace | Share review state |
| Drag Files to Agents | Drag files/images into prompts | Upload photo/file/document | Attachment store, expiry, privacy | Optional transfer relay |
| Termora CLI | Deep links and local command bridge | Indirect actions via backend | `termora start/status/agent/worktree` | Token/scoped control |
| Quick Open | Global palette for repos/files/agents | Compact search | Local index | Recent remote index |
| Usage tracking | Provider/model/account usage UI | Alerts and reset timers | Metering per session/agent | Optional billing/sync |
| Rich repo previews | Markdown/image/PDF/log preview panes | Compact repo cards | Preview processors | Snapshot sync |
| Computer Use | Visible browser/desktop control | Observe/pause/approve | Permissioned UI control and logs | Optional state stream |
| Notifications/unread | Local notification center | Push/unread inbox | Event bus and priority model | Push gateway |
| Any CLI agent | Agent registry and terminal adapters | Control session, not local CLI | PTY adapter protocol | Multi-host session routing |

## MVP order

1. CLI and agent adapter protocol.
2. Desktop shell around current agent/web.
3. Local worktrees + repo previews.
4. Terminal splits.
5. File attachments to agents.
6. Diff review/annotations.
7. GitHub first, Linear second.
8. Local notifications/unread.
9. Mobile companion shell.
10. Relay and push.
11. SSH worktrees.
12. Design Mode.
13. Computer Use.
14. Usage/account tracking.
