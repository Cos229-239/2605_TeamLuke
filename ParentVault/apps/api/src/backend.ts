/**
 * PARENTVAULT-COMMENTARY
 *
 * Creates the backend adapter boundary for cloud-first and later self-hosted storage.
 *
 * The point of this layer is to keep the mobile app from caring whether data lives in hosted infrastructure or a parent-owned server.
 *
 * Production implementations must encrypt sensitive fields before persistence and enforce authorization on every read/write.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { randomUUID } from 'node:crypto';
import type {
  ChildProfile,
  ID,
  ImportSourceType,
  ImportSuggestion,
  JournalEntry,
  ScheduleItem
} from '@parentvault/shared';

export type BackendMode = 'cloud' | 'self-hosted';

export interface BackendInfo {
  mode: BackendMode;
  storage: 'memory' | 'database';
  pairingEnabled: boolean;
}

export interface VaultBackend {
  info(): BackendInfo;

  listProfiles(): Promise<ChildProfile[]>;
  getProfile(id: ID): Promise<ChildProfile | undefined>;
  createProfile(input: Omit<ChildProfile, 'id' | 'updatedAt'>): Promise<ChildProfile>;
  updateProfile(id: ID, patch: Partial<Omit<ChildProfile, 'id'>>): Promise<ChildProfile | undefined>;
  deleteProfile(id: ID): Promise<boolean>;

  listSchedule(): Promise<ScheduleItem[]>;
  getScheduleItem(id: ID): Promise<ScheduleItem | undefined>;
  createScheduleItem(input: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem>;
  updateScheduleItem(id: ID, patch: Partial<Omit<ScheduleItem, 'id'>>): Promise<ScheduleItem | undefined>;
  deleteScheduleItem(id: ID): Promise<boolean>;

  listJournal(): Promise<JournalEntry[]>;
  getJournalEntry(id: ID): Promise<JournalEntry | undefined>;
  createJournalEntry(input: Omit<JournalEntry, 'id'>): Promise<JournalEntry>;
  updateJournalEntry(id: ID, patch: Partial<Omit<JournalEntry, 'id'>>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: ID): Promise<boolean>;

  createImportSuggestion(input: { sourceType: ImportSourceType; label?: string; consent: boolean }): Promise<ImportSuggestion>;
}

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomUUID()}`;

function applyDefined<T extends object>(target: T, patch: Partial<T>): T {
  return Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)));
}

export class MemoryVaultBackend implements VaultBackend {
  private profiles = new Map<ID, ChildProfile>();
  private schedule = new Map<ID, ScheduleItem>();
  private journal = new Map<ID, JournalEntry>();

  constructor(private readonly backendInfo: BackendInfo) {}

  info(): BackendInfo {
    return this.backendInfo;
  }

  async listProfiles(): Promise<ChildProfile[]> {
    return [...this.profiles.values()];
  }

  async getProfile(profileId: ID): Promise<ChildProfile | undefined> {
    return this.profiles.get(profileId);
  }

  async createProfile(input: Omit<ChildProfile, 'id' | 'updatedAt'>): Promise<ChildProfile> {
    const profile: ChildProfile = { ...input, id: id('child'), updatedAt: now() };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async updateProfile(profileId: ID, patch: Partial<Omit<ChildProfile, 'id'>>): Promise<ChildProfile | undefined> {
    const current = this.profiles.get(profileId);
    if (!current) return undefined;
    const updated = applyDefined({ ...current }, { ...patch, updatedAt: now() });
    this.profiles.set(profileId, updated);
    return updated;
  }

  async deleteProfile(profileId: ID): Promise<boolean> {
    return this.profiles.delete(profileId);
  }

  async listSchedule(): Promise<ScheduleItem[]> {
    return [...this.schedule.values()];
  }

  async getScheduleItem(scheduleId: ID): Promise<ScheduleItem | undefined> {
    return this.schedule.get(scheduleId);
  }

  async createScheduleItem(input: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const item: ScheduleItem = { ...input, id: id('schedule') };
    this.schedule.set(item.id, item);
    return item;
  }

  async updateScheduleItem(scheduleId: ID, patch: Partial<Omit<ScheduleItem, 'id'>>): Promise<ScheduleItem | undefined> {
    const current = this.schedule.get(scheduleId);
    if (!current) return undefined;
    const updated: ScheduleItem = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) };
    this.schedule.set(scheduleId, updated);
    return updated;
  }

  async deleteScheduleItem(scheduleId: ID): Promise<boolean> {
    return this.schedule.delete(scheduleId);
  }

  async listJournal(): Promise<JournalEntry[]> {
    return [...this.journal.values()];
  }

  async getJournalEntry(entryId: ID): Promise<JournalEntry | undefined> {
    return this.journal.get(entryId);
  }

  async createJournalEntry(input: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
    const entry: JournalEntry = { ...input, id: id('journal') };
    this.journal.set(entry.id, entry);
    return entry;
  }

  async updateJournalEntry(entryId: ID, patch: Partial<Omit<JournalEntry, 'id'>>): Promise<JournalEntry | undefined> {
    const current = this.journal.get(entryId);
    if (!current) return undefined;
    const updated: JournalEntry = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) };
    this.journal.set(entryId, updated);
    return updated;
  }

  async deleteJournalEntry(entryId: ID): Promise<boolean> {
    return this.journal.delete(entryId);
  }

  async createImportSuggestion(input: { sourceType: ImportSourceType; label?: string; consent: boolean }): Promise<ImportSuggestion> {
    if (!input.consent) {
      throw new Error('IMPORT_REQUIRES_PARENT_CONSENT');
    }

    const label = input.label ?? input.sourceType;
    return {
      id: id('import'),
      sourceType: input.sourceType,
      summary: `Import request received for ${label}. This backend does not create OCR/AI schedule drafts yet.`,
      proposedScheduleItems: [],
      warnings: [
        'No OCR/AI extraction is wired to this backend demo yet.',
        'Use the mobile guided import flow with pasted text/calendar/text-like files for real demo behavior.',
        'Review all dates, names, custody terms, and medication instructions before saving.'
      ]
    };
  }
}

export function createBackendFromEnv(env = process.env): VaultBackend {
  const mode = env.PARENTVAULT_BACKEND_MODE === 'self-hosted' ? 'self-hosted' : 'cloud';
  return new MemoryVaultBackend({
    mode,
    storage: 'memory',
    pairingEnabled: mode === 'self-hosted'
  });
}
