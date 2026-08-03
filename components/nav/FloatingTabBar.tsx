import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const onHome =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname.endsWith('/(tabs)/index') ||
    (!pathname.includes('analytics') &&
      !pathname.includes('coach') &&
      !pathname.includes('ai-input') &&
      !pathname.includes('onboarding'));
  const onAnalytics = pathname.includes('analytics');
  const onCoach = pathname.includes('coach');

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8 },
      ]}
    >
      <View style={styles.bar}>
        <Link href="/(tabs)" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityState={onHome ? { selected: true } : {}}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={onHome ? colors.ink : colors.inkMuted}
            />
            {onHome ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
          </Pressable>
        </Link>

        <Link href="/ai-input" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Add with AI"
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={30} color={colors.white} />
          </Pressable>
        </Link>

        <Link href="/(tabs)/analytics" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityState={onAnalytics ? { selected: true } : {}}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={22}
              color={onAnalytics ? colors.ink : colors.inkMuted}
            />
            {onAnalytics ? (
              <View style={styles.dot} />
            ) : (
              <View style={styles.dotSpacer} />
            )}
          </Pressable>
        </Link>

        <Link href="/(tabs)/coach" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityState={onCoach ? { selected: true } : {}}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons
              name="flash-outline"
              size={22}
              color={onCoach ? colors.ink : colors.inkMuted}
            />
            {onCoach ? (
              <View style={styles.dot} />
            ) : (
              <View style={styles.dotSpacer} />
            )}
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
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
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(28, 26, 23, 0.08)',
      },
      default: {
        shadowColor: '#1C1A17',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  tab: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
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
    ...Platform.select({
      web: { cursor: 'pointer' } as object,
      default: {},
    }),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
