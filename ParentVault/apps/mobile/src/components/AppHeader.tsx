/**
 * AppHeader
 *
 * Shared top banner for the ParentVault mobile shell.
 * Keeping this outside App.tsx makes the root app easier to read and keeps global warning copy
 * in one small component instead of mixed into navigation logic.
 */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export function AppHeader() {
  const theme = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text style={[styles.brand, { color: theme.text }]}>ParentVault</Text>
      <Text style={[styles.tagline, { color: theme.subtle }]}>Offline-ready family operations</Text>
      <Text style={[styles.localFirstNotice, { color: theme.warning }]}>Local-first: core manual features save on this device and should work without internet. AI, cloud backup, sync, and sharing must be opt-in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1 },
  brand: { fontSize: 24, fontWeight: '900' },
  tagline: { marginTop: 2 },
  localFirstNotice: { marginTop: 8, fontSize: 12, fontWeight: '700' }
});
