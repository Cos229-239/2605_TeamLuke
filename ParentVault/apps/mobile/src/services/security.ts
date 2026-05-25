/**
 * PARENTVAULT-COMMENTARY
 *
 * Security helper models for 2FA, vault unlock, step-up checks, and risk posture.
 *
 * These helpers are scaffolding: they make security requirements visible before production auth exists.
 *
 * Treat every sensitive action as needing authorization, audit metadata, and safe error handling.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSecuritySettings, SecondFactorMethod, TwoFactorChallenge } from '@parentvault/shared';

const SETTINGS_KEY = 'parentvault.security.settings';
const now = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 10);

export const defaultSecuritySettings = (): AuthSecuritySettings => ({
  accountId: 'local-demo-account',
  twoFactorRequired: true,
  enabledSecondFactors: ['totp', 'recovery_code'],
  preferredSecondFactor: 'totp',
  localUnlockRequired: true,
  localUnlockMethods: ['biometric', 'device_passcode'],
  trustedDeviceIds: [],
  recoveryCodesRemaining: 10,
  lastSecurityReviewAt: now()
});

export async function loadSecuritySettings(): Promise<AuthSecuritySettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSecuritySettings();
  return JSON.parse(raw) as AuthSecuritySettings;
}

export async function saveSecuritySettings(settings: AuthSecuritySettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, lastSecurityReviewAt: now() }));
}

export async function setSecondFactorEnabled(method: SecondFactorMethod, enabled: boolean) {
  const settings = await loadSecuritySettings();
  const enabledSecondFactors = enabled
    ? Array.from(new Set([...settings.enabledSecondFactors, method]))
    : settings.enabledSecondFactors.filter(candidate => candidate !== method);

  const updated: AuthSecuritySettings = {
    ...settings,
    enabledSecondFactors,
    twoFactorRequired: enabledSecondFactors.length > 0,
    preferredSecondFactor: enabledSecondFactors.includes(settings.preferredSecondFactor ?? 'totp')
      ? settings.preferredSecondFactor
      : enabledSecondFactors[0]
  };
  await saveSecuritySettings(updated);
  return updated;
}

export function createDemoTwoFactorChallenge(method: SecondFactorMethod): TwoFactorChallenge {
  return {
    id: id(),
    method,
    deliveryHint: method === 'totp' ? 'Use your authenticator app code.' : method === 'sms' ? 'Code sent to verified phone.' : undefined,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
}

export function describeSecondFactor(method: SecondFactorMethod) {
  switch (method) {
    case 'totp': return 'Authenticator app code';
    case 'sms': return 'SMS code — convenient, weaker than authenticator/passkey';
    case 'email': return 'Email code — fallback only';
    case 'passkey': return 'Passkey / security key';
    case 'recovery_code': return 'Recovery code';
  }
}
