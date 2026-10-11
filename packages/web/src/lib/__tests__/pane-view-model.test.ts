import { describe, it, expect } from 'vitest';
import { assignPane, createLayout } from '../split-layout.js';
import { buildPaneViews, livePaneSessionIds, paneGridStyle } from '../pane-view-model.js';
import type { Session, ShellType } from '../types.js';

function session(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    name: id,
    cwd: `/home/rud/${id}`,
    status: 'run',
    shell: 'zsh' as ShellType,
    pid: 4242,
    preview: '',
    ...overrides,
  };
}

describe('paneGridStyle', () => {
  it('returns a single cell for single mode', () => {
    expect(paneGridStyle('single')).toEqual({
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateRows: 'minmax(0, 1fr)',
    });
  });

  it('splits columns horizontally and rows vertically', () => {
    expect(paneGridStyle('columns').gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(paneGridStyle('columns').gridTemplateRows).toBe('minmax(0, 1fr)');
    expect(paneGridStyle('rows').gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(paneGridStyle('rows').gridTemplateRows).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('makes a 2x2 grid for quad', () => {
    const style = paneGridStyle('quad');
    expect(style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(style.gridTemplateRows).toBe('repeat(2, minmax(0, 1fr))');
  });
});

describe('buildPaneViews', () => {
  it('renders an empty slot when no session is assigned', () => {
    const [view] = buildPaneViews(createLayout('single'), [], null);
    expect(view.sessionId).toBeNull();
    expect(view.session).toBeNull();
    expect(view.isEmpty).toBe(true);
    expect(view.isActive).toBe(false);
    expect(view.title).toBe('Empty pane');
    expect(view.tone).toBe('muted');
  });

  it('hints at assignment only when an active session exists', () => {
    const empty = buildPaneViews(createLayout('single'), [], null)[0];
    const assignable = buildPaneViews(createLayout('single'), [], 'sess-a')[0];
    expect(empty.subtitle).toBe('no active session');
    expect(assignable.subtitle).toBe('assign active session');
  });

  it('maps assigned sessions to real metadata and focuses the active one', () => {
    const sessions = [session('sess-a', { name: 'termora', cwd: '/home/rud/termora', shell: 'tmux' }), session('sess-b')];
    let layout = createLayout('columns');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-2', 'sess-b');

    const views = buildPaneViews(layout, sessions, 'sess-b');

    expect(views).toHaveLength(2);
    expect(views[0].title).toBe('termora');
    expect(views[0].subtitle).toBe('tmux · /home/rud/termora');
    expect(views[0].session).toBe(sessions[0]);
    expect(views[0].isActive).toBe(false);
    expect(views[0].isEmpty).toBe(false);
    expect(views[0].tone).toBe('green');
    expect(views[1].isActive).toBe(true);
  });

  it('marks idle sessions with a muted tone', () => {
    const sessions = [session('sess-a', { status: 'idle' })];
    const layout = assignPane(createLayout('single'), 'pane-1', 'sess-a');
    const [view] = buildPaneViews(layout, sessions, null);
    expect(view.tone).toBe('muted');
    expect(view.isActive).toBe(false);
  });

  it('reports stale assignments as empty while preserving the pane id', () => {
    const layout = assignPane(createLayout('single'), 'pane-1', 'ghost');
    const [view] = buildPaneViews(layout, [], 'ghost');
    expect(view.paneId).toBe('pane-1');
    expect(view.sessionId).toBe('ghost');
    expect(view.session).toBeNull();
    expect(view.isEmpty).toBe(true);
  });

  it('falls back to ~ when cwd is blank', () => {
    const sessions = [session('sess-a', { cwd: '   ' })];
    const layout = assignPane(createLayout('single'), 'pane-1', 'sess-a');
    expect(buildPaneViews(layout, sessions, null)[0].subtitle).toBe('zsh · ~');
  });
});

describe('livePaneSessionIds', () => {
  it('lists assigned session ids in pane order and skips empties', () => {
    const sessions = [session('sess-a'), session('sess-b'), session('sess-c')];
    let layout = createLayout('quad');
    layout = assignPane(layout, 'pane-2', 'sess-b');
    layout = assignPane(layout, 'pane-4', 'sess-c');
    const views = buildPaneViews(layout, sessions, null);
    expect(livePaneSessionIds(views)).toEqual(['sess-b', 'sess-c']);
  });

  it('never returns a session twice', () => {
    const sessions = [session('sess-a')];
    let layout = createLayout('columns');
    layout = assignPane(layout, 'pane-1', 'sess-a');
    layout = assignPane(layout, 'pane-2', 'sess-a');
    const views = buildPaneViews(layout, sessions, null);
    expect(livePaneSessionIds(views)).toEqual(['sess-a']);
  });
});
