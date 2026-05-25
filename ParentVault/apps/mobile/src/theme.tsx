/**
 * PARENTVAULT-COMMENTARY
 *
 * Shared theme provider and color tokens for dark/light mode.
 *
 * Centralizing tokens prevents scattered hard-coded colors and keeps accessibility improvements manageable.
 *
 * Use useTheme() in components so future theme/security styling changes apply consistently.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { createContext, PropsWithChildren, useContext } from 'react';

export type ThemeMode = 'dark' | 'light';

export const palette = {
  dark: {
    mode: 'dark' as const,
    app: '#020617',
    surface: '#0f172a',
    elevated: '#111827',
    card: '#111827',
    border: '#1e293b',
    text: '#f8fafc',
    muted: '#cbd5e1',
    subtle: '#94a3b8',
    warning: '#fdba74',
    primary: '#60a5fa',
    primaryStrong: '#2563eb',
    primarySoft: '#1e3a8a',
    input: '#020617',
    inputBorder: '#334155',
    shadow: '#000000'
  },
  light: {
    mode: 'light' as const,
    app: '#f8fafc',
    surface: '#ffffff',
    elevated: '#ffffff',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#475569',
    subtle: '#64748b',
    warning: '#9a3412',
    primary: '#1d4ed8',
    primaryStrong: '#1d4ed8',
    primarySoft: '#dbeafe',
    input: '#ffffff',
    inputBorder: '#cbd5e1',
    shadow: '#0f172a'
  }
};

export type Theme = (typeof palette)[ThemeMode];

const ThemeContext = createContext<Theme>(palette.dark);

export function ThemeProvider({ mode, children }: PropsWithChildren<{ mode: ThemeMode }>) {
  return <ThemeContext.Provider value={palette[mode]}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
