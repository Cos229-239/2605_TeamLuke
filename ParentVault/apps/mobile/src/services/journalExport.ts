/**
 * PARENTVAULT-COMMENTARY
 *
 * Builds an export manifest preview for journal records and attachments.
 *
 * The export design should be evidence-grade: timestamps, metadata, attachment counts, hashes, and clear structure.
 *
 * Production export must avoid leaking plaintext through logs, temp files, or analytics.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { JournalEntry, JournalExportManifest, JournalExportRequest } from '@parentvault/shared';

const id = () => Math.random().toString(36).slice(2, 10);

export function buildJournalExportManifest(entries: JournalEntry[], request: JournalExportRequest): JournalExportManifest {
  const filtered = entries
    .filter(entry => !request.childId || entry.childId === request.childId)
    .filter(entry => !request.dateFrom || entry.occurredAt >= request.dateFrom)
    .filter(entry => !request.dateTo || entry.occurredAt <= request.dateTo)
    .filter(entry => request.includeMedicalEntries || !['medical', 'medication', 'appointment'].includes(entry.type))
    .filter(entry => request.includeCustodyEntries || entry.type !== 'custody')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.audit.entryOrder - b.audit.entryOrder);

  const attachmentCount = request.includeAttachments
    ? filtered.reduce((sum, entry) => sum + entry.attachments.length, 0)
    : 0;

  return {
    id: id(),
    generatedAt: new Date().toISOString(),
    format: request.format,
    entryCount: filtered.length,
    attachmentCount,
    entries: filtered.map(entry => ({
      id: entry.id,
      title: entry.title,
      occurredAt: entry.occurredAt,
      createdAt: entry.audit.createdAt,
      attachmentIds: request.includeAttachments ? entry.attachments.map(attachment => attachment.id) : []
    })),
    warnings: [
      'Export is an organized record package, not legal advice.',
      'Preserve original device/cloud copies of photos and screenshots when possible.',
      'Production export should include hashes and encrypted originals for integrity.'
    ]
  };
}

export function makeDefaultJournalExportRequest(childId?: string): JournalExportRequest {
  return {
    id: id(),
    childId,
    format: 'zip',
    includeAttachments: true,
    includeAttachmentMetadata: true,
    includeAuditMetadata: true,
    includeMedicalEntries: true,
    includeCustodyEntries: true,
    createdAt: new Date().toISOString()
  };
}
