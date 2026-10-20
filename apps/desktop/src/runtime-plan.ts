// Synaptix desktop runtime plan.
// Pure data module: no Electron, no Node APIs, no side effects.
// This is the single source of truth for how the desktop shell is wired to
// the existing agent/web/cli build outputs. The Electron main process (added
// in a later phase) consumes this plan; keeping it dependency-free lets the
// contract be unit-tested and checked without installing Electron.

export type AgentEntryStrategy = 'programmatic' | 'subprocess';

export type DesktopShellPhase = 'scaffold' | 'local-shell' | 'packaged';

export type DesktopRuntimePlan = {
  /**
   * Which build step this plan describes. Packaging claims are gated on this
   * value so the scaffold never advertises a shipped installer.
   */
  phase: DesktopShellPhase;
  /** Load the built web cockpit (packages/web/dist) into the shell window. */
  loadWebDist: boolean;
  /** Start the local Synaptix agent when the shell launches. */
  startLocalAgent: boolean;
  /** Expose the packaged CLI binary to the shell/user. */
  exposeCli: boolean;
  /**
   * How the shell starts the agent. `programmatic` requires an exported
   * `startAgent()` from @synaptix/agent; until it exists the shell must not
   * claim it can start the agent in-process.
   */
  agentEntry: AgentEntryStrategy;
  /** Repo-relative directory of the built web cockpit. */
  webDistDir: string;
  /** Repo-relative directory of the built CLI. */
  cliDistDir: string;
};

export const desktopRuntimePlan: DesktopRuntimePlan = {
  phase: 'scaffold',
  loadWebDist: true,
  startLocalAgent: true,
  exposeCli: true,
  agentEntry: 'programmatic',
  webDistDir: 'packages/web/dist',
  cliDistDir: 'packages/cli/dist',
};
