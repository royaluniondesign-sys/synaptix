import type { View } from './types';
import type { ConnectionStatus } from './ws-client';

/**
 * Pure, browser-free model of the App's top-level render decision. The UI is
 * driven off this so the no-token/auth/terminal/split surface — the parts a
 * headless dogfood pass cares about — is unit-testable without a DOM.
 *
 * Mirror of the render gates in App.tsx:
 *  - no session token  -> auth surface (AuthScreen)
 *  - authenticated + terminal view with a live session -> full-screen terminal
 *  - everything else -> the navigable shell (dashboard/tunnels/notifications/
 *    settings/reconnect), with desktop sidebar / mobile tab bar / FAB rules and
 *    the terminal + notifications badge values.
 */

/** Badge label shared by the tab bar and desktop sidebar ("9+" cap). */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}

export interface AppSurfaceInput {
  isAuthenticated: boolean;
  view: View;
  /** True when the terminal view has a live session to show full-screen. */
  hasActiveSession: boolean;
  isDesktop: boolean;
  sessionCount: number;
  unreadCount: number;
  connectionStatus: ConnectionStatus;
}

export type AppSurface = { kind: 'auth' } | { kind: 'terminal' } | { kind: 'shell'; nav: ShellNav };

export interface ShellNav {
  view: View;
  /** Desktop sidebar is shown for every shell view except the dashboard. */
  showSidebar: boolean;
  /** Mobile bottom tab bar. */
  showTabBar: boolean;
  /** Mobile "new terminal" FAB while the terminal view is connected. */
  showFab: boolean;
  /** Badge value for the "Terminal" tab (null hides the badge). */
  sessionBadge: string | null;
  /** Badge value for the "Notifications" tab (null hides the badge). */
  unreadBadge: string | null;
}

export function resolveAppSurface(input: AppSurfaceInput): AppSurface {
  if (!input.isAuthenticated) return { kind: 'auth' };
  if (input.view === 'terminal' && input.hasActiveSession) return { kind: 'terminal' };
  return {
    kind: 'shell',
    nav: {
      view: input.view,
      showSidebar: input.isDesktop && input.view !== 'dashboard',
      showTabBar: !input.isDesktop,
      showFab: input.view === 'terminal' && input.connectionStatus === 'connected' && !input.isDesktop,
      sessionBadge: badgeLabel(input.sessionCount),
      unreadBadge: badgeLabel(input.unreadCount),
    },
  };
}