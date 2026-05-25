/**
 * Onboarding types
 *
 * These types describe the Nanny Bot setup wizard data.
 * Keeping them out of OnboardingScreen.tsx makes the screen easier to scan and edit.
 */

export type SetupStepKey = 'basics' | 'school' | 'medical' | 'care' | 'custody' | 'journal' | 'review';

export type SetupDraft = {
  childName: string;
  legalName: string;
  preferredName: string;
  birthdate: string;
  customInfoTitle: string;
  customInfoValue: string;
  allergies: string;
  conditions: string;
  medications: string;
  careInstructions: string;
  schoolName: string;
  grade: string;
  teacherName: string;
  schoolPhone: string;
  schoolWebsite: string;
  pickupInstructions: string;
  providerName: string;
  providerPhone: string;
  pharmacyName: string;
  insuranceProvider: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  custodySummary: string;
  exchangeRules: string;
  journalNote: string;
};

export type SetupStep = {
  key: SetupStepKey;
  label: string;
  title: string;
  message: string;
  uploadHint: string;
};
