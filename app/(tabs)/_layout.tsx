import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/nav/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="coach" options={{ title: 'AI Coach' }} />
    </Tabs>
  );
}
