import { describe, it, expect } from 'vitest';
import {
  SPLIT_LAYOUT_STORAGE_KEY,
  activeSessionIds,
  assignPane,
  clearSession,
  createLayout,
  isValidLayout,
  loadLayout,
  paneCountForMode,
  parseLayout,
  reconcileLayout,
  saveLayout,
  serializeLayout,
  setMode,
  type SplitLayout,
} from '../split-layout.js';

describe('createLayout', () => {
  it('creates an empty single-pane layout by default', () => {
    const layout = createLayout();
    expect(layout.mode).toBe('single');
    expect(layout.panes).toHaveLength(1);
    expect(layout.panes[0]).toEqual({ id: 'pane-1', sessionId: null });
  });

  it('creates one pane per mode (quad = 4)', () => {
    expect(paneCountForMode('single')).toBe(1);
    expect(paneCountForMode('columns')).toBe(2);
    expect(paneCountForMode('rows')).toBe(2);
    expect(paneCountForMode('quad')).toBe(4);
    expect(createLayout('quad').panes).toHaveLength(4);
  });
});

describe('setMode', () => {
  it('preserves assignments when growing to a larger mode', () => {
    const assigned = assignPane(createLayout('single'), 'pane-1', 'sess-a');
    const grown = setMode(assigned, 'quad');
    expect(grown.mode).toBe('quad');
    expect(grown.panes).toHaveLength(4);
    expect(grown.panes[0].sessionId).toBe('sess-a');
    expect(grown.panes[3]).toEqual({ id: 'pane-4', sessionId: null });
  });

  it('drops trailing panes when shrinking but keeps surviving ones', () => {
    let layout = createLayout('quad');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-4', 'sess-d');
    const shrunk = setMode(layout, 'single');
    expect(shrunk.panes).toHaveLength(1);
    expect(shrunk.panes[0].sessionId).toBe('sess-a');
  });
});

describe('assignPane', () => {
  it('moves a session out of its previous pane (one pane per session)', () => {
    let layout = createLayout('columns');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-2', 'sess-a');
    expect(layout.panes[0].sessionId).toBeNull();
    expect(layout.panes[1].sessionId).toBe('sess-a');
    expect(activeSessionIds(layout)).toEqual(['sess-a']);
  });

  it('clears a pane when passed null', () => {
    let layout = assignPane(createLayout('columns'), 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-1', null);
    expect(layout.panes[0].sessionId).toBeNull();
  });
});

describe('clearSession and reconcileLayout', () => {
  it('clearSession empties every pane holding the session', () => {
    let layout = createLayout('quad');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-3', 'sess-b');
    const cleared = clearSession(layout, 'sess-a');
    expect(cleared.panes[0].sessionId).toBeNull();
    expect(cleared.panes[2].sessionId).toBe('sess-b');
  });

  it('clearSession returns the same object when the session is absent', () => {
    const layout = createLayout('columns');
    expect(clearSession(layout, 'ghost')).toBe(layout);
  });

  it('reconcileLayout drops assignments for sessions that no longer exist', () => {
    let layout = createLayout('columns');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-2', 'sess-b');
    const healed = reconcileLayout(layout, ['sess-b']);
    expect(healed.panes[0].sessionId).toBeNull();
    expect(healed.panes[1].sessionId).toBe('sess-b');
  });
});

describe('serialization and validation', () => {
  it('round-trips a layout through serialize/parse', () => {
    const layout = assignPane(createLayout('columns'), 'pane-2', 'sess-b');
    expect(parseLayout(serializeLayout(layout))).toEqual(layout);
  });

  it('rejects malformed JSON and wrong shapes', () => {
    expect(parseLayout('not json')).toBeNull();
    expect(parseLayout(null)).toBeNull();
    expect(parseLayout('')).toBeNull();
    expect(isValidLayout({ version: 2, mode: 'single', panes: [] })).toBe(false);
    expect(isValidLayout({ version: 1, mode: 'nope', panes: [] })).toBe(false);
    // pane count must match the mode
    expect(isValidLayout({ version: 1, mode: 'columns', panes: [{ id: 'pane-1', sessionId: null }] })).toBe(false);
    expect(isValidLayout({ version: 1, mode: 'columns', panes: [{ id: 'pane-1', sessionId: 5 }] })).toBe(false);
  });

  it('accepts a valid layout', () => {
    expect(isValidLayout(createLayout('rows'))).toBe(true);
  });
});

describe('storage helpers', () => {
  function memoryStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      dump: () => store,
    };
  }

  it('persists and reloads a layout', () => {
    const storage = memoryStorage();
    const layout = assignPane(createLayout('quad'), 'pane-4', 'sess-d');
    saveLayout(storage, layout);
    expect(storage.dump().get(SPLIT_LAYOUT_STORAGE_KEY)).toBe(serializeLayout(layout));
    expect(loadLayout(storage)).toEqual(layout);
  });

  it('returns null for missing or corrupt entries', () => {
    expect(loadLayout(memoryStorage())).toBeNull();
    expect(loadLayout(memoryStorage({ [SPLIT_LAYOUT_STORAGE_KEY]: '{broken' }))).toBeNull();
  });

  it('no-ops safely when storage is unavailable', () => {
    expect(() => saveLayout(null, createLayout())).not.toThrow();
    expect(loadLayout(undefined)).toBeNull();
    const hostile: Pick<Storage, 'getItem'> = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadLayout(hostile)).toBeNull();
  });
});

describe('layout typing', () => {
  it('exposes a stable storage key', () => {
    expect(SPLIT_LAYOUT_STORAGE_KEY).toBe('termora.split-layout.v1');
  });

  it('keeps a versioned root', () => {
    const layout: SplitLayout = createLayout();
    expect(layout.version).toBe(1);
  });
});
