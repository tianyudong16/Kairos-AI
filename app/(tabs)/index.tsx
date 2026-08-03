import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScheduleTimeline } from '@/components/dashboard/ScheduleTimeline';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { addDays, formatDisplayDate } from '@/lib/schedule';
import { colors, fonts, radii } from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    tasksForSelectedDate,
    selectedDate,
    setSelectedDate,
    chronotype,
    sleep,
    peakWindowLabel,
    capacitySummary,
    categories,
    reorderTask,
    deleteTask,
    updateTask,
    optimizeSchedule,
  } = useApp();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Kairos AI</Text>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.date}>{formatDisplayDate(selectedDate)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => router.push('/(tabs)/settings')}
          style={styles.avatar}
        >
          <Ionicons name="settings-outline" size={20} color={colors.inkSoft} />
        </Pressable>
      </Animated.View>

      <View style={styles.dayNav}>
        <Pressable
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          style={styles.dayBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/calendar')} style={styles.dayCenter}>
          <Text style={styles.dayCenterText}>Calendar view</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
          style={styles.dayBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.delay(80)} style={styles.energyCard}>
        <View style={styles.energyTop}>
          <View style={styles.energyLabelRow}>
            <Ionicons name="flash" size={16} color={colors.energy} />
            <Text style={styles.energyLabel}>Energy: {peakWindowLabel}</Text>
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
        <Text style={styles.sleepLine}>
          Sleep window · wake {sleep.wakeTime} / bed {sleep.bedtime}
        </Text>
        <Text style={styles.capacityLine}>
          Focus load {capacitySummary.focusHours}h · capacity{' '}
          {capacitySummary.capacityHours}h
          {capacitySummary.overflowHours > 0
            ? ` · overflow ${capacitySummary.overflowHours}h`
            : ''}
        </Text>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today’s schedule</Text>
        <PrimaryButton
          label="Optimize"
          variant="secondary"
          onPress={() => optimizeSchedule(selectedDate)}
          style={styles.optimizeBtn}
        />
      </View>

      <View style={styles.legend}>
        {categories.map((cat) => (
          <View
            key={cat.id}
            style={[styles.legendItem, { backgroundColor: cat.soft }]}
          >
            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
            <Text style={[styles.legendText, { color: cat.color }]}>
              {cat.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/analytics')}
        style={styles.insightsLink}
      >
        <Text style={styles.insightsText}>Open Insights →</Text>
      </Pressable>

      <ScheduleTimeline
        tasks={tasksForSelectedDate}
        onMoveUp={(id) => reorderTask(id, 'up')}
        onMoveDown={(id) => reorderTask(id, 'down')}
        onDelete={deleteTask}
        onPriority={(id, priority) => updateTask(id, { priority })}
      />
    </ScrollView>
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
  headerText: { gap: 2 },
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
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCenter: {
    flex: 1,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCenterText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  energyCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
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
  sleepLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  capacityLine: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  optimizeBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  insightsLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  insightsText: {
    fontFamily: fonts.semibold,
    color: colors.coach,
    fontSize: 13,
  },
});
