import type { ITheme } from '@xterm/xterm';

const BASE: Omit<ITheme, 'background' | 'cursor' | 'cursorAccent' | 'selectionBackground'> = {
  foreground: '#e4e4e7',
  selectionForeground: '#fafafa',
  black: '#27272a', red: '#ef4444', green: '#10b981', yellow: '#7170ff',
  blue: '#7170ff', magenta: '#a78bfa', cyan: '#8a8f98', white: '#e4e4e7',
  brightBlack: '#3f3f46', brightRed: '#ef4444', brightGreen: '#6ee7b7',
  brightYellow: '#fde68a', brightBlue: '#93c5fd', brightMagenta: '#c4b5fd',
  brightCyan: '#67e8f9', brightWhite: '#fafafa',
};

export const TERMINAL_THEMES: Record<string, ITheme> = {
  obsidian: { ...BASE, background: '#09090b', cursor: '#a78bfa', cursorAccent: '#09090b', selectionBackground: '#a78bfa33' },
  midnight: { ...BASE, background: '#030712', cursor: '#60a5fa', cursorAccent: '#030712', selectionBackground: '#60a5fa33' },
  forest:   { ...BASE, background: '#0a0f0a', cursor: '#34d399', cursorAccent: '#0a0f0a', selectionBackground: '#34d39933' },
  amber:    { ...BASE, background: '#0c0a00', cursor: '#fbbf24', cursorAccent: '#0c0a00', selectionBackground: '#fbbf2433' },
};

export function getTerminalTheme(): ITheme {
  try {
    const key = localStorage.getItem('synaptix_theme') ?? 'obsidian';
    return TERMINAL_THEMES[key] ?? TERMINAL_THEMES.obsidian;
  } catch {
    return TERMINAL_THEMES.obsidian;
  }
}

export const SYNAPTIX_THEME: ITheme = TERMINAL_THEMES.obsidian;
