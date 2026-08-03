import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';

const iconFor: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'grid-outline',
  analytics: 'bar-chart-outline',
  coach: 'flash-outline',
};

type TabRoute = {
  key: string;
  name: string;
};

type Props = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function FloatingTabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderTab = (name: 'index' | 'analytics' | 'coach') => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const focused = state.routes[state.index]?.name === name;

    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(name);
          }
        }}
        style={styles.tab}
      >
        <Ionicons
          name={iconFor[name]}
          size={22}
          color={focused ? colors.ink : colors.inkMuted}
        />
        {focused ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {renderTab('index')}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add with AI"
          onPress={() => router.push('/ai-input')}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>
        {renderTab('analytics')}
        {renderTab('coach')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  bar: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    minHeight: 68,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1C1A17',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  tab: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  dotSpacer: {
    width: 5,
    height: 5,
  },
});
