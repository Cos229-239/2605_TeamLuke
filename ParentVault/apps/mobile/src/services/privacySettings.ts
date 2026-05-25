/**
 * PARENTVAULT-COMMENTARY
 *
 * Models privacy settings and feature gates for optional data categories and AI/import behavior.
 *
 * These settings help enforce schedule-only mode, consent-first imports, and skippable sensitive categories.
 *
 * When adding new sensitive features, add a privacy setting before adding the data collection.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ParentVaultFeature, PrivacyFeatureSettings } from '@parentvault/shared';

const KEY = 'parentvault.privacy.feature-settings';
const now = () => new Date().toISOString();

export const defaultEnabledFeatures: ParentVaultFeature[] = [
  'schedule_reminders',
  'child_profile',
  'medical',
  'providers',
  'insurance',
  'school',
  'custody_legal',
  'journal',
  'media_attachments',
  'ai_imports',
  'web_enrichment'
];

export function defaultPrivacyFeatureSettings(): PrivacyFeatureSettings {
  return {
    accountId: 'local-demo-account',
    enabledFeatures: defaultEnabledFeatures,
    declinedFeatures: [],
    allowOptionalProfilePrompts: true,
    allowWebEnrichment: true,
    allowAiImports: true,
    minimalMode: false,
    updatedAt: now()
  };
}

export function scheduleOnlyPrivacySettings(): PrivacyFeatureSettings {
  return {
    accountId: 'local-demo-account',
    enabledFeatures: ['schedule_reminders'],
    declinedFeatures: defaultEnabledFeatures.filter(feature => feature !== 'schedule_reminders'),
    allowOptionalProfilePrompts: false,
    allowWebEnrichment: false,
    allowAiImports: false,
    minimalMode: true,
    updatedAt: now()
  };
}

export async function loadPrivacyFeatureSettings(): Promise<PrivacyFeatureSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as PrivacyFeatureSettings : defaultPrivacyFeatureSettings();
}

export async function savePrivacyFeatureSettings(settings: PrivacyFeatureSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...settings, updatedAt: now() }));
}

export function isFeatureEnabled(settings: PrivacyFeatureSettings, feature: ParentVaultFeature) {
  return settings.enabledFeatures.includes(feature) && !settings.declinedFeatures.includes(feature);
}

export function setFeatureEnabled(settings: PrivacyFeatureSettings, feature: ParentVaultFeature, enabled: boolean): PrivacyFeatureSettings {
  const enabledFeatures = enabled ? Array.from(new Set([...settings.enabledFeatures, feature])) : settings.enabledFeatures.filter(candidate => candidate !== feature);
  const declinedFeatures = enabled ? settings.declinedFeatures.filter(candidate => candidate !== feature) : Array.from(new Set([...settings.declinedFeatures, feature]));
  return {
    ...settings,
    enabledFeatures,
    declinedFeatures,
    minimalMode: enabledFeatures.length === 1 && enabledFeatures[0] === 'schedule_reminders',
    allowAiImports: enabledFeatures.includes('ai_imports'),
    allowWebEnrichment: enabledFeatures.includes('web_enrichment'),
    updatedAt: now()
  };
}
