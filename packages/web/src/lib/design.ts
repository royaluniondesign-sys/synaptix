// Single source of truth for all UI design tokens.
// Import T (tokens) in every component — never declare a local const S.

export const T = {
  // Backgrounds
  bg:       '#08090a',
  surface:  '#0f1011',
  surface2: '#161718',
  surface3: '#1e1f21',
  surface4: '#252628',

  // Borders
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.04)',

  // Brand
  primary:      '#7170ff',
  primaryAlpha: 'rgba(113,112,255,0.12)',
  primaryBorder: 'rgba(113,112,255,0.25)',
  accent:       '#a78bfa',

  // Semantic
  success:      '#10b981',
  successAlpha: 'rgba(16,185,129,0.12)',
  warning:      '#f59e0b',
  warningAlpha: 'rgba(245,158,11,0.12)',
  error:        '#ef4444',
  errorAlpha:   'rgba(239,68,68,0.12)',
  info:         '#60a5fa',
  infoAlpha:    'rgba(96,165,250,0.12)',

  // Text
  text1: '#f4f4f5',
  text2: '#a1a1aa',
  text3: '#52525b',

  // Typography
  fontSans: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace",

  // Radii
  r1: 4,
  r2: 6,
  r3: 10,

  // Layout
  sidebarWidth: 220,
  navItemHeight: 30,
} as const;
