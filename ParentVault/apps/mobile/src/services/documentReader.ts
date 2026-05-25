/**
 * PARENTVAULT-COMMENTARY
 *
 * Deterministic document reader for ParentVault imports.
 *
 * This intentionally avoids AI: it reads text-like files, calendars, CSV, and JSON with predictable parsers,
 * then returns review-only suggestions that a parent must confirm before saving.
 *
 * PDFs and images are not parsed here yet. They need either selectable-text PDF extraction or non-AI OCR
 * such as platform text recognition/Tesseract in a later pass.
 */

import type { ImportSourceType, ImportSuggestion, JournalEntryType, ScheduleType } from '@parentvault/shared';
import { createImportSuggestion } from './aiImport';

const id = () => Math.random().toString(36).slice(2, 10);

export interface DocumentAssetLike {
  uri?: string;
  name?: string;
  fileName?: string;
  mimeType?: string;
}

export interface ReadDocumentResult {
  text: string;
  sourceType: ImportSourceType;
  warnings: string[];
}

const clean = (value = '') => value.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
const lines = (text: string) => clean(text).split('\n').map(line => line.trim()).filter(Boolean);

export const inferDocumentSourceType = (name = '', mimeType = ''): ImportSourceType => {
  const value = `${name} ${mimeType}`.toLowerCase();
  if (value.includes('calendar') || value.endsWith('.ics') || value.includes('text/calendar')) return 'calendar';
  if (value.includes('custody') || value.includes('decree') || value.includes('order')) return 'decree';
  if (value.includes('flyer')) return 'flyer';
  if (value.includes('screenshot')) return 'screenshot';
  if (value.includes('image')) return 'image';
  if (value.includes('text') || value.includes('csv') || value.includes('json') || value.endsWith('.txt') || value.endsWith('.csv') || value.endsWith('.json')) return 'text';
  return 'pdf';
};

export async function readDocumentAsset(asset: DocumentAssetLike): Promise<ReadDocumentResult> {
  const name = asset.name || asset.fileName || 'selected document';
  const mimeType = asset.mimeType || '';
  const sourceType = inferDocumentSourceType(name, mimeType);
  const lower = `${name} ${mimeType}`.toLowerCase();

  if (!asset.uri) return { text: '', sourceType, warnings: ['No readable file URI was provided.'] };

  if (sourceType === 'image' || sourceType === 'screenshot') {
    return { text: '', sourceType, warnings: ['Image reading needs non-AI OCR in a later pass. Paste visible text for now.'] };
  }

  if (sourceType === 'pdf' && (lower.includes('pdf') || name.toLowerCase().endsWith('.pdf'))) {
    return { text: '', sourceType, warnings: ['PDF selectable-text extraction is not wired yet. Paste copied PDF text for now.'] };
  }

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const blobType = blob.type.toLowerCase();
    const looksTextLike = blobType.includes('text') || blobType.includes('calendar') || blobType.includes('json') || blobType.includes('csv') || /\.(txt|csv|json|ics)$/i.test(name);

    if (!looksTextLike) {
      return { text: '', sourceType, warnings: [`${name} is not a readable text/calendar/JSON/CSV document yet.`] };
    }

    return { text: await blob.text(), sourceType, warnings: [] };
  } catch {
    return { text: '', sourceType, warnings: [`Could not read ${name}. Try pasting the document text.`] };
  }
}

const unescapeIcs = (value = '') => value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();

const parseIcsDate = (value = '') => {
  const raw = value.replace(/Z$/, '');
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!match) return undefined;
  const [, year, month, day, hour = '09', minute = '00', second = '00'] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${value.endsWith('Z') ? '.000Z' : ''}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const unfoldIcs = (text: string) => text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);

function parseCalendar(text: string, label: string): ImportSuggestion | null {
  if (!/BEGIN:VCALENDAR/i.test(text)) return null;

  const rawLines = unfoldIcs(text);
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;

  rawLines.forEach(raw => {
    const [left, ...rest] = raw.split(':');
    const value = rest.join(':');
    const key = left.split(';')[0].toUpperCase();
    if (key === 'BEGIN' && value.toUpperCase() === 'VEVENT') current = {};
    else if (key === 'END' && value.toUpperCase() === 'VEVENT' && current) {
      events.push(current);
      current = null;
    } else if (current) current[key] = value;
  });

  const proposedScheduleItems = events.map(event => ({
    type: inferScheduleType(`${event.SUMMARY || ''} ${event.DESCRIPTION || ''}`),
    title: unescapeIcs(event.SUMMARY) || 'Calendar event',
    startsAt: parseIcsDate(event.DTSTART) || new Date().toISOString(),
    endsAt: parseIcsDate(event.DTEND),
    location: unescapeIcs(event.LOCATION),
    notes: [unescapeIcs(event.DESCRIPTION), `Imported from ${label}`].filter(Boolean).join('\n'),
    notificationOffsets: ['day_before' as const, 'hour_before' as const],
    source: 'calendar' as const,
    confidence: event.DTSTART ? 0.95 : 0.55
  }));

  return {
    id: id(),
    sourceType: 'calendar',
    summary: proposedScheduleItems.length ? `Read ${proposedScheduleItems.length} calendar event${proposedScheduleItems.length === 1 ? '' : 's'} from ${label}. Review before saving.` : `No calendar events found in ${label}.`,
    proposedScheduleItems,
    warnings: ['Calendar import is deterministic, not AI. Still confirm dates, time zones, locations, and custody/school meaning before saving.']
  };
}

const inferScheduleType = (text: string): ScheduleType => {
  const lower = text.toLowerCase();
  if (lower.includes('custody') || lower.includes('pickup') || lower.includes('dropoff') || lower.includes('exchange')) return 'custody';
  if (lower.includes('med') || lower.includes('dose') || lower.includes('rx')) return 'medication';
  if (lower.includes('school') || lower.includes('teacher') || lower.includes('conference')) return 'school';
  if (lower.includes('doctor') || lower.includes('therapy') || lower.includes('dentist') || lower.includes('appointment')) return 'appointment';
  return 'event';
};

const splitCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
};

function parseCsv(text: string, label: string): ImportSuggestion | null {
  const rows = lines(text);
  if (rows.length < 2 || !rows[0].includes(',')) return null;
  const headers = splitCsvLine(rows[0]).map(header => header.toLowerCase());
  const hasUsefulHeaders = headers.some(header => ['title', 'event', 'date', 'time', 'location', 'school', 'phone', 'notes', 'type'].includes(header));
  if (!hasUsefulHeaders) return null;

  const proposedScheduleItems = rows.slice(1).map(row => {
    const values = splitCsvLine(row);
    const get = (...keys: string[]) => keys.map(key => values[headers.indexOf(key)]).find(Boolean) || '';
    const title = get('title', 'event', 'name', 'appointment') || 'CSV event';
    const dateText = [get('date', 'startsat', 'start'), get('time')].filter(Boolean).join(' ');
    const parsedDate = dateText ? new Date(dateText) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      type: inferScheduleType(`${get('type')} ${title} ${get('notes', 'description')}`),
      title,
      startsAt: Number.isNaN(parsedDate.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : parsedDate.toISOString(),
      location: get('location', 'address'),
      notes: [get('notes', 'description'), `Imported from ${label}`].filter(Boolean).join('\n'),
      notificationOffsets: ['day_before' as const, 'hour_before' as const],
      source: 'text' as const,
      confidence: dateText ? 0.8 : 0.45
    };
  });

  return {
    id: id(),
    sourceType: 'text',
    summary: `Read ${proposedScheduleItems.length} CSV row${proposedScheduleItems.length === 1 ? '' : 's'} from ${label}. Review before saving.`,
    proposedScheduleItems,
    warnings: ['CSV import is deterministic. Confirm columns mapped correctly before saving.']
  };
}

function parseJson(text: string, label: string): ImportSuggestion | null {
  const trimmed = clean(text);
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    const root = Array.isArray(parsed) ? { schedule: parsed } : parsed;
    const scheduleRows = Array.isArray(root.schedule) ? root.schedule : Array.isArray(root.events) ? root.events : [];
    const journalRows = Array.isArray(root.journal) ? root.journal : Array.isArray(root.notes) ? root.notes : [];
    const childrenRows = Array.isArray(root.children) ? root.children : root.child ? [root.child] : [];

    return {
      id: id(),
      sourceType: 'text',
      summary: `Read structured JSON from ${label}: ${childrenRows.length} child profile draft${childrenRows.length === 1 ? '' : 's'}, ${scheduleRows.length} schedule draft${scheduleRows.length === 1 ? '' : 's'}, ${journalRows.length} journal draft${journalRows.length === 1 ? '' : 's'}.`,
      proposedProfiles: childrenRows.map((child: any) => ({
        displayName: child.displayName || child.name || child.childName,
        legalName: child.legalName,
        preferredName: child.preferredName,
        birthdate: child.birthdate,
        medical: child.medical,
        school: child.school
      })),
      proposedScheduleItems: scheduleRows.map((item: any) => ({
        type: item.type || inferScheduleType(`${item.title || item.name || ''} ${item.notes || ''}`),
        title: item.title || item.name || 'JSON event',
        startsAt: item.startsAt || item.date || new Date().toISOString(),
        endsAt: item.endsAt,
        location: item.location,
        notes: item.notes || item.description,
        notificationOffsets: item.notificationOffsets || ['day_before', 'hour_before'],
        source: 'text',
        confidence: 0.9
      })),
      proposedJournalEntries: journalRows.map((entry: any) => ({
        type: (entry.type || 'general') as JournalEntryType,
        occurredAt: entry.occurredAt || entry.date || new Date().toISOString(),
        occurredAtPrecision: entry.occurredAtPrecision || 'exact',
        title: entry.title || 'JSON note',
        notes: entry.notes || entry.text || '',
        attachments: [],
        tags: entry.tags || ['json-import']
      })),
      warnings: ['JSON import is deterministic. Review field mapping before saving.']
    };
  } catch {
    return null;
  }
}

const keyValue = (text: string, labels: string[]) => {
  const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[:=-]\\s*(.+)`, 'i'));
  return match?.[1]?.trim();
};

function parseSchoolText(text: string, label: string): Partial<ImportSuggestion> {
  const schoolName = keyValue(text, ['school', 'school name', 'campus']);
  if (!schoolName) return {};
  return {
    proposedProfiles: [{
      school: {
        id: `school-${id()}`,
        schoolName,
        districtName: keyValue(text, ['district']),
        grade: keyValue(text, ['grade']),
        teacherName: keyValue(text, ['teacher']),
        mainPhone: keyValue(text, ['main phone', 'phone', 'school phone']),
        websiteUrl: keyValue(text, ['website', 'url']),
        schoolHours: keyValue(text, ['school hours', 'hours']),
        pickupInstructions: keyValue(text, ['pickup instructions', 'pickup', 'dismissal']),
        notes: `Read from ${label}. Review before saving.`
      }
    }]
  };
}

export async function createDocumentImportSuggestion(input: { sourceType: ImportSourceType; label: string; rawText?: string; warnings?: string[] }): Promise<ImportSuggestion> {
  const rawText = input.rawText || '';
  const label = input.label || 'document';
  const warningPrefix = input.warnings || [];

  const parsed = parseCalendar(rawText, label) || parseCsv(rawText, label) || parseJson(rawText, label);
  if (parsed) return { ...parsed, warnings: [...warningPrefix, ...parsed.warnings] };

  const base = await createImportSuggestion({ sourceType: input.sourceType, label, rawText });
  const schoolPatch = parseSchoolText(rawText, label);
  return {
    ...base,
    ...schoolPatch,
    summary: rawText ? `${base.summary} Parsed without AI using document rules where possible.` : base.summary,
    warnings: [...warningPrefix, ...base.warnings]
  };
}
