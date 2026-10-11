import type { Session } from '../lib/types';
import { SPLIT_MODES, type SplitLayout, type SplitMode } from '../lib/split-layout';
import { useSplitLayout } from '../hooks/useSplitLayout';

const S = {
  primary: '#7170ff',
  border: 'rgba(255,255,255,0.08)',
  text2: '#d0d6e0',
  text3: '#8a8f98',
  surface2: 'rgba(255,255,255,0.03)',
} as const;

const MODE_LABEL: Record<SplitMode, string> = {
  single: 'Single',
  columns: 'Split ⇆',
  rows: 'Split ⇅',
  quad: 'Quad',
};

const MODE_COLUMNS: Record<SplitMode, string> = {
  single: '1fr',
  columns: 'repeat(2, 1fr)',
  rows: '1fr',
  quad: 'repeat(2, 1fr)',
};

interface SplitLayoutControlsProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
}

export interface SplitLayoutControlsViewProps {
  layout: SplitLayout;
  setMode: (mode: SplitMode) => void;
  assignActiveSession: (paneId: string) => void;
  clearPane: (paneId: string) => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
}

/**
 * Controlled split-layout controls.
 *
 * It edits the persisted layout contract and shows which real session occupies
 * each pane; selecting a filled pane focuses that session and an empty pane
 * receives the active one. This is intentionally not a PTY multiplexer yet —
 * it is the UI/state half that a real split engine can render behind.
 */
export function SplitLayoutControlsView({
  layout,
  setMode,
  assignActiveSession,
  clearPane,
  sessions,
  activeSessionId,
  onSessionSelect,
}: SplitLayoutControlsViewProps) {
  const nameFor = (sessionId: string | null): string | null =>
    sessionId === null ? null : (sessions.find((session) => session.id === sessionId)?.name ?? null);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '6px 10px',
        borderBottom: `1px solid ${S.border}`,
        background: S.surface2,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: S.text3,
        }}
      >
        Split layout
      </span>

      <div style={{ display: 'flex', gap: 2 }}>
        {SPLIT_MODES.map((mode) => {
          const active = mode === layout.mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              style={{
                height: 22,
                padding: '0 8px',
                borderRadius: 6,
                border: `1px solid ${active ? S.primary : S.border}`,
                background: active ? `${S.primary}22` : 'transparent',
                color: active ? S.primary : S.text3,
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {MODE_LABEL[mode]}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: MODE_COLUMNS[layout.mode],
          gap: 4,
          flex: 1,
          minWidth: 180,
        }}
      >
        {layout.panes.map((pane) => {
          const name = nameFor(pane.sessionId);
          const isActive = pane.sessionId !== null && pane.sessionId === activeSessionId;
          return (
            <div
              key={pane.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 26,
                padding: '0 8px',
                borderRadius: 6,
                border: `1px solid ${isActive ? S.primary : S.border}`,
                background: name ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (pane.sessionId) onSessionSelect(pane.sessionId);
                  else assignActiveSession(pane.id);
                }}
                title={
                  pane.sessionId
                    ? name ?? pane.sessionId
                    : activeSessionId
                      ? 'Assign active session to this pane'
                      : 'No active session to assign'
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  color: name ? S.text2 : S.text3,
                  fontSize: 10,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name ?? 'empty'}
              </button>
              {pane.sessionId && (
                <button
                  type="button"
                  aria-label="Clear pane"
                  onClick={() => clearPane(pane.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: S.text3,
                    fontSize: 11,
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Self-contained controls that own their own persisted layout state. Prefer
 * `SplitLayoutControlsView` when a parent already owns the layout (e.g. so it
 * can also drive `MultiPaneTerminal`) to keep both surfaces in sync.
 */
export function SplitLayoutControls({
  sessions,
  activeSessionId,
  onSessionSelect,
}: SplitLayoutControlsProps) {
  const { layout, setMode, assignActiveSession, clearPane } = useSplitLayout(
    sessions,
    activeSessionId,
  );

  return (
    <SplitLayoutControlsView
      layout={layout}
      setMode={setMode}
      assignActiveSession={assignActiveSession}
      clearPane={clearPane}
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSessionSelect={onSessionSelect}
    />
  );
}
