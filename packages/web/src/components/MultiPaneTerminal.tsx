import type { Session } from '../lib/types';
import type { SplitLayout } from '../lib/split-layout';
import type { TerminalWSClient } from '../lib/ws-client';
import type { MessageBus } from '../lib/message-bus';
import { buildPaneViews, paneGridStyle, type PaneTone, type PaneView } from '../lib/pane-view-model';
import { TerminalPane } from './TerminalPane';

const S = {
  primary: '#7170ff',
  border: 'rgba(255,255,255,0.08)',
  text1: '#f7f8f8',
  text2: '#d0d6e0',
  text3: '#8a8f98',
  surface: '#0c0c0f',
  surface2: 'rgba(255,255,255,0.03)',
} as const;

const TONE_COLOR: Record<PaneTone, string> = {
  green: '#10b981',
  orange: '#7170ff',
  red: '#ef4444',
  muted: '#8a8f98',
};

interface MultiPaneTerminalProps {
  layout: SplitLayout;
  sessions: Session[];
  activeSessionId: string | null;
  wsClient: TerminalWSClient | null;
  messageBus: MessageBus;
  getSessionOutput: (sessionId: string) => string[];
  onSessionSelect: (sessionId: string) => void;
  onAssignActiveSession: (paneId: string) => void;
  onClearPane: (paneId: string) => void;
}

function PaneHeader({
  view,
  onFocus,
  onClear,
}: {
  view: PaneView;
  onFocus: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 26,
        padding: '0 8px',
        borderBottom: `1px solid ${S.border}`,
        background: view.isActive ? `${S.primary}14` : S.surface,
      }}
    >
      <button
        type="button"
        onClick={onFocus}
        title={view.session ? `${view.title} — ${view.subtitle}` : 'Empty pane'}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: TONE_COLOR[view.tone],
            flex: '0 0 auto',
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: view.isActive ? 700 : 500,
            color: view.session ? S.text1 : S.text3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {view.title}
        </span>
        <span
          style={{
            fontSize: 9,
            color: S.text3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {view.subtitle}
        </span>
      </button>
      {!view.isEmpty && (
        <button
          type="button"
          aria-label="Clear pane"
          onClick={onClear}
          style={{
            border: 'none',
            background: 'transparent',
            color: S.text3,
            fontSize: 12,
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
}

/**
 * Visible multi-pane terminal renderer for the split-layout contract.
 *
 * Each assigned pane hosts a real xterm.js instance through the existing
 * `TerminalPane`; all panes share the single WebSocket client from
 * `useSessionManager` and receive output through the `MessageBus`, which routes
 * by session id. Empty panes focus/assign the active session instead of
 * spawning a fake PTY.
 */
export function MultiPaneTerminal({
  layout,
  sessions,
  activeSessionId,
  wsClient,
  messageBus,
  getSessionOutput,
  onSessionSelect,
  onAssignActiveSession,
  onClearPane,
}: MultiPaneTerminalProps) {
  const views = buildPaneViews(layout, sessions, activeSessionId);
  const grid = paneGridStyle(layout.mode);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'grid',
        gap: 4,
        padding: 4,
        background: '#000',
        ...grid,
      }}
      data-split-mode={layout.mode}
    >
      {views.map((view) => (
        <div
          key={view.paneId}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            border: `1px solid ${view.isActive ? S.primary : S.border}`,
            background: S.surface,
          }}
        >
          <PaneHeader
            view={view}
            onFocus={() => {
              if (view.session) onSessionSelect(view.session.id);
              else onAssignActiveSession(view.paneId);
            }}
            onClear={() => onClearPane(view.paneId)}
          />
          <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            {view.session ? (
              <TerminalPane
                sessionId={view.session.id}
                wsClient={wsClient}
                messageBus={messageBus}
                getSessionOutput={getSessionOutput}
              />
            ) : (
              <button
                type="button"
                onClick={() => onAssignActiveSession(view.paneId)}
                disabled={!activeSessionId}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  border: 'none',
                  background: S.surface2,
                  color: S.text3,
                  fontFamily: 'inherit',
                  fontSize: 10,
                  cursor: activeSessionId ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 16, color: S.text2 }}>+</span>
                {activeSessionId ? 'Assign active session' : 'No active session'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
