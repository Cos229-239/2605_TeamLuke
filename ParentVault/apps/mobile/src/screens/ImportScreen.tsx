/**
 * PARENTVAULT-COMMENTARY
 *
 * Guided import/review screen for documents, images, screenshots, PDFs, flyers, custody notes, and pasted text.
 *
 * It treats AI/OCR output as draft suggestions that must be reviewed before saving.
 *
 * Consent, redaction, source retention, and deletion controls are required before real sensitive imports are allowed.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ImportSourceType, ImportSuggestion, SchoolInfo } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { createDocumentImportSuggestion, inferDocumentSourceType, readDocumentAsset } from '../services/documentReader';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';

type GuideKey = 'school' | 'custody' | 'medical' | 'journal';

const guides: Record<GuideKey, { title: string; sourceType: ImportSourceType; helper: string; template: string; next: string[] }> = {
  school: {
    title: 'School details',
    sourceType: 'text',
    helper: 'Use this for school name, phone, website, address, teacher, hours, pickup notes, and no-school dates.',
    template: 'School name:\nDistrict:\nAddress:\nMain phone:\nWebsite:\nSchool hours:\nTeacher:\nPickup instructions:\nImportant dates / no-school days:\nNotes:',
    next: ['School name', 'city/state', 'official website or calendar', 'pickup rules']
  },
  custody: {
    title: 'Custody / exchange note',
    sourceType: 'decree',
    helper: 'Use this for pickup/dropoff times, custody exchanges, holiday notes, or decree snippets.',
    template: 'Custody / exchange title:\nChild:\nDate and time:\nPickup/dropoff location:\nWho has the child:\nReminder needed:\nSource / decree note:\nNotes:',
    next: ['event title', 'date/time', 'location', 'which parent has the child']
  },
  medical: {
    title: 'Medication / appointment',
    sourceType: 'text',
    helper: 'Use this for medication reminders, doctor visits, therapy, dentist, or refill notes.',
    template: 'Medication or appointment:\nChild:\nDate and time:\nDose / instructions:\nProvider / clinic:\nPhone:\nLocation:\nReminder needed:\nNotes:',
    next: ['medication/appointment name', 'date/time', 'dose/instructions', 'provider']
  },
  journal: {
    title: 'Journal / evidence note',
    sourceType: 'text',
    helper: 'Use this for factual notes, conversations, symptoms, incidents, expenses, or school updates.',
    template: 'Journal title:\nChild:\nWhen it happened:\nPeople involved:\nLocation:\nWhat happened, factually:\nPhotos/screenshots attached?\nTags:',
    next: ['what happened', 'when', 'who was involved', 'any attachment/source']
  }
};

const buildReviewGaps = (suggestion: ImportSuggestion) => {
  const gaps = new Set<string>();
  const scheduleItems = suggestion.proposedScheduleItems || [];
  const journalEntries = suggestion.proposedJournalEntries || [];
  const school = suggestion.proposedProfiles?.[0]?.school as Partial<SchoolInfo> | undefined;

  if (!scheduleItems.length && !journalEntries.length && !school) gaps.add('No save-ready draft found yet. Add more source text or upload a clearer document.');

  scheduleItems.forEach(item => {
    if (!item.title) gaps.add('Schedule item title');
    if (!item.startsAt) gaps.add('Schedule date/time');
    if (!item.location) gaps.add('Pickup/dropoff or event location');
    if (item.type === 'medication' && !item.notes) gaps.add('Medication dose or instructions');
  });

  journalEntries.forEach(entry => {
    if (!entry.occurredAt) gaps.add('Journal event date/time');
    if (!entry.notes) gaps.add('Factual journal description');
    if (!entry.peopleInvolved?.length) gaps.add('People involved');
  });

  if (school) {
    if (!school.schoolName) gaps.add('School name');
    if (!school.mainPhone && !school.websiteUrl) gaps.add('School phone or website');
    if (!school.schoolHours) gaps.add('School hours');
    if (!school.pickupInstructions) gaps.add('Pickup instructions');
  }

  return [...gaps];
};

const asSchoolInfo = (school: unknown): SchoolInfo | null => {
  if (!school || typeof school !== 'object') return null;
  const candidate = school as Partial<SchoolInfo>;
  if (!candidate.schoolName) return null;
  return {
    id: candidate.id || `school-${Date.now()}`,
    schoolName: candidate.schoolName,
    districtName: candidate.districtName,
    grade: candidate.grade,
    teacherName: candidate.teacherName,
    mainPhone: candidate.mainPhone,
    attendancePhone: candidate.attendancePhone,
    websiteUrl: candidate.websiteUrl,
    calendarUrl: candidate.calendarUrl,
    address: candidate.address,
    officeHours: candidate.officeHours,
    schoolHours: candidate.schoolHours,
    pickupInstructions: candidate.pickupInstructions,
    busInfo: candidate.busInfo,
    calendarDates: candidate.calendarDates,
    lastEnrichedAt: new Date().toISOString(),
    enrichmentSources: candidate.enrichmentSources,
    notes: candidate.notes
  };
};

export function ImportScreen() {
  // Theme/styles first; this tab owns its own layout rules at the bottom of the file.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Local import state tracks the current draft suggestion, status message, pasted text, and guide type.
  const [suggestion, setSuggestion] = useState<ImportSuggestion | null>(null);
  const [status, setStatus] = useState<string>('');
  const [pastedText, setPastedText] = useState('');
  const [guideKey, setGuideKey] = useState<GuideKey>('school');

  // Store values let reviewed import results become real schedule, journal, or school records.
  const children = useVaultStore(s => s.children);
  const addScheduleItem = useVaultStore(s => s.addScheduleItem);
  const addJournalEntry = useVaultStore(s => s.addJournalEntry);
  const updateChildSchool = useVaultStore(s => s.updateChildSchool);
  const firstChild = children[0];
  const guide = guides[guideKey];

  // Switching guides resets old drafts and pre-fills a practical template for that import type.
  const useGuide = (key: GuideKey) => {
    setGuideKey(key);
    setSuggestion(null);
    setStatus(`Step 2: fill what you know for ${guides[key].title}. Blanks are okay.`);
    setPastedText(current => current.trim() ? current : guides[key].template);
  };

  // Creates a review-only draft from pasted/uploaded content. Nothing saves automatically here.
  const loadSuggestion = async (sourceType: ImportSourceType, label: string, rawText = pastedText) => {
    setStatus('Step 3: extracting a review draft...');
    setSuggestion(await createDocumentImportSuggestion({ sourceType, label, rawText }));
    setStatus('Step 3: review the draft below. Nothing was saved automatically.');
  };

  // Pick an image/screenshot and run the same review-first import flow.
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await loadSuggestion(inferDocumentSourceType(asset.fileName || 'image', asset.mimeType || 'image/*'), asset.fileName || 'selected image');
    }
  };

  // Pick a document. Text/calendar/json can be read locally; PDFs/images still need OCR later.
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/*', 'text/calendar', 'application/json', 'image/*'], copyToCacheDirectory: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      const readResult = await readDocumentAsset(asset);
      const rawText = readResult.text || pastedText;
      setSuggestion(await createDocumentImportSuggestion({ sourceType: readResult.sourceType, label: asset.name, rawText, warnings: readResult.warnings }));
      setStatus(rawText ? 'Step 3: review the document draft below. Nothing was saved automatically.' : 'Could not read text from that file yet. Paste the document text and try again.');
    }
  };

  // Saves only reviewed schedule items that have the minimum useful fields.
  const applyAllScheduleItems = () => {
    const items = suggestion?.proposedScheduleItems || [];
    let savedCount = 0;
    items.forEach(item => {
      if (!item?.title || !item.startsAt || !item.type) return;
      addScheduleItem({
        childId: item.childId || firstChild?.id,
        type: item.type,
        title: item.title,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        location: item.location,
        notes: item.notes,
        notificationOffsets: item.notificationOffsets || ['day_before', 'hour_before'],
        source: item.source || suggestion?.sourceType,
        confidence: item.confidence
      });
      savedCount += 1;
    });
    setSuggestion(null);
    setStatus(savedCount ? `Saved ${savedCount} reviewed schedule item${savedCount === 1 ? '' : 's'}.` : 'Nothing valid to save yet.');
  };

  // Saves reviewed journal drafts and attaches audit metadata for later export/readback.
  const applyJournalEntries = () => {
    const entries = suggestion?.proposedJournalEntries || [];
    entries.forEach((entry, index) => {
      const createdAt = new Date().toISOString();
      addJournalEntry({
        childId: entry.childId || firstChild?.id,
        type: entry.type || 'general',
        occurredAt: entry.occurredAt || createdAt,
        occurredAtPrecision: entry.occurredAtPrecision || 'exact',
        title: entry.title || `Imported note ${index + 1}`,
        notes: entry.notes || '',
        attachments: entry.attachments || [],
        tags: entry.tags || ['import'],
        sourceDocumentIds: entry.sourceDocumentIds,
        audit: { createdAt, updatedAt: createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, entryOrder: index + 1, userSuppliedOccurredAt: false, source: 'document_import' }
      });
    });
    setSuggestion(null);
    setStatus(entries.length ? `Saved ${entries.length} reviewed journal note${entries.length === 1 ? '' : 's'}.` : 'No journal note found to save.');
  };

  // Saves reviewed school details to the first child profile once a real school name exists.
  const applySchoolDetails = () => {
    const school = asSchoolInfo(suggestion?.proposedProfiles?.[0]?.school);
    if (!school || !firstChild) {
      setStatus('No school details found to save yet. Paste school name, phone, website, or address and extract again.');
      return;
    }
    updateChildSchool(firstChild.id, school);
    setSuggestion(null);
    setStatus(`Saved reviewed school details for ${school.schoolName}.`);
  };

  // Button guards: these keep users from saving incomplete or unavailable draft sections.
  const canSaveSchedule = Boolean(suggestion?.proposedScheduleItems?.some(item => item.title && item.startsAt && item.type));
  const canSaveJournal = Boolean(suggestion?.proposedJournalEntries?.length);
  const canSaveSchool = Boolean(suggestion?.proposedProfiles?.[0]?.school && firstChild);
  const reviewGaps = suggestion ? buildReviewGaps(suggestion) : [];

  // Render order: guide picker, input area, upload buttons, review gaps, draft preview, save buttons.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Guided import</Text>
      <Text style={styles.subtitle}>Step-by-step help for adding school details, custody notes, appointments, and journal evidence. Save only after review.</Text>

      <Card>
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.label}>What are you adding?</Text>
        <View style={styles.grid}>
          {(Object.keys(guides) as GuideKey[]).map(key => (
            <PrimaryButton key={key} tone={guideKey === key ? 'primary' : 'quiet'} onPress={() => useGuide(key)}>{guides[key].title}</PrimaryButton>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.label}>{guide.title}</Text>
        <Text style={styles.helper}>{guide.helper}</Text>
        <Text style={styles.miniLabel}>Try to include</Text>
        <Text style={styles.chips}>{guide.next.join('  |  ')}</Text>
        <TextInput
          value={pastedText}
          onChangeText={setPastedText}
          placeholder="Fill in the guide or paste copied text here."
          multiline
          style={styles.textArea}
          textAlignVertical="top"
        />
        <PrimaryButton onPress={() => loadSuggestion(guide.sourceType, `${guide.title} guide`, pastedText)} disabled={!pastedText.trim()}>Extract and preview</PrimaryButton>
        <PrimaryButton tone="quiet" onPress={() => setPastedText(guide.template)}>Reset to guide template</PrimaryButton>
      </Card>

      <Card>
        <Text style={styles.label}>Or upload something</Text>
        <PrimaryButton onPress={pickImage}>Choose image or screenshot</PrimaryButton>
        <PrimaryButton tone="quiet" onPress={pickDocument}>Choose PDF/text/calendar/document</PrimaryButton>
        <Text style={styles.helper}>Tip: text/calendar files work best right now. For PDFs or screenshots, paste the visible text above too until OCR is added.</Text>
      </Card>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {suggestion ? (
        <Card>
          <View style={styles.row}>
            <Text style={styles.step}>Step 3 of 3</Text>
            <Text style={styles.source}>{suggestion.sourceType}</Text>
          </View>
          <Text style={styles.label}>Review before saving</Text>
          <Text>{suggestion.summary}</Text>
          <Text style={styles.checklist}>Check names, dates, times, source, location, medication dose, and reminder timing.</Text>
          <View style={styles.gapBox}>
            <Text style={styles.gapTitle}>Evidence gaps to review</Text>
            {reviewGaps.length ? reviewGaps.map(gap => <Text key={gap} style={styles.gapItem}>- {gap}</Text>) : <Text style={styles.gapClear}>Looks complete enough for first review.</Text>}
          </View>

          {suggestion.proposedProfiles?.[0]?.school ? (
            <View style={styles.proposalBox}>
              <Text style={styles.proposal}>School details</Text>
              <Text>{asSchoolInfo(suggestion.proposedProfiles[0].school)?.schoolName}</Text>
              {asSchoolInfo(suggestion.proposedProfiles[0].school)?.mainPhone ? <Text>{asSchoolInfo(suggestion.proposedProfiles[0].school)?.mainPhone}</Text> : null}
              {asSchoolInfo(suggestion.proposedProfiles[0].school)?.websiteUrl ? <Text>{asSchoolInfo(suggestion.proposedProfiles[0].school)?.websiteUrl}</Text> : null}
              <PrimaryButton tone="quiet" onPress={applySchoolDetails} disabled={!canSaveSchool}>Save reviewed school details</PrimaryButton>
            </View>
          ) : null}

          {suggestion.proposedScheduleItems?.map((item, index) => (
            <View key={index} style={styles.proposalBox}>
              <Text style={styles.proposal}>Schedule draft</Text>
              <Text>- {item.title || 'Untitled item'}</Text>
              <Text>{item.type || 'event'}</Text>
              <Text>{item.startsAt ? new Date(item.startsAt).toLocaleString() : 'No time'}</Text>
              {item.location ? <Text>{item.location}</Text> : null}
              <Text style={styles.confidence}>{item.confidence ? `${Math.round(item.confidence * 100)}% confidence` : 'No confidence score'}</Text>
            </View>
          ))}

          {suggestion.proposedJournalEntries?.map((entry, index) => (
            <View key={`journal-${index}`} style={styles.proposalBox}>
              <Text style={styles.proposal}>Journal note</Text>
              <Text>{entry.title}</Text>
              <Text numberOfLines={6} style={styles.helper}>{entry.notes}</Text>
            </View>
          ))}

          {suggestion.warnings.map(warning => <Text key={warning} style={styles.warning}>Warning: {warning}</Text>)}
          <PrimaryButton onPress={applyAllScheduleItems} disabled={!canSaveSchedule}>Save schedule draft</PrimaryButton>
          <PrimaryButton tone="quiet" onPress={applyJournalEntries} disabled={!canSaveJournal}>Save journal note</PrimaryButton>
        </Card>
      ) : null}
    </ScrollView>
  );
}

// Screen-specific styles for the Import tab only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  step: { color: theme.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  label: { fontSize: 18, fontWeight: '800', marginBottom: 8, color: theme.text },
  miniLabel: { marginTop: 10, color: theme.muted, fontWeight: '800' },
  helper: { color: theme.subtle, marginTop: 8 },
  chips: { color: theme.primary, backgroundColor: theme.primarySoft, borderRadius: 12, padding: 10, marginTop: 6, marginBottom: 10, fontWeight: '700' },
  grid: { gap: 4 },
  textArea: { minHeight: 190, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 14, padding: 12, backgroundColor: theme.input, color: theme.text },
  status: { color: theme.primary, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  source: { color: theme.subtle, fontWeight: '700' },
  checklist: { backgroundColor: theme.primarySoft, color: theme.primary, borderRadius: 12, padding: 10, marginTop: 12 },
  gapBox: { backgroundColor: theme.input, borderColor: theme.inputBorder, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  gapTitle: { color: theme.text, fontWeight: '800', marginBottom: 4 },
  gapItem: { color: theme.muted, marginTop: 2 },
  gapClear: { color: '#15803d', fontWeight: '700' },
  proposalBox: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 12, paddingTop: 12 },
  proposal: { fontWeight: '800', color: theme.text, marginBottom: 4 },
  confidence: { color: theme.subtle, marginTop: 4 },
  warning: { color: '#b45309', marginTop: 8 }
});

