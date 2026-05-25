/**
 * Onboarding step copy
 *
 * Edit this file when you want to change the Nanny Bot setup flow wording, labels,
 * step order, or upload hints. No screen layout code lives here.
 */

import type { SetupStep } from './onboardingTypes';

export const steps: SetupStep[] = [
  {
    key: 'basics',
    label: 'Child',
    title: 'Tell me who we’re protecting.',
    message: 'Start with the child’s everyday info. We can leave sensitive details out until encryption is finished.',
    uploadHint: 'Birth certificate, school profile, or any copied profile text.'
  },
  {
    key: 'school',
    label: 'School',
    title: 'Now let’s make school days less chaotic.',
    message: 'School name, teacher, hours, pickup rules, attendance phone, and calendar links help the bot answer fast.',
    uploadHint: 'School webpage text, calendar PDF, screenshot, flyer, or pickup instructions.'
  },
  {
    key: 'medical',
    label: 'Medical',
    title: 'Medical and care notes, carefully.',
    message: 'Allergies, conditions, medications, dosage notes, and care instructions belong here for quick reference.',
    uploadHint: 'Medication label, doctor instructions, care plan, therapy note, or appointment card.'
  },
  {
    key: 'care',
    label: 'Care team',
    title: 'Who should the parent call?',
    message: 'Doctors, pharmacy, insurance, emergency contacts, and allowed pickup people make the vault useful in a hurry.',
    uploadHint: 'Insurance card, provider list, pharmacy label, contact card, or pickup authorization.'
  },
  {
    key: 'custody',
    label: 'Custody',
    title: 'Custody rules need review, not guesses.',
    message: "Add your own exchange rules in plain English or paste a decree snippet. I'll review anything that looks like it came from a legal document before adding it to the vault.",
    uploadHint: 'Parenting plan, decree snippet, exchange screenshot, or holiday schedule.'
  },
  {
    key: 'journal',
    label: 'Journal',
    title: 'Capture the paper trail while it’s fresh.',
    message: 'Journal notes should be factual: what happened, when, who was involved, and what source backs it up.',
    uploadHint: 'Screenshot, photo, receipt, message text, school note, or incident details.'
  },
  {
    key: 'review',
    label: 'Review',
    title: 'Last check before I open the vault.',
    message: 'Review the draft. Nothing here is final forever — this is just enough to get ParentVault useful on day one.',
    uploadHint: 'Add anything missing from the earlier steps.'
  }
];
