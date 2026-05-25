/**
 * PARENTVAULT-COMMENTARY
 *
 * Drafts school enrichment data such as address, phone, hours, website, calendar URL, and no-school dates.
 *
 * This workflow should help parents fill gaps without treating web/AI guesses as truth.
 *
 * All enriched school details must remain draft until a parent confirms them.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { SchoolCalendarDate, SchoolEnrichmentSuggestion, SchoolInfo } from '@parentvault/shared';

const now = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 10);

export interface SchoolSearchInput {
  schoolName: string;
  city?: string;
  state?: string;
  academicYear?: string;
}

/**
 * Manual school draft helper for the demo.
 *
 * This does not claim to search the web. It only organizes the school name/location the parent typed.
 * Real web-backed enrichment belongs in a later backend integration.
 */
export async function suggestSchoolEnrichment(input: SchoolSearchInput): Promise<SchoolEnrichmentSuggestion> {
  const location = [input.city, input.state].filter(Boolean).join(', ');
  const query = `${input.schoolName}${location ? ` ${location}` : ''} ${input.academicYear ?? ''}`.trim();

  const school: Partial<SchoolInfo> = {
    schoolName: input.schoolName,
    address: input.city && input.state ? {
      line1: '',
      city: input.city,
      state: input.state,
      postalCode: ''
    } : undefined,
    lastEnrichedAt: now(),
    enrichmentSources: ['Parent-entered school name/location'],
    notes: 'Manual draft only. Add the official website, attendance phone, hours, pickup rules, and calendar dates before relying on it.'
  };

  const calendarDates: SchoolCalendarDate[] = [];

  return {
    id: id(),
    query,
    school,
    calendarDates,
    sources: school.enrichmentSources ?? [],
    warnings: [
      'No live school website search is connected in this demo.',
      'Parent confirmation required before saving school details or no-school dates.',
      'Add official calendar dates manually until web/calendar parsing is built.'
    ],
    confidence: 0.6,
    requiresParentConfirmation: true
  };
}

export function schoolDatesToScheduleItems(childId: string | undefined, dates: SchoolCalendarDate[]) {
  return dates.map(date => ({
    childId,
    type: 'school' as const,
    title: date.noSchool ? `No school: ${date.title}` : date.title,
    startsAt: date.startsAt,
    endsAt: date.endsAt,
    notes: [date.notes, date.sourceUrl ? `Source: ${date.sourceUrl}` : undefined].filter(Boolean).join('\n') || undefined,
    notificationOffsets: ['day_before' as const],
    confidence: date.confidence
  }));
}
