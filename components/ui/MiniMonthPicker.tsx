import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import {
  getMonthMatrix,
  isToday,
  parseDateKey,
  toDateKey,
} from '@/lib/schedule';

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = {
  value: string;
  onChange: (dateKey: string) => void;
};

/** Compact month grid for picking a task date. */
export function MiniMonthPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const selected = parseDateKey(value || toDateKey(new Date()));
  const [cursor, setCursor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  const matrix = useMemo(
    () => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const styles = useThemedStyles((c) => ({
    wrap: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 10,
      gap: 8,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    title: { fontFamily: fonts.semibold, fontSize: 14, color: c.ink },
    nav: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.line,
    },
    labels: { flexDirection: 'row' as const },
    label: {
      flex: 1,
      textAlign: 'center' as const,
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.inkMuted,
    },
    row: { flexDirection: 'row' as const },
    cell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 8,
      margin: 1,
    },
    cellActive: { backgroundColor: c.today },
    cellToday: { borderWidth: 1, borderColor: c.today },
    cellMuted: { opacity: 0.35 },
    cellText: { fontFamily: fonts.medium, fontSize: 12, color: c.ink },
    cellTextActive: { color: c.white, fontFamily: fonts.semibold },
    selectedLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkSoft,
      textAlign: 'center' as const,
    },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          style={styles.nav}
        >
          <Ionicons name="chevron-back" size={16} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          style={styles.nav}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.labels}>
        {weekdays.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.label}>
            {d}
          </Text>
        ))}
      </View>
      {matrix.map((week) => (
        <View key={week[0]} style={styles.row}>
          {week.map((day) => {
            const inMonth = parseDateKey(day).getMonth() === cursor.getMonth();
            const active = day === value;
            const today = isToday(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`Select ${day}`}
                onPress={() => {
                  onChange(day);
                  const picked = parseDateKey(day);
                  setCursor(new Date(picked.getFullYear(), picked.getMonth(), 1));
                }}
                style={[
                  styles.cell,
                  active && styles.cellActive,
                  !active && today && styles.cellToday,
                  !inMonth && styles.cellMuted,
                ]}
              >
                <Text
                  style={[styles.cellText, active && styles.cellTextActive]}
                >
                  {parseDateKey(day).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={styles.selectedLabel}>
        {value
          ? parseDateKey(value).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Pick a date'}
      </Text>
    </View>
  );
}
