/**
 * Pure presentation mapping for the terminal split layout.
 *
 * `split-layout` owns *which* session sits in *which* pane. This module turns
 * that contract plus the live session list into flat, render-ready descriptors
 * so the multi-pane view stays a dumb renderer (no PTY, no WebSocket). That
 * keeps the mapping unit-testable and lets a future split engine swap the
 * renderer behind the same view model.
 */

import type { Session } from './types';
import type { SplitLayout, SplitMode, SplitPane } from './split-layout';

/** Visual tone for a pane status dot — matches the cockpit Dot palette. */
export type PaneTone = 'green' | 'orange' | 'red' | 'muted';

export interface PaneView {
  /** Stable slot id from the layout contract. */
  paneId: string;
  /** Assigned session id, or null for an empty slot. */
  sessionId: string | null;
  /** Resolved session, or null when empty / stale. */
  session: Session | null;
  isEmpty: boolean;
  /** True when this pane holds the currently active session. */
  isActive: boolean;
  title: string;
  subtitle: string;
  tone: PaneTone;
}

/** CSS grid tracks for a layout mode. */
export interface PaneGridStyle {
  gridTemplateColumns: string;
  gridTemplateRows: string;
}

const GRID: Record<SplitMode, PaneGridStyle> = {
  single: { gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' },
  columns: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'minmax(0, 1fr)' },
  rows: { gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' },
  quad: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  },
};

/** Grid template for the multi-pane container. Pure lookup, no DOM. */
export function paneGridStyle(mode: SplitMode): PaneGridStyle {
  return GRID[mode];
}

function subtitleFor(session: Session): string {
  const cwd = session.cwd.trim() || '~';
  return `${session.shell} · ${cwd}`;
}

function toneFor(session: Session): PaneTone {
  return session.status === 'run' ? 'green' : 'muted';
}

function viewForPane(pane: SplitPane, sessions: Session[], activeSessionId: string | null): PaneView {
  const session =
    pane.sessionId === null
      ? null
      : (sessions.find((candidate) => candidate.id === pane.sessionId) ?? null);

  if (session === null) {
    return {
      paneId: pane.id,
      sessionId: pane.sessionId,
      session: null,
      isEmpty: true,
      isActive: false,
      title: 'Empty pane',
      subtitle: activeSessionId ? 'assign active session' : 'no active session',
      tone: 'muted',
    };
  }

  return {
    paneId: pane.id,
    sessionId: session.id,
    session,
    isEmpty: false,
    isActive: session.id === activeSessionId,
    title: session.name,
    subtitle: subtitleFor(session),
    tone: toneFor(session),
  };
}

/**
 * Maps a split layout and the live sessions into render-ready pane views.
 * Panes whose assigned session is missing are reported as empty (the layout
 * itself is healed separately by `reconcileLayout`).
 */
export function buildPaneViews(
  layout: SplitLayout,
  sessions: Session[],
  activeSessionId: string | null,
): PaneView[] {
  return layout.panes.map((pane) => viewForPane(pane, sessions, activeSessionId));
}

/** Session ids that should receive a live terminal instance, in pane order. */
export function livePaneSessionIds(views: readonly PaneView[]): string[] {
  return views.flatMap((view) => (view.session === null ? [] : [view.session.id]));
}
