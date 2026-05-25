/**
 * PARENTVAULT-COMMENTARY
 *
 * Evidence-minded journal screen for factual notes, medical logs, custody events, school updates, communication records, and attachments.
 *
 * It encourages neutral wording and stores metadata needed for later export.
 *
 * Production journal/media storage must protect attachment URIs and avoid logging sensitive plaintext.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { JournalEntryType } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { buildJournalExportManifest, makeDefaultJournalExportRequest } from '../services/journalExport';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';

const entryTypes: JournalEntryType[] = ['general', 'medical', 'custody', 'school', 'communication', 'behavior', 'expense', 'appointment', 'medication', 'other'];
const id = () => Math.random().toString(36).slice(2, 10);
const subjectiveTerms = ['always', 'never', 'clearly', 'obviously', 'refused', 'lied', 'crazy', 'lazy', 'bad parent', 'dangerous'];

const buildNeutralityChecklist = (input: { note: string; title: string; people: string; location: string; occurredAt: string }) => {
  const text = `${input.title} ${input.note}`.toLowerCase();
  const flags = subjectiveTerms.filter(term => text.includes(term));
  const missing = [
    input.occurredAt.trim() ? null : 'event date/time',
    input.people.trim() ? null : 'people involved',
    input.location.trim() ? null : 'location',
    input.note.trim().length >= 20 ? null : 'a factual description'
  ].filter(Boolean);

  const suggestions = [
    flags.length ? `Review loaded words: ${flags.join(', ')}. Swap in exact words, actions, or observable facts where possible.` : 'Tone check: no common loaded words found.',
    missing.length ? `Add missing evidence basics: ${missing.join(', ')}.` : 'Evidence basics present: when, who, where, and what.',
    'Keep opinions separate from facts, and quote exact messages when you have them.'
  ];

  return `Neutrality checklist:\n• ${suggestions.join('\n• ')}`;
};

export function JournalScreen() {
  // Theme/styles first; the Journal tab owns its own layout rules at the bottom of this file.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Store values are the saved journal entries and the action used to add a new one.
  const journal = useVaultStore(s => s.journal);
  const children = useVaultStore(s => s.children);
  const addJournalEntry = useVaultStore(s => s.addJournalEntry);

  // Local form state is temporary until the parent presses Save or attaches media.
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [entryType, setEntryType] = useState<JournalEntryType>('general');
  const [people, setPeople] = useState('');
  const [location, setLocation] = useState('');
  const [exportText, setExportText] = useState('');
  const [formStatus, setFormStatus] = useState('');

  // Show newest events first. If two entries have the same event time, audit order breaks the tie.
  const sortedJournal = useMemo(
    () => [...journal].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.audit.entryOrder - a.audit.entryOrder),
    [journal]
  );

  // Adds a manual entry and optionally attaches a camera/library image with basic metadata.
  const addNote = async (withPhoto = false, fromCamera = false) => {
    setFormStatus('');
    const hasText = Boolean(title.trim() || note.trim() || people.trim() || location.trim());
    if (!hasText && !withPhoto) {
      setFormStatus('Add a title, note, person, location, or attachment before saving.');
      return;
    }

    const importedAt = new Date().toISOString();
    let uri: string | undefined;
    let filename: string | undefined;
    if (withPhoto) {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, exif: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, exif: true });
      if (!result.canceled) {
        uri = result.assets[0].uri;
        filename = result.assets[0].fileName ?? undefined;
      } else if (!hasText) {
        setFormStatus('No journal entry saved because no attachment was selected.');
        return;
      }
    }

    const parsedOccurredAt = occurredAt ? new Date(occurredAt) : null;
    if (parsedOccurredAt && Number.isNaN(parsedOccurredAt.getTime())) {
      setFormStatus('Use a valid event date/time, like 2026-05-12T14:30.');
      return;
    }

    const eventDate = parsedOccurredAt ? parsedOccurredAt.toISOString() : importedAt;
    addJournalEntry({
      childId: children[0]?.id,
      type: entryType,
      occurredAt: eventDate,
      occurredAtPrecision: occurredAt ? 'exact' : 'unknown',
      title: title.trim() || note.slice(0, 40) || `${entryType} journal entry`,
      notes: note || (uri ? 'Photo/screenshot added. Add context before relying on this record.' : ''),
      peopleInvolved: people.split(',').map(item => item.trim()).filter(Boolean),
      location: location.trim() || undefined,
      attachments: uri ? [{
        id: id(),
        kind: fromCamera ? 'photo' : 'screenshot',
        uri,
        filename,
        importedAt,
        capturedAt: importedAt,
        captureMethod: fromCamera ? 'camera' : 'photo_library',
        originalMetadata: {},
        redacted: false,
        notes: 'Original metadata should be preserved/encrypted in production export.'
      }] : [],
      tags: [entryType],
      audit: {
        createdAt: importedAt,
        updatedAt: importedAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        entryOrder: journal.length + 1,
        userSuppliedOccurredAt: Boolean(occurredAt),
        source: fromCamera ? 'camera' : withPhoto ? 'document_import' : 'manual'
      }
    });
    setNote('');
    setTitle('');
    setPeople('');
    setLocation('');
    setFormStatus('Journal entry saved.');
  };

  // Builds a safe preview of what a future export package would contain.
  const previewExport = () => {
    const request = makeDefaultJournalExportRequest(children[0]?.id);
    const manifest = buildJournalExportManifest(journal, request);
    setExportText(`Export preview: ${manifest.entryCount} entries, ${manifest.attachmentCount} attachments. Format: ${manifest.format.toUpperCase()}. Includes event date, input timestamp, audit metadata, and attachment IDs.`);
  };

  // Checks the draft for missing evidence basics and loaded wording before saving.
  const reviewNeutrality = () => {
    setFormStatus(buildNeutralityChecklist({ note, title, people, location, occurredAt }));
  };

  // Render order: entry form, export preview, then saved journal cards.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>Document anything: medical events, custody issues, school notes, behavior, expenses, photos, screenshots, and text evidence. Event date and input metadata are kept separately.</Text>
      <Card>
        <Text style={styles.label}>Entry type</Text>
        <View style={styles.typeGrid}>
          {entryTypes.map(type => <PrimaryButton key={type} tone={entryType === type ? 'primary' : 'quiet'} onPress={() => setEntryType(type)}>{type}</PrimaryButton>)}
        </View>
        <Text style={styles.label}>Event date/time</Text>
        <Text style={styles.help}>Use when the event actually happened. The app also stores when you entered it.</Text>
        <TextInput value={occurredAt} onChangeText={setOccurredAt} placeholder="YYYY-MM-DDTHH:mm" style={styles.smallInput} />
        <TextInput value={title} onChangeText={setTitle} placeholder="Title" style={styles.smallInput} />
        <TextInput value={people} onChangeText={setPeople} placeholder="People involved, comma-separated" style={styles.smallInput} />
        <TextInput value={location} onChangeText={setLocation} placeholder="Location" style={styles.smallInput} />
        <TextInput value={note} onChangeText={setNote} placeholder="What happened? Add context, exact words, symptoms, medication details, or why this matters." style={styles.input} multiline />
        <PrimaryButton tone="quiet" onPress={reviewNeutrality}>Check neutral wording</PrimaryButton>
        <PrimaryButton onPress={() => addNote(false)}>Save journal entry</PrimaryButton>
        <PrimaryButton tone="quiet" onPress={() => addNote(true, false)}>Attach photo/screenshot</PrimaryButton>
        <PrimaryButton tone="quiet" onPress={() => addNote(true, true)}>Take picture and save</PrimaryButton>
        {formStatus ? <Text style={styles.formStatus}>{formStatus}</Text> : null}
      </Card>
      <Card>
        <Text style={styles.label}>Export journal</Text>
        <Text style={styles.help}>Production export should create a ZIP/PDF package with entries in event-date order, photos/screenshots/documents, metadata, hashes, and an export manifest.</Text>
        <PrimaryButton onPress={previewExport}>Preview export package</PrimaryButton>
        {exportText ? <Text style={styles.attachment}>{exportText}</Text> : null}
      </Card>
      {sortedJournal.map(entry => (
        <Card key={entry.id}>
          <Text style={styles.entryType}>{entry.type.toUpperCase()}</Text>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <Text style={styles.date}>Event: {new Date(entry.occurredAt).toLocaleString()} ({entry.occurredAtPrecision})</Text>
          <Text style={styles.date}>Entered: {new Date(entry.audit.createdAt).toLocaleString()} - Order #{entry.audit.entryOrder}</Text>
          {entry.peopleInvolved?.length ? <Text>People: {entry.peopleInvolved.join(', ')}</Text> : null}
          {entry.location ? <Text>Location: {entry.location}</Text> : null}
          <Text>{entry.notes}</Text>
          {entry.attachments.length ? <Text style={styles.attachment}>{entry.attachments.length} attachment(s): {entry.attachments.map(a => `${a.kind} imported ${new Date(a.importedAt).toLocaleString()}`).join('; ')}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  );
}

// Screen-specific styles for the Journal tab only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  label: { fontWeight: '800', color: theme.text, marginTop: 8 },
  help: { color: theme.subtle, marginBottom: 6 },
  input: { minHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: theme.inputBorder, padding: 12, backgroundColor: theme.input, marginTop: 8 },
  smallInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, padding: 10, backgroundColor: theme.input, marginTop: 8 },
  typeGrid: { gap: 4 },
  entryType: { color: theme.primary, fontWeight: '900', fontSize: 12 },
  entryTitle: { fontSize: 18, fontWeight: '800' },
  date: { color: theme.subtle, marginBottom: 4 },
  attachment: { marginTop: 8, color: theme.primary, fontWeight: '700' },
  formStatus: { marginTop: 8, color: theme.primary, fontWeight: '700' }
});

