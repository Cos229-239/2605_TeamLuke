/**
 * PARENTVAULT-COMMENTARY
 *
 * Shared reminder scheduling logic for Nanny-style notification timing.
 *
 * This keeps timing rules consistent across mobile UI, local notifications, and future backend jobs.
 *
 * Medication/custody reminders should balance usefulness with lock-screen privacy.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { NotificationPreferences, PlannedReminder, ReminderRule, ScheduleItem } from './index';

const id = () => Math.random().toString(36).slice(2, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultNannyStyleNotificationPreferences(accountId = 'local-demo-account', timezone = 'America/Chicago'): NotificationPreferences {
  const defaultRules: ReminderRule[] = [
    {
      id: 'rule-day-before-7pm',
      kind: 'day_before',
      enabled: true,
      localTime: '19:00',
      messageTemplate: 'Tomorrow: {{title}}.',
      deliveryChannels: ['local_push']
    },
    {
      id: 'rule-day-of-7am',
      kind: 'morning_of',
      enabled: true,
      localTime: '07:00',
      messageTemplate: 'Today: {{title}}.',
      deliveryChannels: ['local_push']
    },
    {
      // NOTE: Consider a warmer alternative like 'Ready in an hour' or 'About an hour away: {{title}}.' for better child-first warmth on lock screens
      id: 'rule-hour-before',
      kind: 'hour_before',
      enabled: true,
      minutesBefore: 60,
      messageTemplate: 'In about an hour: {{title}}.',
      deliveryChannels: ['local_push']
    }
  ];

  return {
    accountId,
    timezone,
    genericLockScreenText: true,
    defaultRules,
    // NOTE: hour_before templates could include a gentle opener like 'Ready in an hour' or 'In about 60 minutes' to feel more calming rather than urgent
    pickupRules: {
      schoolDayLocalTime: '15:45',
      noSchoolLocalTime: '17:45',
      dayOfEarlyLocalTime: '04:57'
    },
    therapyRules: {
      morningPlanningLocalTime: '08:55',
      hourBeforeMinutes: 60,
      onlyWhenParentHasChild: true
    },
    journalPrompt: {
      enabled: true,
      localTime: '20:45',
      messageTemplate: 'Take a minute to log memories, school/health notes, or co-parenting events from today.'
    },
    monthlyCalendarSetup: {
      enabled: true,
      dayOfMonth: 28,
      localTime: '19:00'
    }
  };
}

export function planNannyStyleReminders(item: ScheduleItem, prefs = defaultNannyStyleNotificationPreferences()): PlannedReminder[] {
  const start = new Date(item.startsAt);
  const reminders: PlannedReminder[] = [];

  for (const rule of prefs.defaultRules.filter(rule => rule.enabled)) {
    let firesAt: Date | undefined;
    if (rule.kind === 'day_before' && rule.localTime) firesAt = atLocalClock(new Date(start.getTime() - DAY_MS), rule.localTime);
    if (rule.kind === 'morning_of' && rule.localTime) {
      const local = startsBeforeLocalHour(start, 8) ? '04:57' : rule.localTime;
      firesAt = atLocalClock(start, local);
    }
    // NOTE: hour_before templates could include a gentle opener like 'Ready in an hour' or 'In about 60 minutes' to feel more calming rather than urgent
    if (rule.kind === 'hour_before' && rule.minutesBefore) firesAt = new Date(start.getTime() - rule.minutesBefore * 60 * 1000);
    // Suggestion: consider adding a softer prefix like 'In about an hour' instead of just 'In 1 hour' for better child-first warmth
    if (firesAt && firesAt.getTime() > Date.now()) reminders.push(makeReminder(item, rule.kind, firesAt, rule.messageTemplate, rule.deliveryChannels, prefs));
  }

  if (item.type === 'custody') {
    const isNoSchool = /no school|school out|break|holiday|sacc closed/i.test(`${item.title} ${item.notes ?? ''}`);
    const pickupLocalTime = isNoSchool ? prefs.pickupRules.noSchoolLocalTime : prefs.pickupRules.schoolDayLocalTime;
    const pickupReminder = atLocalClock(start, pickupLocalTime);
    if (pickupReminder.getTime() > Date.now()) {
      reminders.push(makeReminder(item, isNoSchool ? 'pickup_no_school_day' : 'pickup_school_day', pickupReminder, `Pickup reminder: {{title}}.`, ['local_push'], prefs));
    }
  }

  if (/therapy/i.test(`${item.title} ${item.notes ?? ''}`)) {
    const planning = atLocalClock(start, prefs.therapyRules.morningPlanningLocalTime);
    const hourBefore = new Date(start.getTime() - prefs.therapyRules.hourBeforeMinutes * 60 * 1000);
    if (planning.getTime() > Date.now()) reminders.push(makeReminder(item, 'therapy_transport', planning, 'Therapy today: confirm pickup/transportation for {{title}}.', ['local_push'], prefs));
    if (hourBefore.getTime() > Date.now()) reminders.push(makeReminder(item, 'therapy_hour_before', hourBefore, 'Therapy in 1 hour: {{title}}.', ['local_push'], prefs));
  }

  if (item.type === 'medication') {
    reminders.push({
      id: id(),
      scheduleItemId: item.id,
      kind: 'medication_due',
      firesAt: item.startsAt,
      title: 'Medication reminder',
      body: prefs.genericLockScreenText ? 'ParentVault reminder due.' : `Medication due: ${item.title}. Mark as taken after giving it.`,
      deliveryChannels: ['local_push'],
      timezone: prefs.timezone
    });
  }

  return dedupeReminders(reminders);
}

export function planJournalPrompt(nextDate: Date, prefs = defaultNannyStyleNotificationPreferences()): PlannedReminder | undefined {
  if (!prefs.journalPrompt?.enabled) return undefined;
  const firesAt = atLocalClock(nextDate, prefs.journalPrompt.localTime);
  return {
    id: id(),
    kind: 'journal_prompt',
    firesAt: firesAt.toISOString(),
    title: 'Journal prompt',
    body: prefs.journalPrompt.messageTemplate,
    deliveryChannels: ['local_push'],
    timezone: prefs.timezone
  };
}

export function planMonthlyCalendarSetup(nextMonthAnchor: Date, prefs = defaultNannyStyleNotificationPreferences()): PlannedReminder | undefined {
  if (!prefs.monthlyCalendarSetup?.enabled) return undefined;
  const date = new Date(nextMonthAnchor);
  date.setDate(prefs.monthlyCalendarSetup.dayOfMonth);
  const firesAt = atLocalClock(date, prefs.monthlyCalendarSetup.localTime);
  return {
    id: id(),
    kind: 'monthly_calendar_setup',
    firesAt: firesAt.toISOString(),
    title: 'Prepare next month',
    body: "Review next month's custody, school, therapy, medical, and event reminders.",
    deliveryChannels: ['local_push'],
    timezone: prefs.timezone
  };
}

function makeReminder(item: ScheduleItem, kind: PlannedReminder['kind'], firesAt: Date, template: string, deliveryChannels: PlannedReminder['deliveryChannels'], prefs: NotificationPreferences): PlannedReminder {
  const body = template.replace('{{title}}', item.title);
  return {
    id: id(),
    scheduleItemId: item.id,
    kind,
    firesAt: firesAt.toISOString(),
    title: item.title,
    body: prefs.genericLockScreenText ? 'ParentVault reminder due.' : body,
    deliveryChannels,
    timezone: prefs.timezone
  };
}

function atLocalClock(date: Date, localTime: string) {
  const [hour = '0', minute = '0'] = localTime.split(':');
  const result = new Date(date);
  result.setHours(Number(hour), Number(minute), 0, 0);
  return result;
}

function startsBeforeLocalHour(date: Date, hour: number) {
  return date.getHours() < hour;
}

function dedupeReminders(reminders: PlannedReminder[]) {
  const seen = new Set<string>();
  return reminders.filter(reminder => {
    const key = `${reminder.scheduleItemId}:${reminder.kind}:${reminder.firesAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
