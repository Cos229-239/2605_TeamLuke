/**
 * PARENTVAULT-COMMENTARY
 *
 * Centralizes API request validation helpers and schemas.
 *
 * Validation protects the backend from malformed data and prevents accidental sensitive fields from slipping through unexpected paths.
 *
 * Whenever the shared domain model changes, update validation so API boundaries stay explicit.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { z } from 'zod';

export const importSourceTypeSchema = z.enum(['image', 'pdf', 'calendar', 'decree', 'flyer', 'screenshot', 'voice', 'text']);
export const scheduleTypeSchema = z.enum(['custody', 'school', 'event', 'medication', 'appointment']);
export const providerTypeSchema = z.enum(['pediatrician', 'doctor', 'dentist', 'specialist', 'therapist', 'pharmacy', 'school', 'childcare', 'insurance', 'legal', 'other']);
export const schoolDateTypeSchema = z.enum(['first_day', 'last_day', 'holiday', 'break', 'teacher_workday', 'early_release', 'no_school', 'exam', 'registration', 'other']);
export const secondFactorMethodSchema = z.enum(['totp', 'sms', 'email', 'passkey', 'recovery_code']);

export const notificationOffsetSchema = z.union([
  z.enum(['day_before', 'day_of', 'hour_before']),
  z.object({ customMinutesBefore: z.number().int().positive().max(60 * 24 * 30) })
]);

export const encryptedValueSchema = z.object({
  ciphertext: z.string().min(1),
  algorithm: z.enum(['xchacha20-poly1305', 'aes-256-gcm']),
  keyId: z.string().min(1),
  nonce: z.string().min(1),
  scope: z.enum(['identity', 'medical', 'insurance', 'legal', 'journal', 'media', 'import', 'general']),
  createdAt: z.string().datetime()
});

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().optional()
});

export const careProviderSchema = z.object({
  id: z.string().optional(),
  type: providerTypeSchema,
  organizationName: z.string().optional(),
  personName: z.string().min(1),
  role: z.string().optional(),
  phone: z.string().optional(),
  afterHoursPhone: z.string().optional(),
  email: z.string().email().optional(),
  portalUrl: z.string().url().optional(),
  address: addressSchema.optional(),
  officeHours: z.string().optional(),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional(),
  acceptsElectronicPrescriptions: z.boolean().optional(),
  preferredForRefills: z.boolean().optional(),
  updatedAt: z.string().datetime().optional()
});

export const emergencyContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: addressSchema.optional(),
  allowedPickup: z.boolean().optional(),
  notes: z.string().optional()
});

export const medicationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  dosage: z.string().optional(),
  route: z.string().optional(),
  prescribingProviderId: z.string().optional(),
  pharmacyProviderId: z.string().optional(),
  rxNumberEncrypted: encryptedValueSchema.optional(),
  refillInstructions: z.string().optional(),
  refillRemainingCount: z.number().int().min(0).optional(),
  lastFilledAt: z.string().optional(),
  nextRefillDueAt: z.string().optional(),
  instructions: z.string().optional(),
  scheduleText: z.string().optional(),
  active: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sideEffectsToWatch: z.array(z.string()).optional()
});

export const medicalProfileSchema = z.object({
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  medications: z.array(medicationSchema.transform((med, index) => ({ ...med, id: med.id ?? `med_${index}` }))).default([]),
  immunizationNotes: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).default([]),
  sensoryNeeds: z.array(z.string()).default([]),
  careInstructions: z.string().optional()
});

export const insuranceSchema = z.object({
  id: z.string().optional(),
  providerName: z.string().min(1),
  planName: z.string().optional(),
  policyHolderName: z.string().optional(),
  relationshipToChild: z.string().optional(),
  memberIdEncrypted: encryptedValueSchema.optional(),
  groupNumberEncrypted: encryptedValueSchema.optional(),
  rxBinEncrypted: encryptedValueSchema.optional(),
  rxPcnEncrypted: encryptedValueSchema.optional(),
  rxGroupEncrypted: encryptedValueSchema.optional(),
  phone: z.string().optional(),
  nurseLinePhone: z.string().optional(),
  pharmacyBenefitsPhone: z.string().optional(),
  portalUrl: z.string().url().optional(),
  cardFrontUri: z.string().optional(),
  cardBackUri: z.string().optional(),
  copayNotes: z.string().optional(),
  priorAuthorizationNotes: z.string().optional(),
  notes: z.string().optional()
});

export const schoolCalendarDateSchema = z.object({
  id: z.string().optional(),
  type: schoolDateTypeSchema,
  title: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  noSchool: z.boolean(),
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
}).transform((date, index) => ({ ...date, id: date.id ?? `school_date_${index}` }));

export const schoolSchema = z.object({
  id: z.string().optional(),
  schoolName: z.string().min(1),
  districtName: z.string().optional(),
  grade: z.string().optional(),
  teacherName: z.string().optional(),
  mainPhone: z.string().optional(),
  attendancePhone: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  calendarUrl: z.string().url().optional(),
  address: addressSchema.optional(),
  officeHours: z.string().optional(),
  schoolHours: z.string().optional(),
  pickupInstructions: z.string().optional(),
  busInfo: z.string().optional(),
  calendarDates: z.array(schoolCalendarDateSchema).optional(),
  lastEnrichedAt: z.string().datetime().optional(),
  enrichmentSources: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export const legalCustodySchema = z.object({
  id: z.string().optional(),
  court: z.string().optional(),
  caseNumberEncrypted: encryptedValueSchema.optional(),
  decreeDate: z.string().optional(),
  custodySummary: z.string().optional(),
  exchangeRules: z.string().optional(),
  holidayRules: z.string().optional(),
  sourceDocumentIds: z.array(z.string()).default([]),
  notes: z.string().optional()
});

export const customChildInfoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  value: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const createProfileSchema = z.object({
  displayName: z.string().min(1),
  legalName: z.string().optional(),
  preferredName: z.string().optional(),
  birthdate: z.string().optional(),
  ssnLast4: z.string().optional(),
  encryptedSsn: encryptedValueSchema.optional(),
  medical: medicalProfileSchema.default({ allergies: [], conditions: [], medications: [], dietaryRestrictions: [], sensoryNeeds: [] }),
  careProviders: z.array(careProviderSchema.transform((provider, index) => ({ ...provider, id: provider.id ?? `provider_${index}`, updatedAt: provider.updatedAt ?? new Date().toISOString() }))).default([]),
  contacts: z.array(emergencyContactSchema.transform((contact, index) => ({ ...contact, id: contact.id ?? `contact_${index}` }))).default([]),
  insurance: z.array(insuranceSchema.transform((policy, index) => ({ ...policy, id: policy.id ?? `insurance_${index}` }))).default([]),
  school: schoolSchema.transform(school => ({ ...school, id: school.id ?? 'school_primary' })).optional(),
  legalCustody: legalCustodySchema.transform(legal => ({ ...legal, id: legal.id ?? 'legal_primary' })).optional(),
  customInfo: z.array(customChildInfoSchema.transform((item, index) => {
    const savedAt = new Date().toISOString();
    return { ...item, id: item.id ?? `custom_${index}`, createdAt: item.createdAt ?? savedAt, updatedAt: item.updatedAt ?? savedAt };
  })).default([]),
  notes: z.string().optional()
});

export const updateProfileSchema = createProfileSchema.partial();

export const createScheduleItemSchema = z.object({
  childId: z.string().optional(),
  type: scheduleTypeSchema,
  title: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().optional(),
  providerId: z.string().optional(),
  notes: z.string().optional(),
  medicationId: z.string().optional(),
  notificationOffsets: z.array(notificationOffsetSchema).default([]),
  takenAt: z.string().datetime().optional(),
  source: importSourceTypeSchema.optional(),
  confidence: z.number().min(0).max(1).optional()
});

export const updateScheduleItemSchema = createScheduleItemSchema.partial();

export const journalEntryTypeSchema = z.enum(['general', 'medical', 'custody', 'school', 'communication', 'behavior', 'expense', 'appointment', 'medication', 'other']);
export const attachmentCaptureMethodSchema = z.enum(['camera', 'photo_library', 'screenshot_import', 'document_picker', 'share_sheet', 'manual']);

export const journalAttachmentSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(['photo', 'screenshot', 'document']),
  uri: z.string().min(1),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  capturedAt: z.string().datetime().optional(),
  importedAt: z.string().datetime().default(() => new Date().toISOString()),
  captureMethod: attachmentCaptureMethodSchema.default('manual'),
  originalMetadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  sha256: z.string().optional(),
  redacted: z.boolean().optional(),
  notes: z.string().optional()
}).transform((attachment, index) => ({ ...attachment, id: attachment.id ?? `attachment_${index}` }));

export const journalAuditSchema = z.object({
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
  createdByAccountId: z.string().optional(),
  deviceId: z.string().optional(),
  timezone: z.string().optional(),
  entryOrder: z.number().int().min(0).default(0),
  userSuppliedOccurredAt: z.boolean().default(false),
  source: z.enum(['manual', 'ai_import', 'share_sheet', 'camera', 'document_import']).default('manual')
});

export const createJournalEntrySchema = z.object({
  childId: z.string().optional(),
  type: journalEntryTypeSchema.default('general'),
  occurredAt: z.string().datetime(),
  occurredAtPrecision: z.enum(['exact', 'approximate', 'date_only', 'unknown']).default('exact'),
  title: z.string().min(1),
  notes: z.string().default(''),
  peopleInvolved: z.array(z.string()).optional(),
  location: z.string().optional(),
  attachments: z.array(journalAttachmentSchema).default([]),
  tags: z.array(z.string()).default([]),
  sourceDocumentIds: z.array(z.string()).optional(),
  audit: journalAuditSchema.default({})
});

export const updateJournalEntrySchema = createJournalEntrySchema.partial();

export const createImportSchema = z.object({
  sourceType: importSourceTypeSchema,
  label: z.string().optional(),
  consent: z.boolean(),
  retainSource: z.boolean().default(false)
});

export const createTwoFactorChallengeSchema = z.object({
  method: secondFactorMethodSchema.default('totp')
});

export const verifyTwoFactorChallengeSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().min(6).max(32)
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}
