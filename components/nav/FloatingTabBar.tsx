import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/theme';

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const onHome =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname.endsWith('/(tabs)/index') ||
    pathname.endsWith('/index');
  const onAnalytics =
    pathname.includes('analytics');
  const onCoach = pathname.includes('coach');

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8 },
      ]}
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={onHome ? { selected: true } : {}}
          onPress={() => router.replace('/(tabs)')}
          style={styles.tab}
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color={onHome ? colors.ink : colors.inkMuted}
          />
          {onHome ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add with AI"
          onPress={() => router.push('/ai-input')}
          style={({ pressed }) => [
            styles.fab,
            pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={onAnalytics ? { selected: true } : {}}
          onPress={() => router.replace('/(tabs)/analytics')}
          style={styles.tab}
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={onCoach ? { selected: true } : {}}
          onPress={() => router.replace('/(tabs)/coach')}
          style={styles.tab}
        >
          <Ionicons
            name="flash-outline"
            size={22}
            color={onCoach ? colors.ink : colors.inkMuted}
          />
          {onCoach ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
        </Pressable>
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
