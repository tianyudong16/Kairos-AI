import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FloatingTabBar } from '@/components/nav/FloatingTabBar';
import { AppShell } from '@/components/ui/AppShell';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <AppShell footer={<FloatingTabBar />}>
      <View style={styles.tabsRoot}>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            sceneStyle: styles.scene,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
          <Tabs.Screen name="coach" options={{ title: 'AI Coach' }} />
        </Tabs>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  tabsRoot: {
    flex: 1,
  },
  scene: {
    backgroundColor: colors.bg,
    flex: 1,
  },
});
