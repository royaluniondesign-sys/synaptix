import { describe, it, expect } from 'vitest';
import { badgeLabel, resolveAppSurface, type AppSurfaceInput } from '../app-model.js';
import type { View } from '../types.js';

function input(overrides: Partial<AppSurfaceInput> = {}): AppSurfaceInput {
  return {
    isAuthenticated: false,
    view: 'dashboard',
    hasActiveSession: false,
    isDesktop: true,
    sessionCount: 0,
    unreadCount: 0,
    connectionStatus: 'disconnected',
    ...overrides,
  };
}

describe('badgeLabel', () => {
  it('hides the badge at zero', () => {
    expect(badgeLabel(0)).toBeNull();
  });

  it('shows the raw count up to 9', () => {
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
  });

  it('caps at "9+" once it overflows', () => {
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(50)).toBe('9+');
  });
});

describe('resolveAppSurface — no-token auth behavior', () => {
  it('renders the auth surface when unauthenticated, regardless of view/nav', () => {
    expect(resolveAppSurface(input())).toEqual({ kind: 'auth' });
    expect(resolveAppSurface(input({ view: 'terminal', hasActiveSession: true }))).toEqual({ kind: 'auth' });
    expect(resolveAppSurface(input({ sessionCount: 3, unreadCount: 2 }))).toEqual({ kind: 'auth' });
  });

  it('does not leak nav state or badge values before auth', () => {
    const surface = resolveAppSurface(input({ unreadCount: 4 }));
    expect('nav' in surface).toBe(false);
  });
});

describe('resolveAppSurface — authenticated render basics', () => {
  it('opens the full-screen terminal when a live session is active', () => {
    expect(resolveAppSurface(input({ isAuthenticated: true, view: 'terminal', hasActiveSession: true }))).toEqual({ kind: 'terminal' });
  });

  it('falls back to the shell terminal view when no session is active', () => {
    const surface = resolveAppSurface(input({
      isAuthenticated: true,
      view: 'terminal',
      hasActiveSession: false,
      isDesktop: false,
      connectionStatus: 'connected',
      sessionCount: 2,
    }));
    expect(surface.kind).toBe('shell');
    if (surface.kind === 'shell') {
      expect(surface.nav.showSidebar).toBe(false);
      expect(surface.nav.showTabBar).toBe(true);
      expect(surface.nav.showFab).toBe(true);
      expect(surface.nav.sessionBadge).toBe('2');
    }
  });

  it('shows the desktop sidebar for non-dashboard shell views', () => {
    const surface = resolveAppSurface(input({ isAuthenticated: true, view: 'notifications', isDesktop: true }));
    expect(surface.kind).toBe('shell');
    if (surface.kind === 'shell') expect(surface.nav.showSidebar).toBe(true);
  });

  it('hides the desktop sidebar on the dashboard', () => {
    const surface = resolveAppSurface(input({ isAuthenticated: true, view: 'dashboard', isDesktop: true }));
    expect(surface.kind).toBe('shell');
    if (surface.kind === 'shell') expect(surface.nav.showSidebar).toBe(false);
  });

  it('swaps the sidebar for the bottom tab bar on mobile', () => {
    const surface = resolveAppSurface(input({ isAuthenticated: true, view: 'settings', isDesktop: false }));
    expect(surface.kind).toBe('shell');
    if (surface.kind === 'shell') {
      expect(surface.nav.showSidebar).toBe(false);
      expect(surface.nav.showTabBar).toBe(true);
    }
  });

  it('only shows the FAB on the connected mobile terminal tab (no active session)', () => {
    // Full-screen terminal (active session) supersedes the FAB entirely.
    const withSession = resolveAppSurface(input({
      isAuthenticated: true,
      view: 'terminal',
      hasActiveSession: true,
      connectionStatus: 'disconnected',
      isDesktop: false,
    }));
    expect(withSession.kind).toBe('terminal');

    // Empty terminal tab on mobile: FAB only when connected.
    const base = { isAuthenticated: true, view: 'terminal' as View, hasActiveSession: false };
    const disconnected = resolveAppSurface(input({ ...base, connectionStatus: 'disconnected', isDesktop: false }));
    expect(disconnected.kind).toBe('shell');
    if (disconnected.kind === 'shell') expect(disconnected.nav.showFab).toBe(false);
    const connected = resolveAppSurface(input({ ...base, connectionStatus: 'connected', isDesktop: false }));
    if (connected.kind === 'shell') expect(connected.nav.showFab).toBe(true);

    // Desktop never floats the FAB in the sidebar layout.
    const desktop = resolveAppSurface(input({ ...base, connectionStatus: 'connected', isDesktop: true }));
    if (desktop.kind === 'shell') expect(desktop.nav.showFab).toBe(false);
  });

  it('badges session and unread counts on both nav surfaces', () => {
    const mobile = resolveAppSurface(input({
      isAuthenticated: true,
      view: 'notifications',
      isDesktop: false,
      sessionCount: 12,
      unreadCount: 3,
    }));
    expect(mobile.kind).toBe('shell');
    if (mobile.kind === 'shell') {
      expect(mobile.nav.sessionBadge).toBe('9+');
      expect(mobile.nav.unreadBadge).toBe('3');
    }
  });

  it('clears the unread badge once everything is read', () => {
    const surface = resolveAppSurface(input({
      isAuthenticated: true,
      view: 'dashboard',
      sessionCount: 1,
      unreadCount: 0,
    }));
    expect(surface.kind).toBe('shell');
    if (surface.kind === 'shell') expect(surface.nav.unreadBadge).toBeNull();
  });
});