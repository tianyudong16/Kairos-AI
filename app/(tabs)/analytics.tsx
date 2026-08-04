import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CircadianChart } from '@/components/analytics/CircadianChart';
import { FocusRing } from '@/components/analytics/FocusRing';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useThemedStyles } from '@/constants/theme';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { capacitySummary, tasksForSelectedDate, sleep } = useApp();
  const styles = useThemedStyles((c) => ({
    content: {
      gap: 16,
      paddingBottom: 20,
    },
    brand: {
      fontFamily: fonts.brandItalic,
      fontSize: 24,
      color: c.ink,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: c.ink,
      marginTop: 2,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.inkMuted,
      marginTop: 4,
    },
    scoreCard: {
      backgroundColor: c.bgElevated,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      padding: 18,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    scoreCopy: {
      gap: 4,
      flex: 1,
      paddingRight: 12,
    },
    scoreLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.inkMuted,
    },
    scoreValue: {
      fontFamily: fonts.bold,
      fontSize: 30,
      color: c.ink,
    },
    scoreHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.inkSoft,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
    },
    metric: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: c.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      gap: 6,
      minWidth: 140,
    },
    metricLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.inkMuted,
    },
    metricValue: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: c.ink,
    },
  }));
  const scheduledHours =
    Math.round(
      (tasksForSelectedDate.reduce((sum, t) => sum + t.durationMinutes, 0) / 60) *
        10
    ) / 10;
  const score = Math.max(
    40,
    Math.min(
      98,
      Math.round(
        100 -
          capacitySummary.overflowHours * 12 +
          (capacitySummary.focusHours > 0 ? 4 : 0)
      )
    )
  );

  const metrics = [
    { label: 'High Focus', value: `${capacitySummary.focusHours}h` },
    { label: 'Scheduled', value: `${scheduledHours}h` },
    {
      label: 'Burnout Risk',
      value: capacitySummary.overflowHours > 1.5 ? 'High' : capacitySummary.overflowHours > 0 ? 'Med' : 'Low',
    },
    {
      label: 'Sleep Cap',
      value: `${sleep.wakeTime}-${sleep.bedtime}`,
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInDown}>
        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Insights from today’s rhythm</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80)} style={styles.scoreCard}>
        <View style={styles.scoreCopy}>
          <Text style={styles.scoreLabel}>Focus Score</Text>
          <Text style={styles.scoreValue}>{score} / 100</Text>
          <Text style={styles.scoreHint}>
            Capacity {capacitySummary.capacityHours}h · overflow{' '}
            {capacitySummary.overflowHours}h
          </Text>
        </View>
        <FocusRing score={score} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140)}>
        <CircadianChart />
      </Animated.View>

      <View style={styles.grid}>
        {metrics.map((metric, index) => (
          <Animated.View
            key={metric.label}
            entering={FadeInDown.delay(180 + index * 40)}
            style={styles.metric}
          >
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </Animated.View>
        ))}
      </View>

      <PrimaryButton
        label="View AI Coach →"
        variant="secondary"
        onPress={() => router.push('/(tabs)/coach')}
      />
    </ScrollView>
  );
}
