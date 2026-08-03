import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '@/constants/theme';

/** Simpler IA: Today · Calendar · Add · Coach (Insights/Settings live inside pages) */
const items = [
  {
    key: 'home',
    label: 'Today',
    icon: 'sunny-outline' as const,
    href: '/(tabs)',
    activeColor: colors.today,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline' as const,
    href: '/(tabs)/calendar',
    activeColor: colors.calendar,
  },
  {
    key: 'add',
    label: 'Add',
    icon: 'add' as const,
    href: '/ai-input',
    fab: true,
  },
  {
    key: 'coach',
    label: 'Coach',
    icon: 'flash-outline' as const,
    href: '/(tabs)/coach',
    activeColor: colors.coach,
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
          if ('fab' in item && item.fab) {
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
          const activeColor = item.activeColor || colors.ink;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={active ? { selected: true } : {}}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.tab,
                active && { backgroundColor: `${activeColor}18` },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={active ? activeColor : colors.inkMuted}
              />
              <Text
                style={[
                  styles.label,
                  active && { color: activeColor, fontFamily: fonts.semibold },
                ]}
              >
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
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
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: radii.md,
    ...Platform.select({
      web: { cursor: 'pointer' } as object,
      default: {},
    }),
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderWidth: 3,
    borderColor: colors.energy,
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
    fontSize: 11,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
