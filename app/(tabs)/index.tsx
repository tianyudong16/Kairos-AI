import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScheduleTimeline } from '@/components/dashboard/ScheduleTimeline';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { addDays, formatDisplayDate, isToday, toDateKey } from '@/lib/schedule';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    content: {
      paddingBottom: 20,
      gap: 16,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
    },
    headerText: { gap: 2 },
    brand: {
      fontFamily: fonts.brandItalic,
      fontSize: 26,
      color: c.ink,
      marginBottom: 4,
    },
    greeting: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: c.ink,
    },
    date: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.inkMuted,
    },
    viewingBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.work,
      backgroundColor: c.workSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    viewingCopy: { flex: 1, gap: 2 },
    viewingTitle: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: c.work,
    },
    viewingMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkSoft,
    },
    jumpToday: {
      borderRadius: radii.pill,
      backgroundColor: c.work,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    jumpTodayText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: c.white,
    },
    avatar: {
      alignItems: 'center' as const,
      gap: 4,
      minWidth: 56,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: c.work,
      backgroundColor: c.workSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarInitials: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: c.work,
    },
    avatarLabel: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      color: c.work,
    },
    dayNav: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    dayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dayCenter: {
      flex: 1,
      height: 36,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 10,
    },
    dayCenterText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.inkSoft,
    },
    energyCard: {
      backgroundColor: c.bgElevated,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      padding: 16,
      gap: 8,
    },
    energyTop: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    energyLabelRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    energyLabel: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: c.ink,
    },
    chrono: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
    },
    sleepLine: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.inkSoft,
    },
    capacityLine: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
    },
    sectionTitle: {
      flex: 1,
      fontFamily: fonts.semibold,
      fontSize: 16,
      color: c.ink,
    },
    optimizeBtn: {
      minHeight: 40,
      paddingHorizontal: 14,
    },
    legend: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    legendItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
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
      alignSelf: 'flex-start' as const,
      paddingVertical: 4,
    },
    insightsText: {
      fontFamily: fonts.semibold,
      color: c.coach,
      fontSize: 13,
    },
  }));
  const {
    tasksForSelectedDate,
    selectedDate,
    setSelectedDate,
    chronotype,
    sleep,
    peakWindowLabel,
    capacitySummary,
    categories,
    deleteTask,
    updateTask,
    optimizeSchedule,
    user,
  } = useApp();

  const viewingToday = isToday(selectedDate);
  const firstName =
    user?.name && !user.isGuest ? `, ${user.name.split(' ')[0]}` : '';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>Kairos AI</Text>
          <Text style={styles.greeting}>
            {viewingToday ? `Good morning${firstName}` : `Schedule${firstName}`}
          </Text>
          <Text style={styles.date}>{formatDisplayDate(selectedDate)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
          style={styles.avatar}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(user?.name || 'You')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || '')
                .join('') || 'Y'}
            </Text>
          </View>
          <Text style={styles.avatarLabel}>Profile</Text>
        </Pressable>
      </Animated.View>

      {!viewingToday ? (
        <View
          style={styles.viewingBanner}
          accessibilityLabel={`Viewing another day: ${formatDisplayDate(selectedDate)}`}
        >
          <View style={styles.viewingCopy}>
            <Text style={styles.viewingTitle}>Viewing another day</Text>
            <Text style={styles.viewingMeta}>
              Not today — showing {formatDisplayDate(selectedDate)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today’s schedule"
            onPress={() => setSelectedDate(toDateKey(new Date()))}
            style={styles.jumpToday}
          >
            <Text style={styles.jumpTodayText}>Today</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.dayNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          style={styles.dayBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open calendar"
          onPress={() => router.push('/(tabs)/calendar')}
          style={styles.dayCenter}
        >
          <Text style={styles.dayCenterText}>
            {viewingToday ? 'Today · Calendar' : 'Pick another day'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
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
        <Text style={styles.sectionTitle}>
          {viewingToday
            ? 'Today’s schedule'
            : `${formatDisplayDate(selectedDate)} schedule`}
        </Text>
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
        onDelete={deleteTask}
        onPriority={(id, priority) => updateTask(id, { priority })}
      />
    </ScrollView>
  );
}
