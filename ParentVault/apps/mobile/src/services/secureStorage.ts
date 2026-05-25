/**
 * PARENTVAULT-COMMENTARY
 *
 * Placeholder boundary for secure device storage and encrypted local cache behavior.
 *
 * The file documents where sensitive persistence should eventually route instead of plain AsyncStorage/in-memory demo state.
 *
 * Do not store real child data here until encryption, unlock, wipe-on-logout, and redaction requirements are implemented.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SENSITIVE_FIELD_POLICY } from '@parentvault/shared';

/**
 * Demo boundary only. AsyncStorage is not acceptable for real sensitive vault data.
 * Production should use encrypted storage backed by Keychain/Keystore and envelope encryption.
 */
const DEMO_PREFIX = 'parentvault.demo.non_sensitive.';

export async function saveNonSensitiveDemoValue(key: string, value: unknown) {
  await AsyncStorage.setItem(`${DEMO_PREFIX}${key}`, JSON.stringify(value));
}

export async function loadNonSensitiveDemoValue<T>(key: string): Promise<T | undefined> {
  const raw = await AsyncStorage.getItem(`${DEMO_PREFIX}${key}`);
  return raw ? JSON.parse(raw) as T : undefined;
}

export async function saveSensitiveVaultValue(): Promise<never> {
  throw new Error('Refusing to persist sensitive ParentVault data without production encryption. See docs/ENCRYPTION.md.');
}

export function encryptionPolicySummary() {
  return SENSITIVE_FIELD_POLICY;
}
