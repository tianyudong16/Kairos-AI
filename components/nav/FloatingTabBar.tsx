import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

/** IA: Schedule · Calendar · Add · Coach · You */
const items = [
  {
    key: 'home',
    label: 'Schedule',
    icon: 'sunny-outline' as const,
    href: '/(tabs)',
    activeKey: 'schedule' as const,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'calendar-outline' as const,
    href: '/(tabs)/calendar',
    activeKey: 'calendar' as const,
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
    activeKey: 'coach' as const,
  },
  {
    key: 'profile',
    label: 'You',
    icon: 'person-outline' as const,
    href: '/profile',
    activeKey: 'profile' as const,
  },
];

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: {
      backgroundColor: c.bg,
      paddingTop: 8,
    },
    bar: {
      minHeight: 72,
      borderRadius: radii.xl,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 4,
      ...Platform.select({
        web: { boxShadow: '0 8px 20px rgba(6, 32, 38, 0.08)' },
        default: {
          shadowColor: c.black,
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
      }),
    },
    tab: {
      flex: 1,
      minWidth: 64,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
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
      backgroundColor: c.today,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginHorizontal: 6,
      borderWidth: 3,
      borderColor: c.energy,
      zIndex: 2,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          boxShadow: '0 8px 18px rgba(6, 32, 38, 0.28)',
        } as object,
        default: {
          elevation: 4,
          shadowColor: c.black,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
      }),
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.inkMuted,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
  }));

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
          !pathname.includes('profile') &&
          !pathname.includes('login') &&
          !pathname.includes('ai-input') &&
          !pathname.includes('onboarding'))
      );
    }
    if (key === 'profile') {
      return pathname.includes('profile');
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
          const activeColor =
            item.activeKey === 'schedule'
              ? colors.today
              : item.activeKey === 'calendar'
                ? colors.calendar
                : item.activeKey === 'coach'
                  ? colors.coach
                  : item.activeKey === 'profile'
                    ? colors.work
                    : colors.ink;
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
