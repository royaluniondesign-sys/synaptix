/**
 * Persistent split-layout contract for the terminal workspace.
 *
 * This is deliberately a pure data model: it records *which* live session is
 * shown in each split pane and how the panes are arranged, but it does not own
 * a PTY multiplexer or the xterm instances themselves. Keeping the contract
 * small and serializable means the UI can render one terminal per assigned
 * session today, and a future split engine only has to swap the renderer behind
 * the same model.
 *
 * A session may occupy at most one pane at a time; assigning it to a new pane
 * clears any previous pane. Layouts that reference sessions which no longer
 * exist are healed by `reconcileLayout`.
 */

export type SplitMode = 'single' | 'columns' | 'rows' | 'quad';

export interface SplitPane {
  /** Stable slot id; survives session reassignment and mode changes. */
  id: string;
  /** Attached live session id, or null for an empty slot. */
  sessionId: string | null;
}

export interface SplitLayout {
  version: 1;
  mode: SplitMode;
  panes: SplitPane[];
}

export const SPLIT_LAYOUT_VERSION = 1 as const;

export const SPLIT_LAYOUT_STORAGE_KEY = 'synaptix.split-layout.v1';

export const SPLIT_MODES: readonly SplitMode[] = ['single', 'columns', 'rows', 'quad'];

const PANE_COUNT: Record<SplitMode, number> = {
  single: 1,
  columns: 2,
  rows: 2,
  quad: 4,
};

export function paneCountForMode(mode: SplitMode): number {
  return PANE_COUNT[mode];
}

function paneId(index: number): string {
  return `pane-${String(index + 1)}`;
}

/** Builds an empty layout for the given mode. */
export function createLayout(mode: SplitMode = 'single'): SplitLayout {
  const count = paneCountForMode(mode);
  return {
    version: SPLIT_LAYOUT_VERSION,
    mode,
    panes: Array.from({ length: count }, (_, index) => ({ id: paneId(index), sessionId: null })),
  };
}

/**
 * Switches layout mode while preserving existing pane/session assignments.
 * Growing adds empty panes; shrinking drops the trailing panes.
 */
export function setMode(layout: SplitLayout, mode: SplitMode): SplitLayout {
  const count = paneCountForMode(mode);
  const panes = Array.from({ length: count }, (_, index) => {
    const existing = layout.panes[index];
    return existing ? { ...existing } : { id: paneId(index), sessionId: null };
  });
  return { ...layout, mode, panes };
}

/**
 * Assigns a session (or null to empty) to a pane. A session can only be shown
 * in one pane, so any other pane holding it is cleared.
 */
export function assignPane(
  layout: SplitLayout,
  targetPaneId: string,
  sessionId: string | null,
): SplitLayout {
  const panes = layout.panes.map((pane) => {
    if (pane.id === targetPaneId) return { ...pane, sessionId };
    if (sessionId !== null && pane.sessionId === sessionId) return { ...pane, sessionId: null };
    return pane;
  });
  return { ...layout, panes };
}

/** Clears a session from every pane (used when a session exits). */
export function clearSession(layout: SplitLayout, sessionId: string): SplitLayout {
  if (!layout.panes.some((pane) => pane.sessionId === sessionId)) return layout;
  const panes = layout.panes.map((pane) =>
    pane.sessionId === sessionId ? { ...pane, sessionId: null } : pane,
  );
  return { ...layout, panes };
}

/** Session ids currently assigned to a pane, in pane order. */
export function activeSessionIds(layout: SplitLayout): string[] {
  return layout.panes.flatMap((pane) => (pane.sessionId === null ? [] : [pane.sessionId]));
}

/**
 * Drops pane assignments whose session no longer exists, leaving the rest of
 * the layout untouched. Used to heal stale persisted layouts.
 */
export function reconcileLayout(
  layout: SplitLayout,
  availableSessionIds: readonly string[],
): SplitLayout {
  const available = new Set(availableSessionIds);
  let changed = false;
  const panes = layout.panes.map((pane) => {
    if (pane.sessionId !== null && !available.has(pane.sessionId)) {
      changed = true;
      return { ...pane, sessionId: null };
    }
    return pane;
  });
  return changed ? { ...layout, panes } : layout;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Runtime guard for untrusted input (persisted JSON, server payloads). */
export function isValidLayout(value: unknown): value is SplitLayout {
  if (!isRecord(value)) return false;
  if (value.version !== SPLIT_LAYOUT_VERSION) return false;
  if (typeof value.mode !== 'string' || !SPLIT_MODES.includes(value.mode as SplitMode)) return false;
  if (!Array.isArray(value.panes)) return false;
  if (value.panes.length !== paneCountForMode(value.mode as SplitMode)) return false;
  return value.panes.every(
    (pane) =>
      isRecord(pane) &&
      typeof pane.id === 'string' &&
      (pane.sessionId === null || typeof pane.sessionId === 'string'),
  );
}

export function serializeLayout(layout: SplitLayout): string {
  return JSON.stringify(layout);
}

/** Parses a serialized layout, returning null for anything malformed. */
export function parseLayout(raw: string | null | undefined): SplitLayout | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidLayout(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadLayout(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): SplitLayout | null {
  if (!storage) return null;
  try {
    return parseLayout(storage.getItem(SPLIT_LAYOUT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveLayout(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  layout: SplitLayout,
): void {
  if (!storage) return;
  try {
    storage.setItem(SPLIT_LAYOUT_STORAGE_KEY, serializeLayout(layout));
  } catch {
    // Storage may be unavailable (private mode / quota). Layout is best-effort.
  }
}
