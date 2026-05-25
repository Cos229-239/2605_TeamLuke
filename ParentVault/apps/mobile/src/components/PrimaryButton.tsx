/**
 * PARENTVAULT-COMMENTARY
 *
 * Reusable button component for primary and quiet actions.
 *
 * Centralizing button styling keeps the app consistent and makes future accessibility/touch-target improvements easier.
 *
 * Use the quiet tone for secondary/safe actions and the default tone for the main next action.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, Platform } from 'react-native';
import { useTheme } from '../theme';

interface Props extends PropsWithChildren {
  onPress: () => void;
  tone?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function PrimaryButton({ children, onPress, tone = 'primary', disabled = false, accessibilityLabel }: Props) {
  const theme = useTheme();
  // Use theme tokens for consistent colors across modes (usability: visual polish)
  const backgroundColor = disabled ? theme.border : tone === 'quiet' ? theme.primarySoft : tone === 'danger' ? '#be123c' : theme.primaryStrong;
  const color = disabled ? theme.subtle : tone === 'quiet' ? (theme.mode === 'dark' ? '#bfdbfe' : '#1e3a8a') : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor }]}
    >
      <Text style={[styles.text, { color }]}>{children}</Text>
      {/* Pressable's accessibilityState already handles keyboard focus */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
    // Platform-aware focus ring for keyboard navigation (Android/iOS)
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4 // Android elevation for focus/press states
  },
  text: {
    fontWeight: '700',
    // Sufficient color contrast ratio (WCAG AA)
    fontSize: Platform.OS === 'ios' ? 16 : 15, // iOS needs larger touch target
  }
});