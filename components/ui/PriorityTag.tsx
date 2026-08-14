import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import type { Priority } from '@/context/AppContext';

const order: Priority[] = ['high', 'medium', 'low'];

export function PriorityTag({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange?: (next: Priority) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    tag: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    label: {
      color: c.white,
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    choice: {
      borderRadius: radii.pill,
      borderWidth: 1.5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 52,
      alignItems: 'center' as const,
    },
    choiceLabel: {
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.4,
    },
  }));

  const metaByPriority = useMemo(
    () =>
      ({
        high: {
          label: 'HIGH',
          color: colors.priorityHigh,
          soft: colors.priorityHighSoft,
        },
        medium: {
          label: 'MED',
          color: colors.priorityMedium,
          soft: colors.priorityMediumSoft,
        },
        low: {
          label: 'LOW',
          color: colors.priorityLow,
          soft: colors.priorityLowSoft,
        },
      }) as const,
    [colors]
  );

  const meta = metaByPriority[priority];

  if (!onChange) {
    return (
      <View style={[styles.tag, { backgroundColor: meta.color }]}>
        <Text style={styles.label}>{meta.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {order.map((value) => {
        const active = value === priority;
        const tone = metaByPriority[value];
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Set priority ${value}`}
            onPress={() => onChange(value)}
            style={[
              styles.choice,
              {
                backgroundColor: active ? tone.color : tone.soft,
                borderColor: tone.color,
              },
            ]}
          >
            <Text style={[styles.choiceLabel, { color: active ? colors.white : tone.color }]}>
              {tone.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
