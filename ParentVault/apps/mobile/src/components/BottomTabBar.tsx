/**
 * BottomTabBar
 *
 * Reusable tab buttons for the ParentVault app shell.
 * The tab definitions come from ../navigation/tabs.tsx, so this component only worries about
 * display and user interaction.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTab, TabKey } from '../navigation/tabs';
import { useTheme } from '../theme';

interface BottomTabBarProps {
  tabs: AppTab[];
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

export function BottomTabBar({ tabs, activeTab, onChangeTab }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.tabs, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {tabs.map(item => {
        const selected = activeTab === item.key;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Open ${item.label}`}
            onPress={() => onChangeTab(item.key)}
            style={[styles.tab, selected && { backgroundColor: theme.primarySoft }]}
          >
            <Text style={[styles.tabText, { color: selected ? theme.primary : theme.subtle }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 8, gap: 6, borderTopWidth: 1 },
  tab: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 11, fontWeight: '700' }
});
