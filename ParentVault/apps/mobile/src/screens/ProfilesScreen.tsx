/**
 * PARENTVAULT-COMMENTARY
 *
 * Child vault screen for identity, care, medical, provider, emergency, insurance, school, and custody details.
 *
 * This page is where scattered critical information becomes structured and searchable.
 *
 * Any production persistence from this screen must encrypt sensitive fields and mask high-risk values by default.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { findChildVaultGaps, type SchoolEnrichmentSuggestion, type SchoolInfo } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { schoolDatesToScheduleItems, suggestSchoolEnrichment } from '../services/schoolEnrichment';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';

const formatAddress = (address?: { line1: string; line2?: string; city: string; state: string; postalCode: string }) => {
  if (!address) return 'Location not set';
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`].filter(Boolean).join(', ');
};

const mergeSchool = (current: SchoolInfo | undefined, suggestion: SchoolEnrichmentSuggestion): SchoolInfo => ({
  id: current?.id ?? `school-${Date.now()}`,
  schoolName: suggestion.school.schoolName ?? current?.schoolName ?? 'School',
  districtName: suggestion.school.districtName ?? current?.districtName,
  grade: current?.grade,
  teacherName: current?.teacherName,
  mainPhone: suggestion.school.mainPhone ?? current?.mainPhone,
  attendancePhone: suggestion.school.attendancePhone ?? current?.attendancePhone,
  websiteUrl: suggestion.school.websiteUrl ?? current?.websiteUrl,
  calendarUrl: suggestion.school.calendarUrl ?? current?.calendarUrl,
  address: suggestion.school.address ?? current?.address,
  officeHours: suggestion.school.officeHours ?? current?.officeHours,
  schoolHours: suggestion.school.schoolHours ?? current?.schoolHours,
  pickupInstructions: current?.pickupInstructions,
  busInfo: current?.busInfo,
  calendarDates: [...(current?.calendarDates ?? []), ...suggestion.calendarDates],
  lastEnrichedAt: new Date().toISOString(),
  enrichmentSources: suggestion.sources,
  notes: [current?.notes, suggestion.school.notes].filter(Boolean).join('\n') || undefined
});

const onboardingSteps = [
  {
    eyebrow: 'Step 1',
    title: "Let's make the child profile useful first.",
    body: "Start with the child's name, birthday, allergies, important medical notes, and trusted pickup contacts."
  },
  {
    eyebrow: 'Step 2',
    title: "Next, I'll help collect school details.",
    body: 'School, teacher, hours, pickup rules, attendance phone, calendar, and no-school dates all belong here.'
  },
  {
    eyebrow: 'Step 3',
    title: 'Then we add care logistics.',
    body: 'Doctors, pharmacy, medication schedules, insurance, refill notes, and emergency instructions.'
  },
  {
    eyebrow: 'Step 4',
    title: 'Finally, custody and journal notes.',
    body: 'Keep exchanges, reminders, court-order snippets, incidents, and evidence-style journal notes reviewable before saving.'
  }
];

export function ProfilesScreen() {
  // Theme and styles stay at the top so the visual rules are easy to find.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Store values are the saved vault data this tab displays or updates.
  const children = useVaultStore(s => s.children);
  const addChild = useVaultStore(s => s.addChild);
  const updateChild = useVaultStore(s => s.updateChild);
  const updateChildSchool = useVaultStore(s => s.updateChildSchool);
  const addScheduleItem = useVaultStore(s => s.addScheduleItem);

  // Local state only controls this screen's temporary school-search and guide UI.
  const [schoolQuery, setSchoolQuery] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [suggestion, setSuggestion] = useState<SchoolEnrichmentSuggestion | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [customInfoDrafts, setCustomInfoDrafts] = useState<Record<string, { title: string; value: string }>>({});
  const [activeCustomInfoChildIds, setActiveCustomInfoChildIds] = useState<Record<string, boolean>>({});
  const customTitleInputRefs = useRef<Record<string, TextInput | null>>({});
  const customValueInputRefs = useRef<Record<string, TextInput | null>>({});

  const firstChild = children[0];
  const nannyStep = onboardingSteps[onboardingStep];

  // Draft school details from public/known school info, but do not save anything yet.
  const enrichSchool = async () => {
    const schoolName = schoolQuery.trim() || firstChild?.school?.schoolName;
    if (!schoolName) return;
    setSuggestion(await suggestSchoolEnrichment({ schoolName, city: city.trim() || firstChild?.school?.address?.city, state: stateCode.trim() || firstChild?.school?.address?.state, academicYear: 'current school year' }));
  };

  // Save the reviewed school suggestion and convert school calendar dates into schedule items.
  const confirmSchoolSuggestion = () => {
    if (!suggestion || !firstChild) return;
    updateChildSchool(firstChild.id, mergeSchool(firstChild.school, suggestion));
    schoolDatesToScheduleItems(firstChild.id, suggestion.calendarDates).forEach(addScheduleItem);
    setSuggestion(null);
  };

  const setCustomInfoDraft = (childId: string, key: 'title' | 'value', value: string) => {
    setCustomInfoDrafts(current => ({
      ...current,
      [childId]: { title: current[childId]?.title ?? '', value: current[childId]?.value ?? '', [key]: value }
    }));
  };

  const startCustomInfoDraft = (childId: string) => {
    setActiveCustomInfoChildIds(current => ({ ...current, [childId]: true }));
    setCustomInfoDrafts(current => ({
      ...current,
      [childId]: current[childId] ?? { title: '', value: '' }
    }));
    setTimeout(() => customTitleInputRefs.current[childId]?.focus(), 0);
  };

  const focusCustomInfoValue = (childId: string) => {
    setTimeout(() => customValueInputRefs.current[childId]?.focus(), 0);
  };

  const addCustomInfo = (childId: string) => {
    const child = children.find(item => item.id === childId);
    const draft = customInfoDrafts[childId];
    const title = draft?.title.trim() ?? '';
    const value = draft?.value.trim() ?? '';
    if (!child || (!title && !value)) return;
    const savedAt = new Date().toISOString();
    updateChild(childId, {
      customInfo: [...(child.customInfo ?? []), {
        id: `custom-${Date.now()}`,
        title: title || 'Other information',
        value: value || 'Not filled in yet',
        createdAt: savedAt,
        updatedAt: savedAt
      }]
    });
    setCustomInfoDrafts(current => ({ ...current, [childId]: { title: '', value: '' } }));
    setActiveCustomInfoChildIds(current => ({ ...current, [childId]: false }));
  };

  const removeCustomInfo = (childId: string, customInfoId: string) => {
    const child = children.find(item => item.id === childId);
    if (!child) return;
    updateChild(childId, { customInfo: (child.customInfo ?? []).filter(item => item.id !== customInfoId) });
  };

  // Render order: guide, school lookup, reviewed suggestion, saved child cards, and add-child button.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Child vault</Text>
      <Text style={styles.subtitle}>Detailed identity, medical, doctor, school, insurance, custody, and emergency information.</Text>

      {showOnboarding ? (
        <Card>
          <View style={styles.nannyRow}>
            <View style={styles.nannyAvatar}><Text style={styles.nannyFace}>NB</Text></View>
            <View style={styles.nannyBubble}>
              <Text style={styles.nannyName}>Nanny Nova</Text>
              <Text style={styles.nannyEyebrow}>{nannyStep.eyebrow} of {onboardingSteps.length}</Text>
              <Text style={styles.nannyTitle}>{nannyStep.title}</Text>
              <Text style={styles.nannyBody}>{nannyStep.body}</Text>
            </View>
          </View>
          <View style={styles.progressDots}>
            {onboardingSteps.map((_, index) => <View key={index} style={[styles.dot, index === onboardingStep && styles.activeDot]} />)}
          </View>
          <View style={styles.onboardingButtons}>
            <PrimaryButton tone="quiet" onPress={() => setShowOnboarding(false)}>Hide guide</PrimaryButton>
            <PrimaryButton onPress={() => setOnboardingStep(step => Math.min(step + 1, onboardingSteps.length - 1))} disabled={onboardingStep === onboardingSteps.length - 1}>Next tip</PrimaryButton>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.section}>Create a school draft</Text>
        <Text style={styles.help}>Enter a school name and location. ParentVault will organize what you typed into a review draft. Live school website/calendar search is a later integration.</Text>
        <TextInput value={schoolQuery} onChangeText={setSchoolQuery} placeholder="School name" style={styles.input} />
        <View style={styles.rowInputs}>
          <TextInput value={city} onChangeText={setCity} placeholder="City" style={[styles.input, styles.flexInput]} />
          <TextInput value={stateCode} onChangeText={setStateCode} placeholder="State" style={[styles.input, styles.stateInput]} autoCapitalize="characters" />
        </View>
        <PrimaryButton onPress={enrichSchool}>Create school draft</PrimaryButton>
      </Card>

      {suggestion ? (
        <Card>
          <Text style={styles.section}>Confirm school enrichment</Text>
          <Text style={styles.help}>Nothing is saved until you confirm. Add official phone, website, hours, pickup rules, and calendar dates before relying on it.</Text>
          <Text>School: {suggestion.school.schoolName}</Text>
          {suggestion.school.districtName ? <Text>District: {suggestion.school.districtName}</Text> : null}
          {suggestion.school.mainPhone ? <Text>Main phone: {suggestion.school.mainPhone}</Text> : null}
          {suggestion.school.officeHours ? <Text>Office hours: {suggestion.school.officeHours}</Text> : null}
          {suggestion.school.schoolHours ? <Text>School hours: {suggestion.school.schoolHours}</Text> : null}
          <Text>Location: {formatAddress(suggestion.school.address)}</Text>
          {suggestion.calendarDates.length ? (
            <>
              <Text style={styles.section}>Out-of-school / calendar dates</Text>
              {suggestion.calendarDates.map(date => <Text key={date.id}>- {date.title} - {new Date(date.startsAt).toLocaleDateString()} {date.noSchool ? '(no school)' : ''}</Text>)}
            </>
          ) : <Text style={styles.help}>No calendar dates were created automatically in this demo.</Text>}
          <Text style={styles.section}>Sources</Text>
          {suggestion.sources.map(source => <Text key={source}>- {source}</Text>)}
          {suggestion.warnings.map(warning => <Text key={warning} style={styles.warningText}>Warning: {warning}</Text>)}
          <PrimaryButton onPress={confirmSchoolSuggestion}>Confirm and add to vault</PrimaryButton>
          <PrimaryButton tone="quiet" onPress={() => setSuggestion(null)}>Cancel</PrimaryButton>
        </Card>
      ) : null}

      {children.map(child => (
        <Card key={child.id}>
          <Text style={styles.name}>{child.displayName}</Text>
          {child.legalName ? <Text>Legal name: {child.legalName}</Text> : null}
          {child.preferredName ? <Text>Preferred name: {child.preferredName}</Text> : null}
          <Text>Birthdate: {child.birthdate || 'Not set'}</Text>
          <Text>SSN: {child.ssnLast4 ? `***-**-${child.ssnLast4.replace(/[^0-9]/g, '') || '****'}` : 'Not stored'}</Text>

          <Text style={styles.section}>Custom child information</Text>
          <Text style={styles.help}>Tap +, name the detail on the left, then ParentVault jumps you into the blank notes field on the right.</Text>
          {child.customInfo?.length ? child.customInfo.map(item => (
            <View key={item.id} style={styles.provider}>
              <Text style={styles.providerName}>{item.title}</Text>
              <Text>{item.value}</Text>
              <PrimaryButton tone="quiet" onPress={() => removeCustomInfo(child.id, item.id)}>Remove custom info</PrimaryButton>
            </View>
          )) : <Text>No custom info saved yet.</Text>}
          {activeCustomInfoChildIds[child.id] ? (
            <>
              <View style={styles.customDetailRow}>
                <TextInput
                  ref={input => { customTitleInputRefs.current[child.id] = input; }}
                  value={customInfoDrafts[child.id]?.title ?? ''}
                  onChangeText={value => setCustomInfoDraft(child.id, 'title', value)}
                  onSubmitEditing={() => focusCustomInfoValue(child.id)}
                  placeholder="Label"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  style={[styles.input, styles.customTitleInput]}
                />
                <TextInput
                  ref={input => { customValueInputRefs.current[child.id] = input; }}
                  value={customInfoDrafts[child.id]?.value ?? ''}
                  onChangeText={value => setCustomInfoDraft(child.id, 'value', value)}
                  placeholder="Blank notes field"
                  multiline
                  style={[styles.textArea, styles.customValueInput]}
                />
              </View>
              <PrimaryButton onPress={() => addCustomInfo(child.id)}>Save this detail</PrimaryButton>
            </>
          ) : (
            <PrimaryButton onPress={() => startCustomInfoDraft(child.id)}>+ Add child detail</PrimaryButton>
          )}

          <Text style={styles.section}>Medical</Text>
          <Text>Allergies: {child.medical.allergies.length ? child.medical.allergies.join(', ') : 'None listed'}</Text>
          <Text>Conditions: {child.medical.conditions.length ? child.medical.conditions.join(', ') : 'None listed'}</Text>
          <Text>Dietary restrictions: {child.medical.dietaryRestrictions.length ? child.medical.dietaryRestrictions.join(', ') : 'None listed'}</Text>
          {child.medical.careInstructions ? <Text>Care instructions: {child.medical.careInstructions}</Text> : null}

          <Text style={styles.section}>Medications</Text>
          {child.medical.medications.length ? child.medical.medications.map(med => {
            const pharmacy = child.careProviders.find(provider => provider.id === med.pharmacyProviderId);
            return (
              <View key={med.id} style={styles.provider}>
                <Text style={styles.providerName}>- {med.name} {med.dosage ? ` - ${med.dosage}` : ''}</Text>
                {med.instructions ? <Text>Instructions: {med.instructions}</Text> : null}
                {med.scheduleText ? <Text>Schedule: {med.scheduleText}</Text> : null}
                {pharmacy ? <Text>Filled at: {pharmacy.organizationName ?? pharmacy.personName} {pharmacy.phone || ''}</Text> : null}
                {med.refillInstructions ? <Text>Refill: {med.refillInstructions}</Text> : null}
                {med.refillRemainingCount !== undefined ? <Text>Refills remaining: {med.refillRemainingCount}</Text> : null}
                {med.nextRefillDueAt ? <Text>Next refill due: {med.nextRefillDueAt}</Text> : null}
              </View>
            );
          }) : <Text>None listed</Text>}

          <Text style={styles.section}>Doctors & care providers</Text>
          {child.careProviders.map(provider => (
            <View key={provider.id} style={styles.provider}>
              <Text style={styles.providerName}>{provider.isPrimary ? '* ' : ''}{provider.personName}</Text>
              <Text>{provider.type}{provider.role ? ` - ${provider.role}` : ''}</Text>
              {provider.organizationName ? <Text>{provider.organizationName}</Text> : null}
              {provider.phone ? <Text>Phone: {provider.phone}</Text> : null}
              {provider.afterHoursPhone ? <Text>After-hours: {provider.afterHoursPhone}</Text> : null}
              <Text>Location: {formatAddress(provider.address)}</Text>
              {provider.officeHours ? <Text>Hours: {provider.officeHours}</Text> : null}
              {provider.type === 'pharmacy' && provider.portalUrl ? <Text>Refill portal/app: {provider.portalUrl}</Text> : null}
              {provider.type === 'pharmacy' && provider.acceptsElectronicPrescriptions !== undefined ? <Text>E-prescriptions: {provider.acceptsElectronicPrescriptions ? 'yes' : 'no'}</Text> : null}
              {provider.type === 'pharmacy' && provider.preferredForRefills ? <Text>Preferred refill pharmacy</Text> : null}
            </View>
          ))}

          <Text style={styles.section}>School</Text>
          {child.school ? (
            <>
              <Text>{child.school.schoolName}{child.school.grade ? ` - ${child.school.grade}` : ''}</Text>
              {child.school.districtName ? <Text>District: {child.school.districtName}</Text> : null}
              {child.school.teacherName ? <Text>Teacher: {child.school.teacherName}</Text> : null}
              {child.school.mainPhone ? <Text>Main phone: {child.school.mainPhone}</Text> : null}
              {child.school.attendancePhone ? <Text>Attendance: {child.school.attendancePhone}</Text> : null}
              {child.school.websiteUrl ? <Text>Website: {child.school.websiteUrl}</Text> : null}
              {child.school.calendarUrl ? <Text>Calendar: {child.school.calendarUrl}</Text> : null}
              {child.school.officeHours ? <Text>Office hours: {child.school.officeHours}</Text> : null}
              {child.school.schoolHours ? <Text>School hours: {child.school.schoolHours}</Text> : null}
              <Text>Location: {formatAddress(child.school.address)}</Text>
              {child.school.pickupInstructions ? <Text>Pickup: {child.school.pickupInstructions}</Text> : null}
              {child.school.calendarDates?.length ? <Text>Saved calendar dates: {child.school.calendarDates.length}</Text> : null}
            </>
          ) : <Text>Not set</Text>}

          <Text style={styles.section}>Emergency contacts</Text>
          {child.contacts.map(contact => <Text key={contact.id}>- {contact.name}, {contact.relationship} {contact.phone || ''}{contact.allowedPickup ? ' - pickup allowed' : ''}</Text>)}

          <Text style={styles.section}>Insurance</Text>
          {child.insurance.length ? child.insurance.map(policy => (
            <View key={policy.id} style={styles.provider}>
              <Text style={styles.providerName}>- {policy.providerName}{policy.planName ? ` - ${policy.planName}` : ''}</Text>
              {policy.policyHolderName ? <Text>Policy holder: {policy.policyHolderName}{policy.relationshipToChild ? ` (${policy.relationshipToChild})` : ''}</Text> : null}
              {policy.phone ? <Text>Main phone: {policy.phone}</Text> : null}
              {policy.nurseLinePhone ? <Text>Nurse line: {policy.nurseLinePhone}</Text> : null}
              {policy.pharmacyBenefitsPhone ? <Text>Pharmacy benefits: {policy.pharmacyBenefitsPhone}</Text> : null}
              {policy.portalUrl ? <Text>Portal: {policy.portalUrl}</Text> : null}
              {policy.copayNotes ? <Text>Copay: {policy.copayNotes}</Text> : null}
              {policy.priorAuthorizationNotes ? <Text>Prior auth: {policy.priorAuthorizationNotes}</Text> : null}
            </View>
          )) : <Text>Not set</Text>}

          <Text style={styles.section}>Bot checklist</Text>
          {findChildVaultGaps(child).slice(0, 5).map(gap => <Text key={gap.id}>- {gap.question}</Text>)}
          {!findChildVaultGaps(child).length ? <Text>Major baseline details are filled. The bot will keep watching for stale or missing info.</Text> : null}
        </Card>
      ))}
      <PrimaryButton onPress={() => addChild({
        displayName: 'New Child',
        medical: { allergies: [], conditions: [], medications: [], dietaryRestrictions: [], sensoryNeeds: [] },
        careProviders: [],
        contacts: [],
        insurance: [],
        customInfo: []
      })}>Add profile draft</PrimaryButton>
      <View style={styles.warning}><Text style={styles.warningText}>Production note: SSNs, insurance IDs, case numbers, and medical details must be encrypted and hidden by default.</Text></View>
    </ScrollView>
  );
}

// Screen-specific styles. Keeping them in this file makes the Profiles tab self-contained.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  nannyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nannyAvatar: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#fbbf24' },
  nannyFace: { fontSize: 36 },
  nannyBubble: { flex: 1, backgroundColor: theme.primarySoft, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: theme.border },
  nannyName: { color: theme.primary, fontWeight: '900', marginBottom: 2 },
  nannyEyebrow: { color: theme.subtle, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  nannyTitle: { color: theme.text, fontWeight: '900', fontSize: 17, marginTop: 4 },
  nannyBody: { color: theme.muted, marginTop: 6, lineHeight: 20 },
  progressDots: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  activeDot: { backgroundColor: theme.primary, width: 18 },
  onboardingButtons: { marginTop: 8 },
  section: { fontWeight: '800', marginTop: 14, marginBottom: 4 },
  help: { color: theme.muted, marginBottom: 10 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, padding: 10, backgroundColor: theme.input, marginTop: 8 },
  textArea: { minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, padding: 10, backgroundColor: theme.input, marginTop: 8, textAlignVertical: 'top' },
  customDetailRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  customTitleInput: { flex: 1, minWidth: 120 },
  customValueInput: { flex: 2, minHeight: 44 },
  rowInputs: { flexDirection: 'row', gap: 8 },
  flexInput: { flex: 1 },
  stateInput: { width: 90 },
  provider: { borderLeftWidth: 3, borderLeftColor: theme.primary, paddingLeft: 10, marginTop: 8 },
  providerName: { fontWeight: '800' },
  warning: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginTop: 10 },
  warningText: { color: '#9a3412', marginTop: 6 }
});
