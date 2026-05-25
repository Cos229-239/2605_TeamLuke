/**
 * PARENTVAULT-COMMENTARY
 *
 * Stubbed AI import service that simulates turning messy source material into structured suggestions.
 *
 * It exists to shape the review UX before real OCR/AI providers are connected.
 *
 * Real implementations require explicit consent, redaction, retention controls, provider metadata, and parent approval before saving.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { ImportSourceType, ImportSuggestion, ScheduleType } from '@parentvault/shared';

const id = () => Math.random().toString(36).slice(2, 10);

interface ImportInput {
  sourceType: ImportSourceType;
  label: string;
  rawText?: string;
}

const titleCase = (value: string) => value.replace(/\w\S*/g, part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

const lineValue = (text: string, labels: string[]) => {
  const escapedLabels = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${escapedLabels})\\s*[:=-]\\s*(.+)`, 'i'));
  return match?.[1]?.trim();
};

const firstPhone = (text: string) => text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0];
const firstUrl = (text: string) => text.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i)?.[0];

const inferScheduleType = (sourceType: ImportSourceType, text: string): ScheduleType => {
  const lower = text.toLowerCase();
  if (sourceType === 'decree' || lower.includes('custody') || lower.includes('exchange') || lower.includes('pickup') || lower.includes('dropoff')) return 'custody';
  if (lower.includes('medicine') || lower.includes('medication') || lower.includes('dose') || lower.includes('rx')) return 'medication';
  if (lower.includes('school') || lower.includes('teacher') || lower.includes('district') || lower.includes('no school')) return 'school';
  if (lower.includes('appointment') || lower.includes('doctor') || lower.includes('therapy') || lower.includes('dentist')) return 'appointment';
  return 'event';
};

const parseScheduleDate = (text: string) => {
  const explicitIso = text.match(/\b\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2})?\b/);
  if (explicitIso) {
    const normalized = explicitIso[0].includes(':') ? explicitIso[0].replace(' ', 'T') : `${explicitIso[0]}T09:00`;
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const monthDate = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i);
  if (monthDate) {
    const hasYear = /\d{4}/.test(monthDate[0]);
    const candidate = hasYear ? monthDate[0] : `${monthDate[0]}, ${new Date().getFullYear()}`;
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
};

export async function createImportSuggestion(inputOrSourceType: ImportInput | ImportSourceType, labelMaybe?: string): Promise<ImportSuggestion> {
  const input: ImportInput = typeof inputOrSourceType === 'string'
    ? { sourceType: inputOrSourceType, label: labelMaybe || 'uploaded source' }
    : inputOrSourceType;

  const rawText = input.rawText?.trim() || '';
  const lower = rawText.toLowerCase();
  const sourceType = input.sourceType;
  const scheduleType = inferScheduleType(sourceType, rawText || input.label);
  const schoolName = lineValue(rawText, ['school', 'school name', 'campus']) || (lower.includes('school') ? titleCase((rawText.match(/([A-Z][A-Za-z' -]+(?:Elementary|Middle|High|School))/)?.[1] || 'School from upload').trim()) : undefined);
  const childName = lineValue(rawText, ['child', 'student', 'student name', 'child name']);
  const eventTitle = lineValue(rawText, ['event', 'title', 'appointment', 'activity']) || (scheduleType === 'school' ? 'School item from upload' : scheduleType === 'custody' ? 'Custody item from upload' : scheduleType === 'medication' ? 'Medication reminder from upload' : 'Imported item from upload');
  const phone = firstPhone(rawText);
  const websiteUrl = firstUrl(rawText);
  const address = lineValue(rawText, ['address', 'location']);
  const startsAt = parseScheduleDate(rawText);

  const proposedProfiles = schoolName || childName ? [{
    displayName: childName,
    school: schoolName ? {
      id: `school-${id()}`,
      schoolName,
      mainPhone: phone,
      websiteUrl,
      address: address ? { line1: address, city: 'Review', state: 'Review', postalCode: 'Review' } : undefined,
      notes: 'Extracted from uploaded/pasted information. Review before relying on it.',
      enrichmentSources: [input.label]
    } : undefined
  }] : undefined;

  return {
    id: id(),
    sourceType,
    summary: rawText
      ? `Drafted review items from ${input.label}. Nothing has been saved yet.`
      : `Ready to review extracted details from ${input.label}. Add pasted text for better extraction.`,
    proposedProfiles,
    proposedScheduleItems: [
      {
        type: scheduleType,
        title: eventTitle,
        startsAt,
        location: address,
        notificationOffsets: scheduleType === 'medication' ? ['hour_before', { customMinutesBefore: 10 }] : ['day_before', 'hour_before'],
        source: sourceType,
        confidence: rawText ? 0.68 : 0.35,
        notes: rawText
          ? `Extracted from uploaded/pasted information. Original text:\n${rawText.slice(0, 1200)}`
          : 'Placeholder extraction. Paste document text for better results. Parent review required before saving.'
      }
    ],
    proposedJournalEntries: rawText ? [
      {
        type: scheduleType === 'medication' ? 'medical' : scheduleType === 'custody' ? 'custody' : scheduleType === 'school' ? 'school' : 'general',
        occurredAt: new Date().toISOString(),
        occurredAtPrecision: 'exact',
        title: `Imported note: ${input.label}`,
        notes: rawText,
        attachments: [],
        tags: ['import', sourceType]
      }
    ] : undefined,
    warnings: [
      'Review all dates, times, names, locations, medication details, and school details before saving.',
      'Uploaded/pasted information stays on this device right now; encrypted storage and account sync must be completed before real sensitive use.',
      ...(rawText ? [] : ['File text extraction is limited in this MVP. If the preview looks generic, paste the document text into the text box.'])
    ]
  };
}
