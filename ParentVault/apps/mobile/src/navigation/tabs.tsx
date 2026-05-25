/**
 * ParentVault tab registry
 *
 * This is the one place to add, remove, rename, or reorder bottom tabs.
 * Each tab points to exactly one screen file in ../screens so future edits are easy to find.
 *
 * Quick guide:
 * - Change the Profiles tab UI: edit ../screens/ProfilesScreen.tsx
 * - Change the Schedule tab UI: edit ../screens/ScheduleScreen.tsx
 * - Change the tab label/order: edit the appTabs array below
 */

import type { ComponentType } from 'react';
import { ChatScreen } from '../screens/ChatScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { ProfilesScreen } from '../screens/ProfilesScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { SecurityScreen } from '../screens/SecurityScreen';

export type TabKey = 'profiles' | 'schedule' | 'chat' | 'import' | 'journal' | 'security';

export interface AppTab {
  /** Internal ID used by navigation state. Keep this stable once data/routes depend on it. */
  key: TabKey;
  /** Human-readable label shown in the bottom tab bar. */
  label: string;
  /** The screen component rendered when this tab is selected. */
  Screen: ComponentType;
}

export const appTabs: AppTab[] = [
  { key: 'profiles', label: 'Profiles', Screen: ProfilesScreen },
  { key: 'schedule', label: 'Schedule', Screen: ScheduleScreen },
  { key: 'chat', label: 'Chat', Screen: ChatScreen },
  { key: 'import', label: 'Import', Screen: ImportScreen },
  { key: 'journal', label: 'Journal', Screen: JournalScreen },
  { key: 'security', label: 'Settings', Screen: SecurityScreen }
];

export const defaultTab: TabKey = 'profiles';
