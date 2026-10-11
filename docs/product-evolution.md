# Product Evolution

Termora started as a mobile-first terminal for real machines. The next version is an installable developer cockpit that combines terminal control, files, SSH/SFTP, Git, worktrees, agent sessions, browser previews, notifications, and verification gates.

## Direction

Termora should become the control plane for local and remote development machines:

1. Install Termora on Mac, Linux, WSL, or a server.
2. Pair every device: phone, tablet, browser, secondary laptop.
3. See every host, project, worktree, terminal, agent, diff, preview, and gate from one UI.
4. Launch or steer CLI agents without caring which machine they run on.
5. Review changes, run verification, commit, push, or discard from mobile.
6. Keep everything local-first and auditable: real PTYs, real git, real files, real logs.

## Competitive position

Termora should take the best ideas across existing developer tools without inheriting their limits:

- from mobile SSH clients: instant phone access, but with richer UI and session management;
- from cloud IDEs: project/file/diff ergonomics, but local-first with no hosted workspace lock-in;
- from agent dashboards: task visibility and model status, but backed by real terminal sessions;
- from desktop terminals: splits, themes, scrollback, keyboard control, and high performance;
- from Git clients: safe diffs, staging, commits, worktree isolation, and review flow.

## Core product pillars

### 1. Machine cockpit

- Host registry.
- Connection health.
- QR/deep-link pairing.
- Static URLs and PWA install.
- Multi-machine switching.
- Terminal, SSH, SFTP, files, and logs per host.

### 2. Project cockpit

- Workspace registry.
- Git status and diffs.
- File explorer and editor.
- Browser preview per project.
- Project docs and memory links.
- Run history and reports.

### 3. Worktree cockpit

- One task per isolated worktree.
- Checkpoint before agent starts.
- Compare worker results.
- Pick winner, archive losers.
- Never let agents collide in the same dirty tree.

### 4. Agent cockpit

- Launch profiles for CLI agents.
- Agent status and transcript view.
- Raw PTY mode when exact terminal control is needed.
- Prompt templates, quick replies, and attachments.
- Usage/rate-limit indicators.
- Verification gates after edits.

### 5. Mobile-first operations

- Push notifications.
- Actionable alerts.
- Source control from phone.
- File browsing/editing from phone.
- Command palette and quick commands.
- Installable app experience.

## Architecture proposal

Current packages:

- `packages/agent`: local daemon for PTY, auth, tunnels, SSH/SFTP, and future worktree/agent management.
- `packages/web`: installable PWA and desktop web cockpit.
- Protocol/event contracts currently live in the agent, web, and CLI packages; extract a shared package only when the boundary needs it.
- `packages/cli`: lifecycle and automation CLI.

Future packages:

- `packages/mcp`: MCP server exposing safe Termora tools.
- `packages/desktop`: optional native wrapper if Electron/Tauri is chosen.

## New domain models

- `Host`: machine identity, capabilities, health.
- `Workspace`: repo/project root on a host.
- `Worktree`: isolated checkout, branch, base, task, status.
- `Session`: PTY or agent terminal.
- `AgentProfile`: CLI command, args, env policy, supported features.
- `Run`: objective, worker, timeline, artifacts, gates, final report.
- `Gate`: command, result, logs, timestamp.
- `Notification`: user-facing event and action.

## Protocol additions

- `host_list`, `host_update`.
- `workspace_list`, `workspace_create`.
- `worktree_list`, `worktree_create`, `worktree_archive`, `worktree_checkpoint`.
- `agent_profile_list`, `agent_start`, `agent_reply`, `agent_stop`.
- `run_list`, `run_detail`, `run_event`, `run_gate_result`.
- `git_status`, `git_diff`, `git_stage`, `git_commit`, `git_push`.
- `browser_preview_open`, `browser_preview_status`.
- `notification_subscribe`, `notification_action`.

## Build sequence

### Milestone A — Workspace foundation

- Persist hosts/workspaces/worktrees in SQLite.
- Add safe git/worktree service in the agent.
- Add workspace/worktree APIs.
- Add project/worktree UI cards.
- Add tests for command safety and worktree lifecycle.

### Milestone B — Agent launcher

- Add agent profile registry.
- Launch agent sessions as typed PTY sessions.
- Add status parser hooks.
- Add Agent Cockpit UI.
- Add per-project prompt templates.

### Milestone C — Mobile control plane

- Add host/worktree/session list optimized for phone.
- Add transcript/chat view for known agents.
- Add quick replies and attachments.
- Add push notification plumbing.
- Add source-control mobile screen.

### Milestone D — Desktop-grade panes

- File tree and editor.
- Diff viewer and commit flow.
- Browser preview per worktree.
- Responsive preview mode.
- Markdown/Mermaid/PDF/image viewers.

### Milestone E — Packaging

- Harden PWA install path.
- Package global CLI.
- Add Linux AppImage/deb path.
- Add macOS/Windows wrapper path.
- Define update/checksum process.

### Milestone F — Automation

- Run records and gates.
- Multi-agent race mode.
- Lead/worker orchestration.
- MCP server.
- Webhooks and scheduled automations.

## Guardrails

- Never run multiple agents in the same dirty worktree.
- Never expose raw secrets to the web UI.
- Never auto-commit without showing diff and gates.
- Every destructive action needs undo/archive/discard path.
- Every agent run needs a final report and command log.
- Every new endpoint needs auth and tests.
