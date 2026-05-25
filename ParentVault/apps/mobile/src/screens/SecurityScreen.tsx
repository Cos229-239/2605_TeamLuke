/**
 * PARENTVAULT-COMMENTARY
 *
 * Settings/trust-center screen for theme, privacy controls, safety guidance, 2FA/vault-unlock direction, export/delete posture, and security notes.
 *
 * This is where parents should understand and control how private data is handled.
 *
 * Do not bury risks here; the MVP should be blunt about current limits and production blockers.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { AuthSecuritySettings, ParentVaultFeature, PrivacyFeatureSettings, SecondFactorMethod } from '@parentvault/shared';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useVaultStore } from '../store/vaultStore';
import { useTheme } from '../theme';
import { createDemoTwoFactorChallenge, defaultSecuritySettings, describeSecondFactor, loadSecuritySettings, saveSecuritySettings, setSecondFactorEnabled } from '../services/security';
import { defaultPrivacyFeatureSettings, isFeatureEnabled, loadPrivacyFeatureSettings, savePrivacyFeatureSettings, scheduleOnlyPrivacySettings, setFeatureEnabled } from '../services/privacySettings';

const factorOrder: SecondFactorMethod[] = ['passkey', 'totp', 'sms', 'email', 'recovery_code'];
const APP_TOGGLE_KEY = 'parentvault.settings.app-toggles';

type AppSettingsToggles = {
  privateNotifications: boolean;
  maskSensitiveInfo: boolean;
  allowExports: boolean;
  allowQuickShare: boolean;
  cloudBackup: boolean;
  trustedAccess: boolean;
};

const defaultAppSettingsToggles = (): AppSettingsToggles => ({
  privateNotifications: true,
  maskSensitiveInfo: true,
  allowExports: false,
  allowQuickShare: false,
  cloudBackup: false,
  trustedAccess: false
});

const featureLabels: { feature: ParentVaultFeature; label: string; description: string }[] = [
  { feature: 'schedule_reminders', label: 'Schedule reminders', description: 'Use events and notifications without detailed child data.' },
  { feature: 'child_profile', label: 'Child profile', description: 'Names, birthdate, contacts, basic profile.' },
  { feature: 'medical', label: 'Medical details', description: 'Allergies, meds, conditions, care instructions.' },
  { feature: 'providers', label: 'Doctors/pharmacy', description: 'Doctor, dentist, pharmacy, provider contacts.' },
  { feature: 'insurance', label: 'Insurance', description: 'Insurance provider, plan, card, Rx benefits.' },
  { feature: 'school', label: 'School', description: 'School info, attendance, calendar/no-school days.' },
  { feature: 'custody_legal', label: 'Custody/legal', description: 'Court/decree summaries and exchange rules.' },
  { feature: 'journal', label: 'Journal', description: 'Notes and event records.' },
  { feature: 'media_attachments', label: 'Photos/screenshots', description: 'Attach media to journal/imports.' },
  { feature: 'ai_imports', label: 'AI imports', description: 'Allow reviewed AI extraction from images, PDFs, and pasted text.' },
  { feature: 'web_enrichment', label: 'School/provider lookup', description: 'Allow official-source lookup for school, calendar, and provider details.' }
];

export function SecurityScreen() {
  // Theme/styles first; this tab controls appearance plus security/privacy settings.
  const theme = useTheme();
  const styles = createStyles(theme);

  // Local state mirrors saved security/privacy settings after they load from storage.
  const [settings, setSettings] = useState<AuthSecuritySettings>(defaultSecuritySettings());
  const [privacy, setPrivacy] = useState<PrivacyFeatureSettings>(defaultPrivacyFeatureSettings());
  const [appToggles, setAppToggles] = useState<AppSettingsToggles>(defaultAppSettingsToggles());
  const [challengeText, setChallengeText] = useState('');

  // Theme mode is stored globally because it affects the whole app, not just Settings.
  const themeMode = useVaultStore(state => state.themeMode);
  const setThemeMode = useVaultStore(state => state.setThemeMode);

  // Load saved settings once when the screen opens. Fall back to safe defaults if storage fails.
  useEffect(() => {
    loadSecuritySettings().then(setSettings).catch(() => setSettings(defaultSecuritySettings()));
    loadPrivacyFeatureSettings().then(setPrivacy).catch(() => setPrivacy(defaultPrivacyFeatureSettings()));
    AsyncStorage.getItem(APP_TOGGLE_KEY)
      .then(raw => setAppToggles(raw ? { ...defaultAppSettingsToggles(), ...JSON.parse(raw) as Partial<AppSettingsToggles> } : defaultAppSettingsToggles()))
      .catch(() => setAppToggles(defaultAppSettingsToggles()));
  }, []);

  const toggleAppSetting = async (key: keyof AppSettingsToggles, enabled: boolean) => {
    const updated = { ...appToggles, [key]: enabled };
    setAppToggles(updated);
    await AsyncStorage.setItem(APP_TOGGLE_KEY, JSON.stringify(updated));
  };

  // Turn individual second-factor methods on/off in the saved security settings.
  const toggleFactor = async (method: SecondFactorMethod, enabled: boolean) => {
    const updated = await setSecondFactorEnabled(method, enabled);
    setSettings(updated);
  };

  // Enable/disable optional app areas. Schedule reminders stay on because they are the minimal useful mode.
  const toggleFeature = async (feature: ParentVaultFeature, enabled: boolean) => {
    if (feature === 'schedule_reminders' && !enabled) return;
    const updated = setFeatureEnabled(privacy, feature, enabled);
    await savePrivacyFeatureSettings(updated);
    setPrivacy(updated);
  };

  // Schedule-only mode reduces sensitive data collection while keeping reminders available.
  const enableScheduleOnly = async () => {
    const updated = scheduleOnlyPrivacySettings();
    await savePrivacyFeatureSettings(updated);
    setPrivacy(updated);
  };

  // Full vault mode turns all enabled feature categories back on.
  const enableFullVault = async () => {
    const updated = defaultPrivacyFeatureSettings();
    await savePrivacyFeatureSettings(updated);
    setPrivacy(updated);
  };

  // Optional prompts decide whether the app should ask for extra profile/care details.
  const toggleOptionalPrompts = async (enabled: boolean) => {
    const updated = { ...privacy, allowOptionalProfilePrompts: enabled, updatedAt: new Date().toISOString() };
    await savePrivacyFeatureSettings(updated);
    setPrivacy(updated);
  };

  // Local unlock is a production-facing control; this build stores the setting only.
  const toggleLocalUnlock = async (enabled: boolean) => {
    const updated = { ...settings, localUnlockRequired: enabled };
    await saveSecuritySettings(updated);
    setSettings(updated);
  };

  // Demo only: shows what a two-factor challenge message might look like later.
  const demoChallenge = () => {
    const method = settings.preferredSecondFactor ?? settings.enabledSecondFactors[0] ?? 'totp';
    const challenge = createDemoTwoFactorChallenge(method);
    setChallengeText(`Demo challenge: ${describeSecondFactor(challenge.method)}. Expires at ${new Date(challenge.expiresAt).toLocaleTimeString()}.`);
  };

  // Render order: theme, privacy mode, consent toggles, two-factor, and local unlock controls.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Theme, security, privacy, and consent controls for ParentVault.</Text>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.section}>Light mode</Text>
            <Text style={styles.help}>Dark mode is the standard look. Turn this on if you want the lighter settings/app theme.</Text>
          </View>
          <Switch value={themeMode === 'light'} onValueChange={enabled => void setThemeMode(enabled ? 'light' : 'dark')} />
        </View>
        <Text style={styles.status}>{themeMode === 'light' ? 'Light mode is on.' : 'Dark mode is standard.'}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Privacy mode</Text>
        <Text style={styles.help}>Schedule-only mode keeps reminders usable without asking for optional child profile, medical, school, insurance, custody, journal, media, AI, or web enrichment data.</Text>
        <PrimaryButton onPress={enableScheduleOnly}>Use schedule reminders only</PrimaryButton>
        <PrimaryButton tone="quiet" onPress={enableFullVault}>Enable full vault features</PrimaryButton>
        <Text style={styles.status}>{privacy.minimalMode ? 'Minimal mode is on: only schedule reminders are enabled.' : 'Full/selected features mode is on.'}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Parent controls</Text>
        <Text style={styles.help}>Quick toggles for the things parents should be able to turn on or off without digging.</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Private notification text</Text>
            <Text style={styles.help}>Hide child names and sensitive details from lock-screen alerts.</Text>
          </View>
          <Switch value={appToggles.privateNotifications} onValueChange={enabled => toggleAppSetting('privateNotifications', enabled)} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Mask sensitive info</Text>
            <Text style={styles.help}>Keep SSNs, insurance IDs, legal details, and medical identifiers hidden until intentionally opened.</Text>
          </View>
          <Switch value={appToggles.maskSensitiveInfo} onValueChange={enabled => toggleAppSetting('maskSensitiveInfo', enabled)} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Allow exports</Text>
            <Text style={styles.help}>Permit PDF/ZIP/CSV export flows after review and unlock.</Text>
          </View>
          <Switch value={appToggles.allowExports} onValueChange={enabled => toggleAppSetting('allowExports', enabled)} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Allow quick share</Text>
            <Text style={styles.help}>Let selected child details be sent as a text-ready summary without sharing the whole profile.</Text>
          </View>
          <Switch value={appToggles.allowQuickShare} onValueChange={enabled => toggleAppSetting('allowQuickShare', enabled)} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Cloud backup</Text>
            <Text style={styles.help}>Opt in only when encrypted backup/sync is ready.</Text>
          </View>
          <Switch value={appToggles.cloudBackup} onValueChange={enabled => toggleAppSetting('cloudBackup', enabled)} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Trusted person access</Text>
            <Text style={styles.help}>Prepare access for trusted caregivers or co-parents with controlled permissions.</Text>
          </View>
          <Switch value={appToggles.trustedAccess} onValueChange={enabled => toggleAppSetting('trustedAccess', enabled)} />
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.section}>Optional profile prompts</Text>
            <Text style={styles.help}>Turn this off if you do not want the bot asking for extra details like insurance, doctors, school, or custody info.</Text>
          </View>
          <Switch value={privacy.allowOptionalProfilePrompts} onValueChange={toggleOptionalPrompts} />
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Feature consent</Text>
        {featureLabels.map(item => (
          <View key={item.feature} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.help}>{item.description}</Text>
            </View>
            <Switch value={isFeatureEnabled(privacy, item.feature)} disabled={item.feature === 'schedule_reminders'} onValueChange={enabled => toggleFeature(item.feature, enabled)} />
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.section}>Require two-factor</Text>
            <Text style={styles.help}>Recommended: passkey or authenticator app. SMS/email should be fallback only.</Text>
          </View>
          <Switch value={settings.twoFactorRequired} disabled />
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Second-factor methods</Text>
        {factorOrder.map(method => (
          <View key={method} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{describeSecondFactor(method)}</Text>
              {method === 'recovery_code' ? <Text style={styles.help}>{settings.recoveryCodesRemaining} recovery codes remaining</Text> : null}
            </View>
            <Switch value={settings.enabledSecondFactors.includes(method)} onValueChange={enabled => toggleFactor(method, enabled)} />
          </View>
        ))}
        <PrimaryButton onPress={demoChallenge}>Preview future 2FA challenge</PrimaryButton>
        {challengeText ? <Text style={styles.status}>{challengeText}</Text> : null}
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.section}>Local vault unlock</Text>
            <Text style={styles.help}>Use biometrics/device passcode before opening sensitive child data, even after account login.</Text>
          </View>
          <Switch value={settings.localUnlockRequired} onValueChange={toggleLocalUnlock} />
        </View>
        <Text style={styles.help}>Enabled methods: {settings.localUnlockMethods.join(', ')}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Production rules</Text>
        <Text>- Schedule reminders must work without optional profile data.</Text>
        <Text>- Every optional data category needs opt-in consent.</Text>
        <Text>- Skipped fields should stay skipped unless the parent re-enables prompts.</Text>
        <Text>- 2FA required for every account holding child data.</Text>
        <Text>- Step-up verification before exports, SSN reveal, custody/legal docs, or adding a new trusted device.</Text>
      </Card>
    </ScrollView>
  );
}

// Screen-specific styles for the Settings/Security tab only.
const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: theme.text },
  subtitle: { color: theme.muted, marginBottom: 16 },
  section: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 4 },
  help: { color: theme.subtle },
  label: { fontWeight: '700', color: theme.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', paddingVertical: 8 },
  rowText: { flex: 1 },
  status: { color: theme.primary, fontWeight: '700', marginTop: 8 }
});

