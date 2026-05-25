/**
 * PARENTVAULT-COMMENTARY
 *
 * Shared domain model exports for child profiles, providers, schedules, journals, imports, schools, custody, insurance, privacy, and AI results.
 *
 * This package is the contract between mobile, API, and future backend implementations.
 *
 * Be careful changing field names because multiple app layers depend on this schema.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

export type ID = string;

export type ScheduleType = 'custody' | 'school' | 'event' | 'medication' | 'appointment';
export type ImportSourceType = 'image' | 'pdf' | 'calendar' | 'decree' | 'flyer' | 'screenshot' | 'voice' | 'text';
export type NotificationOffset = 'day_before' | 'day_of' | 'hour_before' | { customMinutesBefore: number };
export type ProviderType = 'pediatrician' | 'doctor' | 'dentist' | 'specialist' | 'therapist' | 'pharmacy' | 'school' | 'childcare' | 'insurance' | 'legal' | 'other';
export type SchoolDateType = 'first_day' | 'last_day' | 'holiday' | 'break' | 'teacher_workday' | 'early_release' | 'no_school' | 'exam' | 'registration' | 'other';
export type SecondFactorMethod = 'totp' | 'sms' | 'email' | 'passkey' | 'recovery_code';
export type LocalUnlockMethod = 'biometric' | 'device_passcode' | 'app_pin';
export type ParentVaultFeature = 'schedule_reminders' | 'child_profile' | 'medical' | 'providers' | 'insurance' | 'school' | 'custody_legal' | 'journal' | 'media_attachments' | 'ai_imports' | 'web_enrichment';
export type JournalEntryType = 'general' | 'medical' | 'custody' | 'school' | 'communication' | 'behavior' | 'expense' | 'appointment' | 'medication' | 'other';
export type AttachmentCaptureMethod = 'camera' | 'photo_library' | 'screenshot_import' | 'document_picker' | 'share_sheet' | 'manual';
export type ExportFormat = 'pdf' | 'zip' | 'json' | 'csv';
export type ReminderKind = 'day_before' | 'morning_of' | 'hour_before' | 'pickup_school_day' | 'pickup_no_school_day' | 'therapy_transport' | 'therapy_hour_before' | 'medication_due' | 'journal_prompt' | 'monthly_calendar_setup' | 'custom';
export type ReminderDeliveryChannel = 'local_push' | 'email' | 'sms' | 'in_app';

export type EncryptionScope = 'identity' | 'medical' | 'insurance' | 'legal' | 'journal' | 'media' | 'import' | 'general';

export interface EncryptedValue {
  ciphertext: string;
  algorithm: 'xchacha20-poly1305' | 'aes-256-gcm';
  keyId: string;
  nonce: string;
  scope: EncryptionScope;
  createdAt: string;
}

export interface SensitivePlaintext<T = string> {
  value: T;
  warning: 'plaintext_runtime_only_never_persist';
}

export interface PrivacyFeatureSettings {
  accountId: ID;
  enabledFeatures: ParentVaultFeature[];
  declinedFeatures: ParentVaultFeature[];
  allowOptionalProfilePrompts: boolean;
  allowWebEnrichment: boolean;
  allowAiImports: boolean;
  minimalMode: boolean;
  updatedAt: string;
}

export interface AuthSecuritySettings {
  accountId: ID;
  twoFactorRequired: boolean;
  enabledSecondFactors: SecondFactorMethod[];
  preferredSecondFactor?: SecondFactorMethod;
  localUnlockRequired: boolean;
  localUnlockMethods: LocalUnlockMethod[];
  trustedDeviceIds: ID[];
  recoveryCodesRemaining: number;
  lastSecurityReviewAt?: string;
}

export interface TwoFactorChallenge {
  id: ID;
  method: SecondFactorMethod;
  deliveryHint?: string;
  expiresAt: string;
  verifiedAt?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CareProvider {
  id: ID;
  type: ProviderType;
  organizationName?: string;
  personName: string;
  role?: string;
  phone?: string;
  afterHoursPhone?: string;
  email?: string;
  portalUrl?: string;
  address?: Address;
  officeHours?: string;
  notes?: string;
  isPrimary?: boolean;
  acceptsElectronicPrescriptions?: boolean;
  preferredForRefills?: boolean;
  updatedAt: string;
}

export interface InsuranceInfo {
  id: ID;
  providerName: string;
  planName?: string;
  policyHolderName?: string;
  relationshipToChild?: string;
  memberIdEncrypted?: EncryptedValue;
  groupNumberEncrypted?: EncryptedValue;
  rxBinEncrypted?: EncryptedValue;
  rxPcnEncrypted?: EncryptedValue;
  rxGroupEncrypted?: EncryptedValue;
  phone?: string;
  nurseLinePhone?: string;
  pharmacyBenefitsPhone?: string;
  portalUrl?: string;
  cardFrontUri?: string;
  cardBackUri?: string;
  copayNotes?: string;
  priorAuthorizationNotes?: string;
  notes?: string;
}

export interface ReminderRule {
  id: ID;
  kind: ReminderKind;
  enabled: boolean;
  localTime?: string;
  minutesBefore?: number;
  messageTemplate: string;
  deliveryChannels: ReminderDeliveryChannel[];
}

export interface NotificationPreferences {
  accountId: ID;
  timezone: string;
  quietHours?: { startLocalTime: string; endLocalTime: string };
  genericLockScreenText: boolean;
  defaultRules: ReminderRule[];
  pickupRules: {
    schoolDayLocalTime: string;
    noSchoolLocalTime: string;
    dayOfEarlyLocalTime: string;
  };
  therapyRules: {
    morningPlanningLocalTime: string;
    hourBeforeMinutes: number;
    onlyWhenParentHasChild: boolean;
  };
  journalPrompt?: {
    enabled: boolean;
    localTime: string;
    messageTemplate: string;
  };
  monthlyCalendarSetup?: {
    enabled: boolean;
    dayOfMonth: number;
    localTime: string;
  };
}

export interface PlannedReminder {
  id: ID;
  scheduleItemId?: ID;
  kind: ReminderKind;
  firesAt: string;
  title: string;
  body: string;
  deliveryChannels: ReminderDeliveryChannel[];
  timezone: string;
}

export interface SchoolCalendarDate {
  id: ID;
  type: SchoolDateType;
  title: string;
  startsAt: string;
  endsAt?: string;
  noSchool: boolean;
  sourceUrl?: string;
  confidence?: number;
  notes?: string;
}

export interface SchoolInfo {
  id: ID;
  schoolName: string;
  districtName?: string;
  grade?: string;
  teacherName?: string;
  mainPhone?: string;
  attendancePhone?: string;
  websiteUrl?: string;
  calendarUrl?: string;
  address?: Address;
  officeHours?: string;
  schoolHours?: string;
  pickupInstructions?: string;
  busInfo?: string;
  calendarDates?: SchoolCalendarDate[];
  lastEnrichedAt?: string;
  enrichmentSources?: string[];
  notes?: string;
}

export interface SchoolEnrichmentSuggestion {
  id: ID;
  query: string;
  school: Partial<SchoolInfo>;
  calendarDates: SchoolCalendarDate[];
  sources: string[];
  warnings: string[];
  confidence: number;
  requiresParentConfirmation: true;
}

export interface LegalCustodyInfo {
  id: ID;
  court?: string;
  caseNumberEncrypted?: EncryptedValue;
  decreeDate?: string;
  custodySummary?: string;
  exchangeRules?: string;
  holidayRules?: string;
  sourceDocumentIds: ID[];
  notes?: string;
}

export interface EmergencyContact {
  id: ID;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  address?: Address;
  allowedPickup?: boolean;
  notes?: string;
}

export interface Medication {
  id: ID;
  name: string;
  dosage?: string;
  route?: string;
  prescribingProviderId?: ID;
  pharmacyProviderId?: ID;
  rxNumberEncrypted?: EncryptedValue;
  refillInstructions?: string;
  refillRemainingCount?: number;
  lastFilledAt?: string;
  nextRefillDueAt?: string;
  instructions?: string;
  scheduleText?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  sideEffectsToWatch?: string[];
}

export interface MedicalProfile {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: Medication[];
  immunizationNotes?: string;
  dietaryRestrictions: string[];
  sensoryNeeds: string[];
  careInstructions?: string;
}

export interface CustomChildInfo {
  id: ID;
  title: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChildProfile {
  id: ID;
  displayName: string;
  legalName?: string;
  preferredName?: string;
  birthdate?: string;
  ssnLast4?: string;
  encryptedSsn?: EncryptedValue;
  medical: MedicalProfile;
  careProviders: CareProvider[];
  contacts: EmergencyContact[];
  insurance: InsuranceInfo[];
  school?: SchoolInfo;
  legalCustody?: LegalCustodyInfo;
  customInfo?: CustomChildInfo[];
  notes?: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: ID;
  childId?: ID;
  type: ScheduleType;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  providerId?: ID;
  notes?: string;
  medicationId?: ID;
  notificationOffsets: NotificationOffset[];
  takenAt?: string;
  source?: ImportSourceType;
  confidence?: number;
}

export interface JournalAttachment {
  id: ID;
  kind: 'photo' | 'screenshot' | 'document';
  uri: string;
  filename?: string;
  mimeType?: string;
  capturedAt?: string;
  importedAt: string;
  captureMethod: AttachmentCaptureMethod;
  originalMetadata?: Record<string, string | number | boolean>;
  sha256?: string;
  redacted?: boolean;
  notes?: string;
}

export interface JournalEntryAuditMetadata {
  createdAt: string;
  updatedAt: string;
  createdByAccountId?: ID;
  deviceId?: ID;
  timezone?: string;
  entryOrder: number;
  userSuppliedOccurredAt: boolean;
  source: 'manual' | 'ai_import' | 'share_sheet' | 'camera' | 'document_import';
}

export interface JournalEntry {
  id: ID;
  childId?: ID;
  type: JournalEntryType;
  occurredAt: string;
  occurredAtPrecision: 'exact' | 'approximate' | 'date_only' | 'unknown';
  title: string;
  notes: string;
  peopleInvolved?: string[];
  location?: string;
  attachments: JournalAttachment[];
  tags: string[];
  sourceDocumentIds?: ID[];
  audit: JournalEntryAuditMetadata;
}

export interface JournalExportRequest {
  id: ID;
  childId?: ID;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  includeAttachments: boolean;
  includeAttachmentMetadata: boolean;
  includeAuditMetadata: boolean;
  includeMedicalEntries: boolean;
  includeCustodyEntries: boolean;
  createdAt: string;
}

export interface JournalExportManifest {
  id: ID;
  generatedAt: string;
  format: ExportFormat;
  entryCount: number;
  attachmentCount: number;
  entries: Array<{ id: ID; title: string; occurredAt: string; createdAt: string; attachmentIds: ID[] }>;
  warnings: string[];
}

export interface KnowledgeSource {
  id: ID;
  childId?: ID;
  kind: 'profile' | 'provider' | 'medication' | 'schedule' | 'journal' | 'document' | 'school' | 'insurance' | 'legal';
  title: string;
  text: string;
  sensitive: boolean;
  updatedAt: string;
  uri?: string;
}

export interface RagAnswer {
  answer: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  sources: KnowledgeSource[];
  warnings: string[];
}

export interface ImportSuggestion {
  id: ID;
  sourceType: ImportSourceType;
  summary: string;
  proposedProfiles?: Partial<ChildProfile>[];
  proposedScheduleItems?: Partial<ScheduleItem>[];
  proposedJournalEntries?: Partial<JournalEntry>[];
  warnings: string[];
}

export interface ChatCommandResult {
  reply: string;
  proposedScheduleItems?: Partial<ScheduleItem>[];
  proposedProfileUpdates?: Partial<ChildProfile>[];
  ragAnswer?: RagAnswer;
}

export const emptyMedicalProfile = (): MedicalProfile => ({
  allergies: [],
  conditions: [],
  medications: [],
  dietaryRestrictions: [],
  sensoryNeeds: []
});

export * from './rag';
export * from './completeness';
export * from './encryption';
export * from './reminders';
