/**
 * PARENTVAULT-COMMENTARY
 *
 * Defines encrypted-value and sensitive-plaintext boundary types.
 *
 * These types make security expectations visible in code even before full cryptography is implemented.
 *
 * Never weaken these boundaries to make development easier; production data must be encrypted before persistence.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { EncryptedValue, EncryptionScope, SensitivePlaintext } from './index';

export const SENSITIVE_FIELD_POLICY = {
  plaintextPersistenceAllowed: false,
  plaintextRuntimeOnly: true,
  requireEncryptionAtRest: true,
  requireEncryptionInTransit: true,
  requireRedactionInLogs: true
} as const;

export function markPlaintextRuntimeOnly<T>(value: T): SensitivePlaintext<T> {
  return { value, warning: 'plaintext_runtime_only_never_persist' };
}

export function assertEncryptedValue(value: unknown, fieldName: string): asserts value is EncryptedValue {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName} must be encrypted before persistence`);
  }

  const candidate = value as Partial<EncryptedValue>;
  if (!candidate.ciphertext || !candidate.algorithm || !candidate.keyId || !candidate.nonce || !candidate.scope) {
    throw new Error(`${fieldName} is missing encrypted value metadata`);
  }
}

export function createEncryptionPlaceholder(scope: EncryptionScope, label = 'encrypted-before-save'): EncryptedValue {
  return {
    ciphertext: label,
    algorithm: 'xchacha20-poly1305',
    keyId: 'demo-key-id-replace-with-kms-or-device-key',
    nonce: 'demo-nonce-replace-with-random-nonce',
    scope,
    createdAt: new Date().toISOString()
  };
}

export function redactSensitiveForDisplay(value?: EncryptedValue | string) {
  if (!value) return 'Not stored';
  if (typeof value === 'string') return '[legacy encrypted value hidden]';
  return `[encrypted:${value.scope}]`;
}
