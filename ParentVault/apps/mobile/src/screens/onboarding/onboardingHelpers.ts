/**
 * Onboarding helpers
 *
 * These functions support OnboardingScreen.tsx but do not render UI.
 * Keeping parsing/default-draft helpers here makes the actual screen easier to read.
 */

import type { ChildProfile, ImportSourceType } from '@parentvault/shared';
import type { SetupDraft } from './onboardingTypes';

/** Split comma/newline text into clean list values for allergies, meds, conditions, etc. */
export const splitList = (value: string) => value.split(/\n|,/).map(item => item.trim()).filter(Boolean);

/** Generate a small draft ID for draft child/profile records. */
export const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Guess the import source type from a selected file name or MIME type. */
export const inferSourceType = (name = '', mimeType = ''): ImportSourceType => {
  const value = `${name} ${mimeType}`.toLowerCase();
  if (value.includes('calendar') || value.endsWith('.ics')) return 'calendar';
  if (value.includes('custody') || value.includes('decree') || value.includes('order')) return 'decree';
  if (value.includes('flyer')) return 'flyer';
  if (value.includes('screenshot')) return 'screenshot';
  if (value.includes('image')) return 'image';
  if (value.includes('text') || value.endsWith('.txt')) return 'text';
  return 'pdf';
};

/** Read plain text-like uploads locally. PDFs/images return blank until OCR is added. */
export const readAssetText = async (uri?: string) => {
  if (!uri) return '';
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.type && !blob.type.includes('text') && !blob.type.includes('calendar') && !blob.type.includes('json')) return '';
    return await blob.text();
  } catch {
    return '';
  }
};

/** Convert an existing child profile into the editable onboarding draft form. */
export const draftFromChild = (child?: ChildProfile): SetupDraft => ({
  childName: child?.displayName ?? '',
  legalName: child?.legalName ?? '',
  preferredName: child?.preferredName ?? '',
  birthdate: child?.birthdate ?? '',
  customInfoTitle: '',
  customInfoValue: '',
  allergies: child?.medical.allergies.join(', ') ?? '',
  conditions: child?.medical.conditions.join(', ') ?? '',
  medications: child?.medical.medications.map(med => [med.name, med.dosage, med.scheduleText].filter(Boolean).join(' — ')).join('\n') ?? '',
  careInstructions: child?.medical.careInstructions ?? '',
  schoolName: child?.school?.schoolName ?? '',
  grade: child?.school?.grade ?? '',
  teacherName: child?.school?.teacherName ?? '',
  schoolPhone: child?.school?.mainPhone ?? '',
  schoolWebsite: child?.school?.websiteUrl ?? '',
  pickupInstructions: child?.school?.pickupInstructions ?? '',
  providerName: child?.careProviders[0]?.personName ?? '',
  providerPhone: child?.careProviders[0]?.phone ?? '',
  pharmacyName: child?.careProviders.find(provider => provider.type === 'pharmacy')?.organizationName ?? '',
  insuranceProvider: child?.insurance[0]?.providerName ?? '',
  emergencyContactName: child?.contacts[0]?.name ?? '',
  emergencyContactPhone: child?.contacts[0]?.phone ?? '',
  custodySummary: child?.legalCustody?.custodySummary ?? '',
  exchangeRules: child?.legalCustody?.exchangeRules ?? '',
  journalNote: ''
});
