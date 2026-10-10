# Termora Agent Cockpit Capabilities

Termora's target surface is a real multi-device cockpit for terminal agents, not a static dashboard. This document tracks the capability set being integrated into the app.

## Core capabilities

### Mobile Companion

Monitor and steer agents from a phone. The PWA already supports secure pairing, mobile dashboard, terminal sessions, and resume flows. Next steps: push notifications, unread state, native wrappers, Android APK, and App Store packaging.

### Parallel Worktrees

Fan one prompt across multiple isolated git worktrees, compare results, then merge the winner. Backend worktree primitives and tests exist; the remaining work is full UI orchestration, diff comparison, and winner/loser lifecycle.

### Terminal Splits

Termora already runs real PTYs and supports persistence via tmux. The target is saved split layouts, resizeable panes, long scrollback search, and terminal layout recovery across restart.

### Design Mode

Target workflow: click any UI element in a real Chromium window, capture its DOM/CSS/cropped screenshot, and send that directly to an agent prompt. Current browser/capture automation used for QA should become an in-app workflow.

### GitHub & task workflows

Termora should browse PRs/issues/project boards, launch worktrees from tasks, and support review without leaving the cockpit. GitHub CI verification is already part of the development workflow.

### SSH Worktrees

Run agents on a remote box with full file editing, git, terminal, reconnect, and port forwarding. Current remote workflow is proven with RUD-SERVER over Tailscale SSH; product UI remains to be built.

### Annotate AI Diffs

Review AI-generated diffs with inline comments, send those comments back to the active agent, then edit/commit from the same app.

### Drag Files to Agents

Drag files, screenshots, images, or repo docs directly into an agent prompt. The file-tree backend is the first foundation; prompt attachment transport remains to be implemented.

### Termora CLI

Target commands include `termora worktree create`, `termora snapshot`, `termora click`, `termora fill`, `termora agent run`, and `termora gates watch`.

## Also in the box

- Quick open across worktrees, files, agents, commands, sessions, and repo context.
- Account switcher and usage tracking for Claude, Codex, OpenCode, Hermes, and custom providers.
- Rich repo previews for Markdown, images, PDFs, docs, logs, and web previews.
- Computer-use workflows for visible UI interaction when command-line control is not enough.
- Notifications and unread state for done/failed/needs-input/rate-limit-reset events.

## Supported agents

Termora should support any CLI agent. Current/target examples include Claude Code, Codex, Grok, Cursor/Copilot-style CLIs, DeepSeek Harness, Qwen Code, Kimi/Kiro-style CLIs, OpenCode, Hermes Agent, Devin/Goose/Cline/Continue/Aider-style tools, and any custom command configured by the user.

## Implementation rule

A capability is not complete until it has:

1. backend/API support;
2. UI controls;
3. loading/error/failure states;
4. tests or verified manual gates;
5. documented current state without overclaiming.
