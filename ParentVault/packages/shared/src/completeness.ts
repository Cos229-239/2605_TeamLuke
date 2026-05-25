/**
 * PARENTVAULT-COMMENTARY
 *
 * Computes missing child-vault details and suggests what parents may want to add next.
 *
 * The goal is helpful completeness, not pressure: optional sensitive categories must stay skippable.
 *
 * Keep recommendations practical, privacy-aware, and focused on parent usefulness.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { ChildProfile, ParentVaultFeature, PrivacyFeatureSettings } from './index';

export interface CompletenessPrompt {
  id: string;
  childId: string;
  category: 'identity' | 'medical' | 'doctor' | 'pharmacy' | 'insurance' | 'school' | 'emergency' | 'custody';
  feature: ParentVaultFeature;
  question: string;
  whyItMatters: string;
  suggestedAction: string;
  severity: 'required_for_feature' | 'recommended' | 'nice_to_have';
  skippable: true;
}

const hasText = (value?: string) => Boolean(value?.trim());
const featureAllowed = (feature: ParentVaultFeature, settings?: PrivacyFeatureSettings) => {
  if (!settings) return true;
  if (settings.minimalMode && feature !== 'schedule_reminders') return false;
  return settings.enabledFeatures.includes(feature) && !settings.declinedFeatures.includes(feature);
};

export function findChildVaultGaps(child: ChildProfile, settings?: PrivacyFeatureSettings): CompletenessPrompt[] {
  const prompts: CompletenessPrompt[] = [];
  const add = (prompt: Omit<CompletenessPrompt, 'childId' | 'skippable'>) => {
    if (featureAllowed(prompt.feature, settings)) prompts.push({ ...prompt, childId: child.id, skippable: true });
  };

  if (!hasText(child.birthdate)) {
    add({ id: 'birthdate', category: 'identity', feature: 'child_profile', severity: 'recommended', question: 'What is the child’s birthdate?', whyItMatters: 'Doctors, schools, insurance, and legal forms ask for it constantly, but it is optional unless the parent wants those features.', suggestedAction: 'Ask the parent to add the birthdate, skip it, or extract it from a parent-approved form.' });
  }

  if (!child.medical.allergies.length) {
    add({ id: 'allergies', category: 'medical', feature: 'medical', severity: 'required_for_feature', question: 'Does the child have allergies, including medication or food allergies?', whyItMatters: 'This is critical if the parent wants medical, school, caregiver, or emergency details in the vault.', suggestedAction: 'Ask directly, extract from parent-approved forms, or let the parent skip medical details entirely.' });
  }

  const primaryDoctor = child.careProviders.find(provider => ['pediatrician', 'doctor'].includes(provider.type) && provider.isPrimary);
  if (!primaryDoctor) {
    add({ id: 'primary-doctor', category: 'doctor', feature: 'providers', severity: 'required_for_feature', question: 'Who is the child’s primary doctor or pediatrician?', whyItMatters: 'Useful for appointments, forms, illness, and medication questions, but optional if the parent only wants reminders.', suggestedAction: 'Prompt for doctor name, office name, phone, portal, and address, or let the parent skip providers.' });
  } else {
    if (!hasText(primaryDoctor.phone)) add({ id: 'doctor-phone', category: 'doctor', feature: 'providers', severity: 'required_for_feature', question: `What is ${primaryDoctor.personName}’s phone number?`, whyItMatters: 'Useful for illness, records, and medication questions.', suggestedAction: 'Search official provider website, ask parent to confirm, or skip.' });
    if (!primaryDoctor.address) add({ id: 'doctor-address', category: 'doctor', feature: 'providers', severity: 'recommended', question: `Where is ${primaryDoctor.personName}’s office located?`, whyItMatters: 'Appointment navigation and forms need the office address.', suggestedAction: 'Search official provider website, ask parent to confirm, or skip.' });
  }

  const pharmacy = child.careProviders.find(provider => provider.type === 'pharmacy' && (provider.preferredForRefills || provider.isPrimary));
  if (!pharmacy) {
    add({ id: 'preferred-pharmacy', category: 'pharmacy', feature: 'providers', severity: 'required_for_feature', question: 'Where does the child fill medications?', whyItMatters: 'Useful for refills, Rx transfers, medication history, and urgent prescriptions.', suggestedAction: 'Prompt for pharmacy name, phone, address, hours, refill portal/app, and whether it accepts e-prescriptions, or skip.' });
  } else {
    if (!hasText(pharmacy.phone)) add({ id: 'pharmacy-phone', category: 'pharmacy', feature: 'providers', severity: 'required_for_feature', question: `What is the phone number for ${pharmacy.organizationName ?? pharmacy.personName}?`, whyItMatters: 'Useful for refills and prescription questions.', suggestedAction: 'Search official pharmacy page, ask parent to confirm, or skip.' });
    if (!pharmacy.address) add({ id: 'pharmacy-address', category: 'pharmacy', feature: 'providers', severity: 'recommended', question: `Where is ${pharmacy.organizationName ?? pharmacy.personName} located?`, whyItMatters: 'Pickup location matters during illness or custody exchanges.', suggestedAction: 'Search official pharmacy page, ask parent to confirm, or skip.' });
  }

  if (!child.insurance.length) {
    add({ id: 'insurance-provider', category: 'insurance', feature: 'insurance', severity: 'required_for_feature', question: 'Who is the child’s insurance provider?', whyItMatters: 'Useful for appointments, prescriptions, urgent care, referrals, and billing.', suggestedAction: 'Prompt for provider, plan, member ID, group number, Rx BIN/PCN/group, phone, portal, card photos, and policy holder, or let the parent skip insurance.' });
  } else {
    const policy = child.insurance[0];
    if (!hasText(policy.phone)) add({ id: 'insurance-phone', category: 'insurance', feature: 'insurance', severity: 'recommended', question: `What is the phone number for ${policy.providerName}?`, whyItMatters: 'Useful for coverage, claims, and eligibility questions.', suggestedAction: 'Ask parent to confirm from card/portal, or skip.' });
    if (!hasText(policy.pharmacyBenefitsPhone)) add({ id: 'rx-benefits-phone', category: 'insurance', feature: 'insurance', severity: 'recommended', question: 'Is there a pharmacy benefits/Rx phone number on the insurance card?', whyItMatters: 'Medication coverage, prior auth, and copay issues often go through pharmacy benefits.', suggestedAction: 'Ask parent to scan the insurance card, enter Rx benefit details, or skip.' });
  }

  if (!child.school) {
    add({ id: 'school', category: 'school', feature: 'school', severity: 'recommended', question: 'Where does the child go to school?', whyItMatters: 'Useful for schedules, attendance, pickups, emergency contacts, and no-school days.', suggestedAction: 'Ask for school name/location, search official school/district sources, confirm, or skip school details.' });
  }

  if (!child.contacts.length) {
    add({ id: 'emergency-contacts', category: 'emergency', feature: 'child_profile', severity: 'recommended', question: 'Who are the emergency contacts and who is allowed to pick up the child?', whyItMatters: 'Useful for schools, doctors, and caregivers.', suggestedAction: 'Prompt for name, relationship, phone, address, pickup authorization, or skip.' });
  }

  return prompts;
}

export function summarizeChildVaultGaps(child: ChildProfile, settings?: PrivacyFeatureSettings): string {
  const gaps = findChildVaultGaps(child, settings);
  if (settings?.minimalMode) return 'Minimal mode is on. ParentVault will only ask for schedule reminder details and will not prompt for optional child profile, medical, insurance, school, journal, or custody data.';
  if (!settings?.allowOptionalProfilePrompts) return 'Optional profile prompts are off. You can still use schedule reminders without adding extra child details.';
  if (!gaps.length) return 'The enabled vault sections have their major baseline details. You can skip any optional field you do not want to store.';
  return gaps.map(gap => `• ${gap.question} (${gap.category}, skippable) — ${gap.whyItMatters}`).join('\n');
}
