// @termora/agent runtime — programmatic lifecycle API.
//
// `index.ts` is a CLI entry point: importing it starts the server, opens a
// tunnel, prints a QR code, and installs signal handlers. Desktop shells need
// to own that lifecycle instead, so this module exposes the same core
// (config → DB → HTTP/WS → PTY) as an explicit `startAgent()`/`close()` pair
// with no top-level side effects and no tunnel or terminal output tied to it.

import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import type { WebSocketServer } from 'ws';
import { loadConfig, type AgentConfig } from './config.js';
import { initDatabase } from './db.js';
import { generateBootstrapToken, hashToken } from './auth.js';
import { createAppServer, startServer } from './server.js';
import { setupWebSocketHandler } from './ws-handler.js';
import { PTYManager } from './pty-manager.js';
import { isTmuxAvailable, ensureTmuxConfig } from './tmux.js';

export interface StartAgentOptions {
  /**
   * Full agent configuration. When omitted, it is loaded from the environment
   * and `.env` via {@link loadConfig}. Pass an explicit config to keep the
   * runtime hermetic (tests, embedded shells).
   */
  config?: AgentConfig;
  /** Emit lifecycle log lines. Defaults to true, matching the CLI. */
  log?: boolean;
  /** Re-attach persisted tmux sessions on startup. Defaults to true. */
  recoverSessions?: boolean;
}

/**
 * A running agent. Owns the HTTP server, WebSocket server, PTY manager, and
 * database handle; call {@link AgentHandle.close} to release all of them.
 */
export interface AgentHandle {
  /** Effective configuration the running agent was started with. */
  readonly config: AgentConfig;
  /** Actual listening port (may differ from `config.port` if it was busy). */
  readonly port: number;
  readonly httpServer: HttpServer;
  readonly wss: WebSocketServer;
  readonly ptyManager: PTYManager;
  /**
   * Stops the PTY clients (leaving tmux sessions alive for recovery), closes
   * the HTTP/WebSocket servers, and closes the database. Idempotent.
   */
  close(): Promise<void>;
}

/**
 * Starts the local agent programmatically and resolves once it is listening.
 *
 * This performs no tunneling and writes no QR banner — those stay in the CLI
 * entry point. The returned handle owns everything that was created.
 */
export async function startAgent(options: StartAgentOptions = {}): Promise<AgentHandle> {
  const log = options.log ?? true;
  const config = options.config ?? loadConfig();

  const { db, statements } = initDatabase(config.dbPath);

  // Persist a bootstrap token so short-lived bootstrap auth works for clients
  // that do not carry the persistent static token. Mirrors the CLI startup.
  const bootstrapToken = generateBootstrapToken();
  statements.insertBootstrapToken.run(randomUUID(), hashToken(bootstrapToken));

  let tmuxEnabled = false;
  let tmuxConfPath: string | null = null;
  if (config.tmuxDisabled) {
    if (log) console.log('  Session persistence disabled (TERMORA_NO_TMUX=1)');
  } else if (!isTmuxAvailable()) {
    if (log) console.log('  Sessions are ephemeral (tmux not found — install tmux for session persistence)');
  } else {
    tmuxConfPath = ensureTmuxConfig();
    tmuxEnabled = true;
    if (log) console.log('  Session persistence active (tmux control mode)');
  }

  const { httpServer, wss } = createAppServer(config, statements);

  const ptyManager = new PTYManager({
    tmuxEnabled,
    tmuxConfPath,
    dbStatements: statements,
  });

  if (tmuxEnabled && (options.recoverSessions ?? true)) {
    const recovered = ptyManager.rediscoverAll();
    if (recovered.length > 0 && log) {
      console.log(`  Recovered ${String(recovered.length)} session(s) from previous run`);
    }
  }

  setupWebSocketHandler(wss, ptyManager, config.jwtSecret, statements);

  const port = await startServer(httpServer, config.port);
  if (port !== config.port && log) {
    console.log(`  Agent running on port ${String(port)} (${String(config.port)} was busy)`);
  }

  let closed = false;
  return {
    config,
    port,
    httpServer,
    wss,
    ptyManager,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;

      ptyManager.destroyAll();
      for (const client of wss.clients) client.terminate();

      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
        // Drop lingering keep-alive sockets so close() resolves promptly.
        httpServer.closeAllConnections?.();
      });

      db.close();
    },
  };
}
