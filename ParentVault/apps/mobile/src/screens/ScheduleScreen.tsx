/**
 * PARENTVAULT-COMMENTARY
 *
 * Schedule/reminders screen for custody, school, events, therapy, medications, pickup timing, journal prompts, and monthly planning.
 *
 * It previews Nanny-style reminder rules and lets parents schedule local alerts or mark medication as taken.
 *
 * Sensitive reminder notifications should use generic lock-screen text unless a parent explicitly opts into details.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NotificationOffset } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { previewNannyStandingReminders, previewNannyStyleAlerts, scheduleLocalAlerts } from '../services/notifications';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';

const formatOffset = (offset: NotificationOffset) => {
  if (offset === 'day_before') return 'day before';
  if (offset === 'day_of') return 'morning of';
  if (offset === 'hour_before') return 'hour before';
  return `${offset.customMinutesBefore} min before`;
};

export function ScheduleScreen() {
  // Theme/styles first; every color comes from the active light/dark theme.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Store values provide saved schedule items, children, and actions this tab can run.
  const schedule = useVaultStore(s => s.schedule);
  const children = useVaultStore(s => s.children);
  const addScheduleItem = useVaultStore(s => s.addScheduleItem);
  const markMedicationTaken = useVaultStore(s => s.markMedicationTaken);

  // Keeps per-card alert scheduling feedback without changing the saved schedule data.
  const [alertStatus, setAlertStatus] = useState<Record<string, string>>({});

  // Onboarding state for empty schedule view.
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const onboardingTips: string[] = [
    'Try adding your first custody pickup or school run.',
    'Add a therapy appointment or weekly activity reminder.',
    'Import an old calendar or screenshot to extract events.'
  ];

  // Always show events in time order so the parent sees what is coming next first.
  const sortedSchedule = useMemo(
    () => [...schedule].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [schedule]
  );

  const childName = (childId?: string) => children.find(child => child.id === childId)?.displayName || 'All children';

  // Schedules local device notifications for one reviewed item and reports what happened.
  const scheduleAlerts = async (itemId: string) => {
    const item = schedule.find(candidate => candidate.id === itemId);
    if (!item) return;
    const ids = await scheduleLocalAlerts(item);
    setAlertStatus(prev => ({
      ...prev,
      [itemId]: ids.length ? `${ids.length} alert${ids.length === 1 ? '' : 's'} scheduled on this device` : 'No future alerts to schedule'
    }));
  };

  // Render order: reminder rules, empty state, schedule cards, and a quick draft button.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Schedule</Text>
      <Text style={styles.subtitle}>Add custody pick-ups, school runs, meds, appointments, or event reminders in seconds.</Text>
      <Text style={styles.helper}>Tap to create your first event</Text>
      <Card>
        <Text style={styles.name}>Nanny-style notification rules</Text>
        <Text>- Day-before: 7:00 PM</Text>
        <Text>- Day-of: 7:00 AM, or 4:57 AM for early events</Text>
        <Text>- One hour before event start</Text>
        <Text>- Pickup: 3:45 PM on school days, 5:45 PM on no-school days</Text>
        <Text>- Therapy: 8:55 AM planning + 1 hour before</Text>
        <Text>- Journal prompt: 8:45 PM</Text>
        <Text>- Monthly calendar prep: 28th at 7:00 PM</Text>
        <Text style={styles.status}>Standing reminder previews: {previewNannyStandingReminders().map(r => `${r.title} ${new Date(r.firesAt).toLocaleString()}`).join(' | ')}</Text>
      </Card>
      {sortedSchedule.length === 0 && showOnboarding
        ? (
          <Card>
            <View style={styles.nannyRow}>
              <View style={styles.nannyAvatar}><Text style={styles.nannyFace}>NS</Text></View>
              <View style={styles.nannyBubble}>
                <Text style={styles.nannyName}>Nanny Nova</Text>
                <Text style={styles.nannyEyebrow}>Getting started</Text>
                <Text style={styles.nannyTitle}>Let's add your first event draft</Text>
                <Text style={styles.nannyBody}>
                  New parents often need help where to start. Below are suggestions based on typical family routines.
                  Tap "Next tip" for more guidance, or tap anywhere else to hide this guide.
                </Text>
              </View>
            </View>
            <View style={styles.progressDots}>
              <View key="1" style={[styles.dot, styles.activeDot]} />
              <View key="2" style={styles.dot} />
              <View key="3" style={styles.dot} />
            </View>
            <PrimaryButton tone="quiet" onPress={() => setShowOnboarding(false)}>Hide guide</PrimaryButton>
          </Card>
        )
        : null}

      {sortedSchedule.map(item => (
        <Card key={item.id}>
          <View style={styles.row}>
            <Text style={styles.type}>{item.type.toUpperCase()}</Text>
            <Text style={styles.confidence}>{item.confidence ? `${Math.round(item.confidence * 100)}% AI` : 'manual'}</Text>
          </View>
          <View style={styles.onboardingTitle}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {showOnboarding && item.type === 'event' && onboardingStep < 3
              ? <Text style={[styles.tip, styles.tipPosition]}>{onboardingTips[onboardingStep]}</Text>
              : null}
          </View>
          <Text style={styles.meta}>{childName(item.childId)}</Text>
          <Text>{new Date(item.startsAt).toLocaleString()}</Text>
          {item.location ? <Text>{item.location}</Text> : null}
          {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          <Text style={styles.alerts}>Legacy alerts: {item.notificationOffsets.map(formatOffset).join(', ')}</Text>
          <Text style={styles.alerts}>Planned Nanny-style alerts: {previewNannyStyleAlerts(item).map(reminder => `${reminder.kind} ${new Date(reminder.firesAt).toLocaleString()}`).join(' | ') || 'none in future'}</Text>
          {item.type === 'medication' ? (
            item.takenAt ? <Text style={styles.taken}>Taken at {new Date(item.takenAt).toLocaleTimeString()}</Text> : <PrimaryButton onPress={() => markMedicationTaken(item.id)}>Mark as taken</PrimaryButton>
          ) : null}
          <PrimaryButton tone="quiet" onPress={() => scheduleAlerts(item.id)}>Schedule local alerts</PrimaryButton>
          {alertStatus[item.id] ? <Text style={styles.status}>{alertStatus[item.id]}</Text> : null}
        </Card>
      ))}

      <View style={styles.onboardingButtons}>
        {showOnboarding ? (
          <>
            <PrimaryButton tone="quiet" onPress={() => setShowOnboarding(false)}>Hide guide</PrimaryButton>
            <PrimaryButton disabled={onboardingStep === onboardingTips.length - 1}
              onPress={() => setOnboardingStep(step => Math.min(step + 1, onboardingTips.length - 1))}>Next tip</PrimaryButton>
          </>
        ) : null}
      </View>

      <PrimaryButton onPress={() => addScheduleItem({
        type: 'event',
        title: 'New event draft',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notificationOffsets: ['day_before', 'day_of', 'hour_before']
      })}>Add event draft</PrimaryButton>
    </ScrollView>
  );
}

// Screen-specific styles for the Schedule tab only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  helper: { color: theme.primary, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  empty: { color: theme.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  type: { color: theme.primary, fontWeight: '800', fontSize: 12 },
  confidence: { color: theme.subtle, fontSize: 12 },
  name: { fontSize: 19, fontWeight: '800', marginTop: 4, color: theme.text },
  meta: { color: theme.subtle, marginBottom: 4 },
  notes: { color: theme.muted, marginTop: 8 },
  alerts: { color: theme.muted, marginTop: 8 },
  taken: { color: '#15803d', fontWeight: '800', marginTop: 8 },
  status: { color: theme.primary, fontWeight: '700', marginTop: 8 },
  nannyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nannyAvatar: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe', borderWidth: 2, borderColor: '#38bdf8' },
  nannyFace: { fontSize: 36 },
  nannyBubble: { flex: 1, backgroundColor: theme.primarySoft, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: theme.border },
  nannyName: { color: theme.primary, fontWeight: '900', marginBottom: 2 },
  nannyEyebrow: { color: theme.subtle, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  nannyTitle: { color: theme.text, fontWeight: '900', fontSize: 17, marginTop: 4 },
  nannyBody: { color: theme.muted, marginTop: 6, lineHeight: 18 },
  progressDots: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  activeDot: { backgroundColor: theme.primary, width: 18 },
  onboardingTitle: { marginTop: 4 },
  itemTitle: { color: theme.text, fontWeight: '800' },
  onboardingButtons: { marginTop: 12, gap: 8 },
  tip: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  tipPosition: { marginLeft: 8 }
});
