/**
 * ParentVault mobile app root
 *
 * This file should stay small. It wires together global app concerns only:
 * - theme setup
 * - onboarding gate
 * - selected tab state
 * - app shell layout
 *
 * If you want to change one tab, do not hunt through this file.
 * Go to apps/mobile/src/screens/<TabName>Screen.tsx instead.
 *
 * If you want to add, remove, rename, or reorder tabs, edit:
 * apps/mobile/src/navigation/tabs.tsx
 */

import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { AppHeader } from './src/components/AppHeader';
import { AppLoading } from './src/components/AppLoading';
import { BottomTabBar } from './src/components/BottomTabBar';
import { appTabs, defaultTab, type TabKey } from './src/navigation/tabs';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useVaultStore } from './src/store/vaultStore';
import { ThemeProvider, useTheme } from './src/theme';

export default function App() {
  const themeMode = useVaultStore(state => state.themeMode);

  return (
    <ThemeProvider mode={themeMode}>
      <ParentVaultApp />
    </ThemeProvider>
  );
}

function ParentVaultApp() {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const theme = useTheme();
  const onboardingLoaded = useVaultStore(state => state.onboardingLoaded);
  const onboardingCompleted = useVaultStore(state => state.onboardingCompleted);
  const loadOnboardingStatus = useVaultStore(state => state.loadOnboardingStatus);

  // Look up the active tab's screen from the central tab registry.
  // If a tab key is ever missing, fall back to the first tab instead of crashing the shell.
  const ActiveScreen = useMemo(
    () => appTabs.find(item => item.key === activeTab)?.Screen ?? appTabs[0].Screen,
    [activeTab]
  );

  useEffect(() => {
    void loadOnboardingStatus();
  }, [loadOnboardingStatus]);

  return (
    <SafeAreaView style={[styles.app, { backgroundColor: theme.app }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AppHeader />
      <View style={styles.content}>
        {!onboardingLoaded ? <AppLoading /> : onboardingCompleted ? <ActiveScreen /> : <OnboardingScreen />}
      </View>
      {onboardingCompleted ? <BottomTabBar tabs={appTabs} activeTab={activeTab} onChangeTab={setActiveTab} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  content: { flex: 1 }
});
