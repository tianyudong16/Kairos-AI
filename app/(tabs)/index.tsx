import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScheduleTimeline } from '@/components/dashboard/ScheduleTimeline';
import { AppShell } from '@/components/ui/AppShell';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

export default function DashboardScreen() {
  const { tasks, chronotype } = useApp();

  return (
    <AppShell withTabBarPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>Kairos AI</Text>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.date}>Monday · Aug 3</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.inkSoft} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.energyCard}>
          <View style={styles.energyTop}>
            <View style={styles.energyLabelRow}>
              <Ionicons name="flash" size={16} color={colors.energy} />
              <Text style={styles.energyLabel}>Energy: Peak Focus</Text>
            </View>
            <Text style={styles.chrono}>
              {chronotype === 'early-bird'
                ? 'Early Bird'
                : chronotype === 'night-owl'
                  ? 'Night Owl'
                  : chronotype === 'mid-morning'
                    ? 'Mid-Morning'
                    : 'Morning Person'}
            </Text>
          </View>
          <View style={styles.wave}>
            {[0.35, 0.55, 0.9, 0.7, 0.45, 0.3, 0.2].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: 18 + h * 28 }]} />
            ))}
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Today’s schedule</Text>
        <ScheduleTimeline tasks={tasks} />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    gap: 2,
  },
  brand: {
    fontFamily: fonts.brandItalic,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 4,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.ink,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 14,
  },
  energyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  energyLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  chrono: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  wave: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  waveBar: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.ink,
    opacity: 0.85,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
    marginTop: 4,
  },
});
