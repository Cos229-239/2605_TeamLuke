/**
 * PARENTVAULT-COMMENTARY
 *
 * Defines the backend authentication and step-up verification scaffold.
 *
 * This is not production auth yet; it documents the intended boundary for 2FA, recovery, and sensitive-operation checks.
 *
 * Keep real auth provider secrets outside the repo and never log credentials, factors, recovery codes, or child data.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AuthSecuritySettings, SecondFactorMethod, TwoFactorChallenge } from '@parentvault/shared';

const challenges = new Map<string, { challenge: TwoFactorChallenge; codeHash: string }>();

export function defaultAuthSecuritySettings(accountId: string): AuthSecuritySettings {
  return {
    accountId,
    twoFactorRequired: true,
    enabledSecondFactors: ['totp', 'recovery_code'],
    preferredSecondFactor: 'totp',
    localUnlockRequired: true,
    localUnlockMethods: ['biometric', 'device_passcode'],
    trustedDeviceIds: [],
    recoveryCodesRemaining: 10,
    lastSecurityReviewAt: new Date().toISOString()
  };
}

export function createTwoFactorChallenge(method: SecondFactorMethod): { challenge: TwoFactorChallenge; demoCode: string } {
  const demoCode = String(Math.floor(100000 + Math.random() * 900000));
  const challenge: TwoFactorChallenge = {
    id: randomUUID(),
    method,
    deliveryHint: method === 'totp' ? 'Use authenticator app code.' : method === 'sms' ? 'Code sent to verified phone.' : undefined,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
  challenges.set(challenge.id, { challenge, codeHash: hashDemoCode(demoCode) });
  return { challenge, demoCode };
}

export function verifyTwoFactorChallenge(challengeId: string, code: string): TwoFactorChallenge | undefined {
  const stored = challenges.get(challengeId);
  if (!stored) return undefined;
  if (new Date(stored.challenge.expiresAt).getTime() < Date.now()) {
    challenges.delete(challengeId);
    return undefined;
  }

  const expected = Buffer.from(stored.codeHash);
  const actual = Buffer.from(hashDemoCode(code));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
  const verified = { ...stored.challenge, verifiedAt: new Date().toISOString() };
  challenges.delete(challengeId);
  return verified;
}

function hashDemoCode(code: string) {
  // Demo-only stand-in. Production should use TOTP/passkey verification and store only salted hashes for recovery codes.
  return Buffer.concat([Buffer.from('parentvault-demo:'), Buffer.from(code), randomBytes(0)]).toString('base64');
}
