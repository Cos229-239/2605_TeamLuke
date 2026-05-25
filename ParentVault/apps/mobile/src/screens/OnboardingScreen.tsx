/**
 * PARENTVAULT-COMMENTARY
 *
 * Friendly setup guide for introducing privacy choices and collecting optional child, school, medical/care, custody, and journal details.
 *
 * The onboarding philosophy is skippable and calm: parents can start useful without entering every sensitive category.
 *
 * Keep copy practical and reassuring; this screen sets the trust tone for the whole app.
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
import type { ImportSourceType } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { createDocumentImportSuggestion, inferDocumentSourceType, readDocumentAsset } from '../services/documentReader';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';
import { draftFromChild, id, splitList } from './onboarding/onboardingHelpers';
import { steps } from './onboarding/onboardingSteps';
import type { SetupDraft } from './onboarding/onboardingTypes';

export function OnboardingScreen() {
  // Theme/styles first; onboarding owns a lot of explanatory UI.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Store values/actions save the reviewed setup draft and unlock the main app tabs.
  const children = useVaultStore(state => state.children);
  const addChild = useVaultStore(state => state.addChild);
  const updateChild = useVaultStore(state => state.updateChild);
  const addJournalEntry = useVaultStore(state => state.addJournalEntry);
  const completeOnboarding = useVaultStore(state => state.completeOnboarding);
  const firstChild = children[0];

  // Local state holds wizard progress, draft form fields, pasted text, and helper feedback.
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<SetupDraft>(() => draftFromChild(firstChild));
  const [pasteText, setPasteText] = useState('');
  const [assistantNote, setAssistantNote] = useState('Nanny Bot is ready. Add what you know, skip anything, or skip the guide entirely and come back later.');
  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  // Update one field in the onboarding draft without replacing the whole form object by hand.
  const setField = (key: keyof SetupDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));

  // Convert the current draft into ParentVault's child-profile shape and save/update the profile.
  const saveDraft = () => {
    const medicationLines = splitList(draft.medications);
    const providerName = draft.providerName.trim();
    const pharmacyName = draft.pharmacyName.trim();
    const emergencyName = draft.emergencyContactName.trim();
    const customInfoTitle = draft.customInfoTitle.trim();
    const customInfoValue = draft.customInfoValue.trim();
    const customInfo = [...(firstChild?.customInfo ?? [])];
    if (customInfoTitle || customInfoValue) {
      const existingIndex = customInfo.findIndex(item => item.title.toLowerCase() === customInfoTitle.toLowerCase());
      const savedAt = new Date().toISOString();
      const customInfoItem = {
        id: existingIndex >= 0 ? customInfo[existingIndex].id : id('custom'),
        title: customInfoTitle || 'Other information',
        value: customInfoValue || 'Not filled in yet',
        createdAt: existingIndex >= 0 ? customInfo[existingIndex].createdAt : savedAt,
        updatedAt: savedAt
      };
      if (existingIndex >= 0) customInfo[existingIndex] = customInfoItem;
      else customInfo.push(customInfoItem);
    }
    const childPatch = {
      displayName: draft.childName.trim() || draft.preferredName.trim() || 'My Child',
      legalName: draft.legalName.trim() || undefined,
      preferredName: draft.preferredName.trim() || undefined,
      birthdate: draft.birthdate.trim() || undefined,
      medical: {
        allergies: splitList(draft.allergies),
        conditions: splitList(draft.conditions),
        dietaryRestrictions: firstChild?.medical.dietaryRestrictions ?? [],
        sensoryNeeds: firstChild?.medical.sensoryNeeds ?? [],
        careInstructions: draft.careInstructions.trim() || undefined,
        medications: medicationLines.map((line, index) => ({
          id: firstChild?.medical.medications[index]?.id ?? id('med'),
          name: line.split(' - ')[0]?.trim() || line,
          dosage: line.split(' - ')[1]?.trim(),
          scheduleText: line.split(' - ')[2]?.trim(),
          active: true
        }))
      },
      careProviders: [
        ...(providerName ? [{ id: firstChild?.careProviders[0]?.id ?? id('provider'), type: 'pediatrician' as const, personName: providerName, phone: draft.providerPhone.trim() || undefined, updatedAt: new Date().toISOString() }] : []),
        ...(pharmacyName ? [{ id: firstChild?.careProviders.find(provider => provider.type === 'pharmacy')?.id ?? id('pharmacy'), type: 'pharmacy' as const, personName: 'Pharmacist on duty', organizationName: pharmacyName, preferredForRefills: true, updatedAt: new Date().toISOString() }] : [])
      ],
      contacts: emergencyName ? [{ id: firstChild?.contacts[0]?.id ?? id('contact'), name: emergencyName, relationship: 'Emergency contact', phone: draft.emergencyContactPhone.trim() || undefined, allowedPickup: true }] : [],
      insurance: draft.insuranceProvider.trim() ? [{ id: firstChild?.insurance[0]?.id ?? id('insurance'), providerName: draft.insuranceProvider.trim(), notes: 'Added during Nanny Bot onboarding. Review member details before relying on it.' }] : [],
      school: draft.schoolName.trim() ? {
        id: firstChild?.school?.id ?? id('school'),
        schoolName: draft.schoolName.trim(),
        grade: draft.grade.trim() || undefined,
        teacherName: draft.teacherName.trim() || undefined,
        mainPhone: draft.schoolPhone.trim() || undefined,
        websiteUrl: draft.schoolWebsite.trim() || undefined,
        pickupInstructions: draft.pickupInstructions.trim() || undefined,
        notes: 'Added during Nanny Bot onboarding. Confirm official school details.'
      } : undefined,
      legalCustody: (draft.custodySummary.trim() || draft.exchangeRules.trim()) ? {
        id: firstChild?.legalCustody?.id ?? id('custody'),
        custodySummary: draft.custodySummary.trim() || undefined,
        exchangeRules: draft.exchangeRules.trim() || undefined,
        sourceDocumentIds: firstChild?.legalCustody?.sourceDocumentIds ?? [],
        notes: 'Added during Nanny Bot onboarding. Review against the legal order.'
      } : undefined,
      customInfo,
      notes: firstChild?.notes
    };

    const savedChildId = firstChild ? firstChild.id : addChild(childPatch);
    if (firstChild) updateChild(firstChild.id, childPatch);

    if (draft.journalNote.trim()) {
      const createdAt = new Date().toISOString();
      addJournalEntry({
        childId: savedChildId,
        type: 'general',
        occurredAt: createdAt,
        occurredAtPrecision: 'exact',
        title: 'Onboarding note',
        notes: draft.journalNote.trim(),
        attachments: [],
        tags: ['onboarding'],
        audit: { createdAt, updatedAt: createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, entryOrder: 1, userSuppliedOccurredAt: false, source: 'manual' }
      });
    }
  };

  // Final step: save the reviewed draft, then mark onboarding complete so tabs appear.
  const completeSetup = () => {
    saveDraft();
    completeOnboarding();
  };

  // Creates a review-only draft from pasted/uploaded material and fills matching fields.
  const applyImportText = async (sourceType: ImportSourceType, label: string, rawText = pasteText) => {
    const cleanText = rawText.trim();
    const suggestion = await createDocumentImportSuggestion({ sourceType, label, rawText: cleanText });
    const profile = suggestion.proposedProfiles?.[0];
    const school = profile?.school;
    if (profile?.displayName && !draft.childName.trim()) setField('childName', profile.displayName);
    if (school?.schoolName) setField('schoolName', school.schoolName);
    if (school?.mainPhone) setField('schoolPhone', school.mainPhone);
    if (school?.websiteUrl) setField('schoolWebsite', school.websiteUrl);

    if (cleanText && step.key === 'medical' && !draft.medications.trim()) {
      const medDraft = suggestion.proposedScheduleItems?.find(item => item.type === 'medication')?.title;
      if (medDraft) setField('medications', medDraft);
    }
    if (cleanText && step.key === 'custody' && !draft.custodySummary.trim()) {
      setField('custodySummary', cleanText.slice(0, 900));
    }
    if (cleanText && step.key === 'journal' && !draft.journalNote.trim()) {
      setField('journalNote', cleanText.slice(0, 1200));
    }

    setAssistantNote(cleanText ? `I drafted fields from ${label}. Nothing from this upload was auto-saved; review the filled-in text before continuing.` : `I can remember that ${label} was selected, but paste the visible text too for better extraction.`);
  };

  // Pick an image/screenshot during onboarding and send it through the same review-first flow.
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await applyImportText(inferDocumentSourceType(asset.fileName || 'image', asset.mimeType || 'image/*'), asset.fileName || `${step.label} image`, pasteText);
    }
  };

  // Pick a document during onboarding. Text-like files can be read locally; PDFs/images need OCR later.
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/*', 'text/calendar', 'application/json', 'image/*'], copyToCacheDirectory: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      const readResult = await readDocumentAsset(asset);
      const rawText = readResult.text || pasteText;
      await applyImportText(readResult.sourceType, asset.name, rawText);
    }
  };

  // Render order: guide card, step dots, current step form, import helper, navigation buttons.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>ParentVault setup</Text>
      <Text style={styles.subtitle}>Nanny Bot will walk you through the child profile, school, care, custody, and journal basics.</Text>

      <Card>
        <View style={styles.nannyRow}>
          <View style={styles.nannyAvatar}><Text style={styles.nannyFace}>NB</Text></View>
          <View style={styles.nannyBubble}>
            <Text style={styles.nannyName}>Nanny Bot</Text>
            <Text style={styles.progressText}>{stepIndex + 1} of {steps.length} - {progress}%</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepMessage}>{step.message}</Text>
          </View>
        </View>
        <View style={styles.progressRail}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        <Text style={styles.assistantNote}>{assistantNote}</Text>
      </Card>

      <View style={styles.stepTabs}>
        {steps.map((item, index) => <View key={item.key} style={[styles.stepDot, index <= stepIndex && styles.stepDotActive]}><Text style={[styles.stepDotText, index <= stepIndex && styles.stepDotTextActive]}>{index + 1}</Text></View>)}
      </View>

      {step.key === 'basics' ? (
        <Card>
          <Text style={styles.section}>Child basics</Text>
          <TextInput value={draft.childName} onChangeText={value => setField('childName', value)} placeholder="Child display name" style={styles.input} />
          <TextInput value={draft.legalName} onChangeText={value => setField('legalName', value)} placeholder="Legal name" style={styles.input} />
          <TextInput value={draft.preferredName} onChangeText={value => setField('preferredName', value)} placeholder="Preferred name / nickname" style={styles.input} />
          <TextInput value={draft.birthdate} onChangeText={value => setField('birthdate', value)} placeholder="Birthdate" style={styles.input} />
          <Text style={styles.help}>Need to save something that does not fit the standard slots? Add a custom title and details here.</Text>
          <TextInput value={draft.customInfoTitle} onChangeText={value => setField('customInfoTitle', value)} placeholder="Custom title, like Bus route or Comfort item" style={styles.input} />
          <TextInput value={draft.customInfoValue} onChangeText={value => setField('customInfoValue', value)} placeholder="Details for that custom information" multiline style={styles.textArea} />
        </Card>
      ) : null}

      {step.key === 'school' ? (
        <Card>
          <Text style={styles.section}>School details</Text>
          <TextInput value={draft.schoolName} onChangeText={value => setField('schoolName', value)} placeholder="School name" style={styles.input} />
          <TextInput value={draft.grade} onChangeText={value => setField('grade', value)} placeholder="Grade" style={styles.input} />
          <TextInput value={draft.teacherName} onChangeText={value => setField('teacherName', value)} placeholder="Teacher" style={styles.input} />
          <TextInput value={draft.schoolPhone} onChangeText={value => setField('schoolPhone', value)} placeholder="School / attendance phone" style={styles.input} />
          <TextInput value={draft.schoolWebsite} onChangeText={value => setField('schoolWebsite', value)} placeholder="Website or calendar link" style={styles.input} />
          <TextInput value={draft.pickupInstructions} onChangeText={value => setField('pickupInstructions', value)} placeholder="Pickup / bus / after-school notes" multiline style={styles.textArea} />
        </Card>
      ) : null}

      {step.key === 'medical' ? (
        <Card>
          <Text style={styles.section}>Medical and care</Text>
          <TextInput value={draft.allergies} onChangeText={value => setField('allergies', value)} placeholder="Allergies" style={styles.input} />
          <TextInput value={draft.conditions} onChangeText={value => setField('conditions', value)} placeholder="Conditions" style={styles.input} />
          <TextInput value={draft.medications} onChangeText={value => setField('medications', value)} placeholder="Medications, dosage, schedule" multiline style={styles.textArea} />
          <TextInput value={draft.careInstructions} onChangeText={value => setField('careInstructions', value)} placeholder="Care instructions" multiline style={styles.textArea} />
        </Card>
      ) : null}

      {step.key === 'care' ? (
        <Card>
          <Text style={styles.section}>Care team</Text>
          <TextInput value={draft.providerName} onChangeText={value => setField('providerName', value)} placeholder="Doctor / therapist / provider" style={styles.input} />
          <TextInput value={draft.providerPhone} onChangeText={value => setField('providerPhone', value)} placeholder="Provider phone" style={styles.input} />
          <TextInput value={draft.pharmacyName} onChangeText={value => setField('pharmacyName', value)} placeholder="Pharmacy" style={styles.input} />
          <TextInput value={draft.insuranceProvider} onChangeText={value => setField('insuranceProvider', value)} placeholder="Insurance provider" style={styles.input} />
          <TextInput value={draft.emergencyContactName} onChangeText={value => setField('emergencyContactName', value)} placeholder="Emergency contact / pickup person" style={styles.input} />
          <TextInput value={draft.emergencyContactPhone} onChangeText={value => setField('emergencyContactPhone', value)} placeholder="Emergency contact phone" style={styles.input} />
        </Card>
      ) : null}

      {step.key === 'custody' ? (
        <Card>
          <Text style={styles.section}>Custody / exchange</Text>
          <TextInput value={draft.custodySummary} onChangeText={value => setField('custodySummary', value)} placeholder="Plain-English custody summary" multiline style={styles.textArea} />
          <TextInput value={draft.exchangeRules} onChangeText={value => setField('exchangeRules', value)} placeholder="Exchange times, locations, holidays, exceptions" multiline style={styles.textArea} />
        </Card>
      ) : null}

      {step.key === 'journal' ? (
        <Card>
          <Text style={styles.section}>First journal note</Text>
          <TextInput value={draft.journalNote} onChangeText={value => setField('journalNote', value)} placeholder="What should ParentVault remember? Keep it factual." multiline style={styles.textArea} />
        </Card>
      ) : null}

      {step.key === 'review' ? (
        <Card>
          <Text style={styles.section}>Setup draft</Text>
          <Text>Child: {draft.childName || 'Not set'}</Text>
          <Text>School: {draft.schoolName || 'Not set'}</Text>
          <Text>Medical: {splitList(draft.allergies).length} allergies, {splitList(draft.conditions).length} conditions, {splitList(draft.medications).length} meds</Text>
          <Text>Care team: {[draft.providerName, draft.pharmacyName, draft.insuranceProvider, draft.emergencyContactName].filter(Boolean).length} items</Text>
          <Text>Custom info: {draft.customInfoTitle || draft.customInfoValue ? 'Drafted' : 'Not set'}</Text>
          <Text>Custody: {draft.custodySummary || draft.exchangeRules ? 'Drafted' : 'Not set'}</Text>
          <Text style={styles.warning}>Privacy note: sensitive data needs encrypted storage before real-world use.</Text>
        </Card>
      ) : null}

      {step.key !== 'review' ? (
        <Card>
          <Text style={styles.section}>Upload or paste for this step</Text>
          <Text style={styles.help}>{step.uploadHint}</Text>
          <TextInput value={pasteText} onChangeText={setPasteText} placeholder="Paste text from a document, message, school page, or screenshot here." multiline style={styles.textArea} />
          <PrimaryButton onPress={() => applyImportText('text', `${step.label} pasted text`, pasteText)} disabled={!pasteText.trim()}>Use pasted text</PrimaryButton>
          <PrimaryButton tone="quiet" onPress={pickImage}>Upload image / screenshot</PrimaryButton>
          <PrimaryButton tone="quiet" onPress={pickDocument}>Upload PDF / document / calendar</PrimaryButton>
          <Text style={styles.help}>Uploads create review drafts. If a PDF or image cannot be read yet, paste the visible text above too.</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.buttonRow}>
          <PrimaryButton tone="quiet" onPress={() => setStepIndex(index => Math.max(index - 1, 0))} disabled={stepIndex === 0}>Back</PrimaryButton>
          {step.key === 'review' ? <PrimaryButton onPress={completeSetup}>Finish setup</PrimaryButton> : <PrimaryButton onPress={() => { saveDraft(); setPasteText(''); setStepIndex(index => Math.min(index + 1, steps.length - 1)); }}>Save and continue</PrimaryButton>}
        </View>
        <PrimaryButton tone="quiet" onPress={completeOnboarding}>Skip Nanny for now</PrimaryButton>
      </Card>
    </ScrollView>
  );
}

// Screen-specific styles for the Onboarding flow only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20, paddingBottom: 36 },
  brand: { fontSize: 30, fontWeight: '900', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 14 },
  nannyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nannyAvatar: { width: 72, height: 72, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#f59e0b' },
  nannyFace: { fontSize: 42 },
  nannyBubble: { flex: 1, backgroundColor: theme.primarySoft, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: theme.border },
  nannyName: { color: theme.primary, fontWeight: '900' },
  progressText: { color: theme.subtle, fontSize: 12, fontWeight: '800', marginTop: 2 },
  stepTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
  stepMessage: { color: theme.muted, marginTop: 6, lineHeight: 20 },
  progressRail: { height: 8, backgroundColor: theme.border, borderRadius: 999, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: theme.primary, borderRadius: 999 },
  assistantNote: { color: theme.primary, backgroundColor: theme.primarySoft, borderRadius: 14, padding: 10, marginTop: 12, fontWeight: '700' },
  stepTabs: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border },
  stepDotActive: { backgroundColor: theme.primary },
  stepDotText: { color: theme.subtle, fontWeight: '900', fontSize: 12 },
  stepDotTextActive: { color: '#ffffff' },
  section: { fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 8 },
  help: { color: theme.subtle, marginTop: 6, marginBottom: 8 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, padding: 10, backgroundColor: theme.input, marginTop: 8 },
  textArea: { minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, padding: 10, backgroundColor: theme.input, marginTop: 8, textAlignVertical: 'top' },
  warning: { color: '#9a3412', backgroundColor: '#fff7ed', padding: 10, borderRadius: 12, marginTop: 10, fontWeight: '700' },
  buttonRow: { gap: 8 },
});
