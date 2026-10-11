import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import {
  assignPane,
  createLayout,
  loadLayout,
  reconcileLayout,
  saveLayout,
  setMode as applyMode,
  type SplitLayout,
  type SplitMode,
} from '../lib/split-layout';

export interface UseSplitLayoutReturn {
  layout: SplitLayout;
  setMode: (mode: SplitMode) => void;
  /** Assigns the currently active session to a pane (no-op without one). */
  assignActiveSession: (paneId: string) => void;
  clearPane: (paneId: string) => void;
}

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/**
 * Owns the persisted split layout for the terminal workspace. The layout is a
 * pure data contract (see lib/split-layout) — this hook only keeps it in sync
 * with real sessions and localStorage.
 */
export function useSplitLayout(
  sessions: Session[],
  activeSessionId: string | null,
): UseSplitLayoutReturn {
  const [layout, setLayout] = useState<SplitLayout>(
    () => loadLayout(browserStorage()) ?? createLayout('single'),
  );

  const persist = useCallback((next: SplitLayout) => {
    setLayout(next);
    saveLayout(browserStorage(), next);
  }, []);

  const availableKey = useMemo(() => sessions.map((session) => session.id).join('\n'), [sessions]);

  // Heal assignments whose session no longer exists.
  useEffect(() => {
    const available = availableKey === '' ? [] : availableKey.split('\n');
    setLayout((prev) => {
      const next = reconcileLayout(prev, available);
      if (next !== prev) saveLayout(browserStorage(), next);
      return next;
    });
  }, [availableKey]);

  const setMode = useCallback(
    (mode: SplitMode) => {
      setLayout((prev) => {
        const next = applyMode(prev, mode);
        saveLayout(browserStorage(), next);
        return next;
      });
    },
    [],
  );

  const assignActiveSession = useCallback(
    (paneId: string) => {
      if (!activeSessionId) return;
      persist(assignPane(layout, paneId, activeSessionId));
    },
    [activeSessionId, layout, persist],
  );

  const clearPane = useCallback(
    (paneId: string) => {
      persist(assignPane(layout, paneId, null));
    },
    [layout, persist],
  );

  return { layout, setMode, assignActiveSession, clearPane };
}
