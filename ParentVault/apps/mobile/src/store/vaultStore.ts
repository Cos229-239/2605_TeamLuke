/**
 * PARENTVAULT-COMMENTARY
 *
 * Central Zustand store holding real local child profiles, schedules, journal entries, onboarding state, theme mode, and command handlers.
 *
 * User-entered vault data is persisted locally so the app starts empty, works offline, and grows from the parent's own information.
 *
 * Product rule: core manual mode must not require internet or backend storage. AI/cloud/sync/sharing features should be opt-in adapters.
 *
 * Do not treat AsyncStorage as final secure storage; production must move sensitive data through encrypted local storage before real sensitive use.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { summarizeChildVaultGaps, type ChildProfile, type JournalEntry, type RagAnswer, type ScheduleItem, type SchoolInfo } from '@parentvault/shared';
import { answerFromKnowledge, buildKnowledgeSources } from '../services/knowledge';

const now = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 10);
const ONBOARDING_COMPLETE_KEY = 'parentvault:onboardingComplete';
const THEME_MODE_KEY = 'parentvault:themeMode';
const VAULT_DATA_KEY = 'parentvault:vaultData:v1';
type ThemeMode = 'dark' | 'light';

type VaultData = Pick<VaultState, 'children' | 'schedule' | 'journal'>;

const emptyVaultData: VaultData = { children: [], schedule: [], journal: [] };

const childScopedTerms = [
  'child', 'kid', 'son', 'daughter', 'school', 'teacher', 'grade', 'homework', 'doctor', 'pediatrician', 'dentist',
  'therapist', 'therapy', 'pharmacy', 'med', 'medicine', 'medication', 'dose', 'allergy', 'insurance', 'custody',
  'pickup', 'dropoff', 'drop-off', 'caregiver', 'babysitter', 'daycare', 'appointment', 'journal', 'incident', 'routine',
  'schedule', 'reminder', 'bus', 'practice', 'activity', 'sport', 'camp', 'provider', 'emergency contact'
];

const webLookupTerms = ['search', 'look up', 'lookup', 'find online', 'web', 'website', 'official site', 'calendar', 'hours', 'phone number', 'address'];
const generalAiTerms = ['write code', 'homework answer', 'essay', 'poem', 'story', 'recipe', 'joke', 'stock', 'crypto', 'marketing plan', 'dating', 'game walkthrough'];

const mentionsSavedChild = (text: string, children: ChildProfile[]) => children.some(child => {
  const names = [child.displayName, child.legalName, child.preferredName].filter(Boolean).map(name => name!.toLowerCase());
  return names.some(name => name && text.includes(name));
});

const isChildScopedChat = (text: string, children: ChildProfile[]) => mentionsSavedChild(text, children) || childScopedTerms.some(term => text.includes(term));
const isWebLookupRequest = (text: string) => webLookupTerms.some(term => text.includes(term));
const isClearlyGeneralAiRequest = (text: string) => generalAiTerms.some(term => text.includes(term));

const childOnlyBoundaryMessage = 'That question is outside ParentVault’s scope. I can help with child information, schedules, reminders, journal notes, school/care details, providers, imports, and reviewed child-related lookup.';

const persistVaultData = async (data: VaultData) => {
  await AsyncStorage.setItem(VAULT_DATA_KEY, JSON.stringify(data));
};

const loadVaultData = async (): Promise<VaultData> => {
  const raw = await AsyncStorage.getItem(VAULT_DATA_KEY);
  if (!raw) return emptyVaultData;

  try {
    const parsed = JSON.parse(raw) as Partial<VaultData>;
    return {
      children: Array.isArray(parsed.children) ? parsed.children : [],
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal : []
    };
  } catch {
    return emptyVaultData;
  }
};

export interface VaultState {
  children: ChildProfile[];
  schedule: ScheduleItem[];
  journal: JournalEntry[];
  onboardingLoaded: boolean;
  onboardingCompleted: boolean;
  themeMode: ThemeMode;
  addChild: (child: Omit<ChildProfile, 'id' | 'updatedAt'>) => string;
  updateChild: (childId: string, patch: Partial<Omit<ChildProfile, 'id' | 'updatedAt'>>) => void;
  addScheduleItem: (item: Omit<ScheduleItem, 'id'>) => void;
  updateChildSchool: (childId: string, school: SchoolInfo) => void;
  markMedicationTaken: (scheduleItemId: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  loadOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  askVault: (question: string) => RagAnswer;
  applyChatText: (text: string) => string;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  onboardingLoaded: false,
  onboardingCompleted: false,
  themeMode: 'dark',
  children: [],
  schedule: [],
  journal: [],
  addChild: child => {
    const childId = id();
    set(state => ({ children: [...state.children, { ...child, id: childId, updatedAt: now() }] }));
    void persistVaultData(get());
    return childId;
  },
  updateChild: (childId, patch) => {
    set(state => ({
      children: state.children.map(child => child.id === childId ? { ...child, ...patch, updatedAt: now() } : child)
    }));
    void persistVaultData(get());
  },
  addScheduleItem: item => {
    set(state => ({ schedule: [...state.schedule, { ...item, id: id() }] }));
    void persistVaultData(get());
  },
  updateChildSchool: (childId, school) => {
    set(state => ({
      children: state.children.map(child => child.id === childId ? { ...child, school, updatedAt: now() } : child)
    }));
    void persistVaultData(get());
  },
  markMedicationTaken: scheduleItemId => {
    set(state => ({
      schedule: state.schedule.map(item => item.id === scheduleItemId ? { ...item, takenAt: now() } : item)
    }));
    void persistVaultData(get());
  },
  addJournalEntry: entry => {
    set(state => ({ journal: [...state.journal, { ...entry, id: id() }] }));
    void persistVaultData(get());
  },
  loadOnboardingStatus: async () => {
    const [saved, savedThemeMode, vaultData] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
      AsyncStorage.getItem(THEME_MODE_KEY),
      loadVaultData()
    ]);
    set({
      ...vaultData,
      onboardingLoaded: true,
      onboardingCompleted: saved === 'true' && vaultData.children.length > 0,
      themeMode: savedThemeMode === 'light' ? 'light' : 'dark'
    });
  },
  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    set({ onboardingLoaded: true, onboardingCompleted: true });
  },
  restartOnboarding: async () => {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    set({ onboardingLoaded: true, onboardingCompleted: false });
  },
  setThemeMode: async mode => {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    set({ themeMode: mode });
  },
  askVault: question => {
    const state = get();
    return answerFromKnowledge(question, buildKnowledgeSources(state.children, state.schedule, state.journal));
  },
  applyChatText: text => {
    const lower = text.toLowerCase();
    const state = get();
    const firstChild = state.children[0];
    const childScoped = isChildScopedChat(lower, state.children);

    if (isClearlyGeneralAiRequest(lower) && !childScoped) return childOnlyBoundaryMessage;

    if (isWebLookupRequest(lower)) {
      if (!childScoped) return childOnlyBoundaryMessage;
      return 'I can help look that up for the child. I’ll prioritize official or practical sources like school/district calendars, provider pages, pharmacy details, activity schedules, forms, or care resources, then keep it as a review draft until the parent confirms it.';
    }

    if (!childScoped && !/^(who|what|where|when|which|show|tell|give|find)/i.test(text)) return childOnlyBoundaryMessage;

    if (lower.includes('what am i missing') || lower.includes('what details') || lower.includes('complete profile') || lower.includes('help me fill') || lower.includes('what should i add')) {
      return firstChild ? `Here’s what I’d collect next so the vault is actually useful:\n${summarizeChildVaultGaps(firstChild)}` : 'Add a child profile first, then I can walk you through the missing details.';
    }

    if (/^(who|what|where|when|which|show|tell|give|find)\b/i.test(text) || lower.includes('doctor') || lower.includes('phone number') || lower.includes('insurance') || lower.includes('pharmacy') || lower.includes('fill') || lower.includes('refill')) {
      if (!childScoped) return childOnlyBoundaryMessage;
      const answer = get().askVault(text);
      const sourceList = answer.sources.slice(0, 3).map(source => `• ${source.title}`).join('\n');
      return `${answer.answer}${sourceList ? `\n\nSources:\n${sourceList}` : ''}`;
    }

    if (lower.includes('med') || lower.includes('medicine') || lower.includes('dose')) {
      get().addScheduleItem({
        childId: firstChild?.id,
        type: 'medication',
        title: text.replace(/^add\s*/i, '') || 'Medication reminder',
        startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        notificationOffsets: ['hour_before', { customMinutesBefore: 10 }],
        source: 'text',
        confidence: 0.65,
        notes: 'Created from chat. Review exact time/dosage before relying on this reminder.'
      });
      return 'I drafted a medication reminder one hour from now. Review the time/dosage before relying on it.';
    }

    if (lower.includes('custody') || lower.includes('pickup') || lower.includes('dropoff')) {
      get().addScheduleItem({
        childId: firstChild?.id,
        type: 'custody',
        title: text.replace(/^add\s*/i, '') || 'Custody event',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notificationOffsets: ['day_before', 'hour_before'],
        source: 'text',
        confidence: 0.7,
        notes: 'Created from chat. Confirm dates/times from the source document.'
      });
      return 'I drafted a custody schedule item for tomorrow with day-before and hour-before alerts.';
    }

    const createdAt = now();
    get().addJournalEntry({
      childId: firstChild?.id,
      type: 'general',
      occurredAt: createdAt,
      occurredAtPrecision: 'exact',
      title: 'Chat note',
      notes: text,
      attachments: [],
      tags: ['chat'],
      audit: {
        createdAt,
        updatedAt: createdAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        entryOrder: get().journal.length + 1,
        userSuppliedOccurredAt: false,
        source: 'manual'
      }
    });
    return 'I saved that as a journal note. If it should be a schedule item, mention pickup, custody, school, event, or medication.';
  }
}));
