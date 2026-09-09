import { Text, View } from 'react-native';

import { fonts, radii, useThemedStyles } from '@/constants/theme';

const bars = [
  { label: '6a', value: 0.25 },
  { label: '9a', value: 0.85 },
  { label: '12p', value: 0.55 },
  { label: '3p', value: 0.7 },
  { label: '6p', value: 0.4 },
  { label: '9p', value: 0.2 },
];

export function CircadianChart() {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.bgElevated,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      padding: 16,
      gap: 14,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 12,
      letterSpacing: 1.2,
      color: c.inkSoft,
    },
    chart: {
      height: 140,
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
    },
    col: {
      flex: 1,
      alignItems: 'center' as const,
      gap: 8,
    },
    track: {
      width: '70%',
      height: 110,
      borderRadius: radii.sm,
      backgroundColor: c.line,
      justifyContent: 'flex-end' as const,
      overflow: 'hidden' as const,
    },
    fill: {
      width: '100%',
      backgroundColor: c.selectedFill,
      borderRadius: radii.sm,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.inkMuted,
    },
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>CIRCADIAN CURVE</Text>
      <View style={styles.chart}>
        {bars.map((bar) => (
          <View key={bar.label} style={styles.col}>
            <View style={styles.track}>
              <View style={[styles.fill, { height: `${bar.value * 100}%` }]} />
            </View>
            <Text style={styles.label}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
