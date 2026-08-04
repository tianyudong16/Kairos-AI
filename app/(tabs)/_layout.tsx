import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { FloatingTabBar } from '@/components/nav/FloatingTabBar';
import { AppShell } from '@/components/ui/AppShell';
import { useThemedStyles } from '@/constants/theme';

export default function TabLayout() {
  const styles = useThemedStyles((colors) => ({
    tabsRoot: {
      flex: 1,
    },
    scene: {
      backgroundColor: colors.bg,
      flex: 1,
    },
  }));

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
          <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
          <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
          <Tabs.Screen name="coach" options={{ title: 'AI Coach' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
      </View>
    </AppShell>
  );
}
