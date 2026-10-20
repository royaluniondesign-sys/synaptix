// @synaptix/agent -- CLI entry point
// Starts the local agent, opens a tunnel, prints QR code, and handles signals.
//
// The core lifecycle lives in ./runtime.ts (startAgent) so desktop shells can
// launch it programmatically. This file adds CLI-only behavior on top.

import { spawn } from 'node:child_process';
import { startAgent } from './runtime.js';
import { resolveTunnelPort } from './server.js';
import { createTunnel, printAccessInfo, startTunnelMonitor, registerShutdownHandlers } from './tunnel.js';
import { checkNetworkPersistence } from './power.js';

/**
 * Prevents macOS from sleeping while the agent is running.
 * Flags: -d (display), -i (idle), -s (system/lid-close on AC power).
 * The caffeinate process is killed automatically when the agent exits (-w).
 */
function preventSleep(): (() => void) | null {
  if (process.platform !== 'darwin') return null;
  try {
    const child = spawn('caffeinate', ['-dis', '-w', String(process.pid)], {
      stdio: 'ignore',
      detached: false,
    });
    child.unref();
    console.log('  Sleep prevention active (caffeinate)');
    return () => child.kill();
  } catch {
    console.log('  Warning: could not start caffeinate — machine may sleep');
    return null;
  }
}

async function main(): Promise<void> {
  // 0a. Check if macOS is configured for lid-close networking
  checkNetworkPersistence();

  // 0b. Prevent macOS from sleeping while the agent is running
  const stopCaffeinate = preventSleep();

  // 1. Start the core agent (config, DB, HTTP/WS, PTY)
  const agent = await startAgent();
  const { config, port } = agent;

  // 2. Create tunnel — tries ngrok → SSH (localhost.run) → local network IP
  // In dev the tunnel targets WEB_PORT (Vite); in production it targets the
  // agent itself. resolveTunnelPort falls back when nothing serves WEB_PORT.
  const tunnelPort = await resolveTunnelPort(config.webPort, port);
  const tunnel = await createTunnel(
    tunnelPort,
    config.ngrokAuthtoken,
    config.ngrokStaticDomain,
    config.tunnelMethod,
  );

  // 3. Print clean startup info (use static token for persistent one-click access)
  printAccessInfo(tunnel.url, config.staticToken, tunnel.method);

  // 4. Monitor tunnel health — auto-recovers after sleep/wake or SSH death
  const stopTunnelMonitor = startTunnelMonitor((newUrl, method) => {
    // Tunnel was recreated with a (possibly new) URL — reprint access info
    printAccessInfo(newUrl, config.staticToken, method);
  });

  // 5. Register graceful shutdown handlers
  registerShutdownHandlers(async () => {
    stopCaffeinate?.();
    stopTunnelMonitor();
    await agent.close(); // Kills control clients but leaves tmux sessions alive
  });
}

main().catch((err: unknown) => {
  console.error('Fatal error starting synaptix agent:', err);
  process.exit(1);
});
