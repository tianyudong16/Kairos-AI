import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '@/constants/theme';

const items = [
  { key: 'home', label: 'Home', icon: 'home-outline' as const, href: '/(tabs)' },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline' as const,
    href: '/(tabs)/calendar',
  },
  { key: 'add', label: 'Add', icon: 'add' as const, href: '/ai-input', fab: true },
  {
    key: 'analytics',
    label: 'Insights',
    icon: 'bar-chart-outline' as const,
    href: '/(tabs)/analytics',
  },
  {
    key: 'coach',
    label: 'Coach',
    icon: 'flash-outline' as const,
    href: '/(tabs)/coach',
  },
];

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (key: string) => {
    if (key === 'home') {
      return (
        pathname === '/' ||
        pathname === '/(tabs)' ||
        pathname.endsWith('/index') ||
        (!pathname.includes('calendar') &&
          !pathname.includes('analytics') &&
          !pathname.includes('coach') &&
          !pathname.includes('settings') &&
          !pathname.includes('ai-input') &&
          !pathname.includes('onboarding'))
      );
    }
    return pathname.includes(key);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          if (item.fab) {
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel="Add task"
                onPress={() => router.push(item.href as any)}
                style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={28} color={colors.white} />
              </Pressable>
            );
          }

          const active = isActive(item.key);
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={active ? { selected: true } : {}}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={active ? colors.ink : colors.inkMuted}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingTop: 8,
  },
  bar: {
    minHeight: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(28, 26, 23, 0.08)' },
      default: {
        shadowColor: '#1C1A17',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  tab: {
    flex: 1,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' } as object,
      default: {},
    }),
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 3,
    borderColor: colors.bg,
    zIndex: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 8px 18px rgba(18, 16, 14, 0.28)',
      } as object,
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.inkMuted,
  },
  labelActive: {
    color: colors.ink,
    fontFamily: fonts.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
