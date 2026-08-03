import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CircadianChart } from '@/components/analytics/CircadianChart';
import { FocusRing } from '@/components/analytics/FocusRing';
import { FloatingTabBar } from '@/components/nav/FloatingTabBar';
import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, fonts, radii } from '@/constants/theme';

const metrics = [
  { label: 'High Focus', value: '4.5h' },
  { label: 'Scheduled', value: '7.5h' },
  { label: 'Burnout Risk', value: 'Low' },
  { label: 'Efficiency', value: '91%' },
];

export default function AnalyticsScreen() {
  const router = useRouter();

  return (
    <AppShell footer={<FloatingTabBar />}>
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
            <Text style={styles.scoreValue}>87 / 100</Text>
            <Text style={styles.scoreHint}>Above your weekly average</Text>
          </View>
          <FocusRing score={87} />
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
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 20,
  },
  brand: {
    fontFamily: fonts.brandItalic,
    fontSize: 24,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.ink,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  scoreCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCopy: {
    gap: 4,
    flex: 1,
    paddingRight: 12,
  },
  scoreLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkMuted,
  },
  scoreValue: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.ink,
  },
  scoreHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
    minWidth: 140,
  },
  metricLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkMuted,
  },
  metricValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.ink,
  },
});
