import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import {
  formatDisplayDate,
  getMonthMatrix,
  isToday,
  parseDateKey,
  startOfWeek,
  toDateKey,
  addDays,
} from '@/lib/schedule';
import { fonts, radii, useThemedStyles } from '@/constants/theme';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
  const router = useRouter();
  const { tasks, selectedDate, setSelectedDate, tasksForSelectedDate } = useApp();
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const selected = parseDateKey(selectedDate);
  const selectedIsToday = isToday(selectedDate);
  const [monthCursor, setMonthCursor] = useState(
    new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  const weekStart = startOfWeek(selectedDate);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const monthMatrix = useMemo(
    () => getMonthMatrix(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((task) => {
      map[task.date] = (map[task.date] || 0) + 1;
    });
    return map;
  }, [tasks]);

  const styles = useThemedStyles((c) => ({
    content: { gap: 14, paddingBottom: 24 },
    brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: c.ink },
    title: { fontFamily: fonts.bold, fontSize: 28, color: c.ink },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: c.inkMuted },
    modeRow: { flexDirection: 'row' as const, gap: 8 },
    modeChip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.bgElevated,
    },
    modeChipActive: { backgroundColor: c.ink, borderColor: c.ink },
    modeText: { fontFamily: fonts.medium, color: c.ink },
    modeTextActive: { color: c.white },
    weekGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    dayCard: {
      width: '31%' as const,
      flexGrow: 1,
      minWidth: 96,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 10,
      gap: 4,
    },
    dayCardActive: { backgroundColor: c.ink, borderColor: c.ink },
    weekday: { fontFamily: fonts.medium, fontSize: 12, color: c.inkMuted },
    dayNum: { fontFamily: fonts.bold, fontSize: 20, color: c.ink },
    count: { fontFamily: fonts.body, fontSize: 11, color: c.inkSoft },
    onDark: { color: c.white },
    monthWrap: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 12,
      gap: 8,
    },
    monthHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    monthTitle: { fontFamily: fonts.semibold, color: c.ink, fontSize: 16 },
    monthNav: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: c.ink,
      paddingHorizontal: 8,
    },
    monthLabels: { flexDirection: 'row' as const },
    monthLabel: {
      flex: 1,
      textAlign: 'center' as const,
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
    },
    monthRow: { flexDirection: 'row' as const },
    monthCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 10,
      margin: 1,
    },
    monthCellActive: { backgroundColor: c.ink },
    monthCellMuted: { opacity: 0.45 },
    monthCellText: { fontFamily: fonts.medium, color: c.ink },
    mutedText: { color: c.inkMuted },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.energy,
      marginTop: 2,
    },
    selectedBlock: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 14,
      gap: 10,
    },
    selectedEyebrow: {
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.8,
      color: c.calendar,
      textTransform: 'uppercase' as const,
    },
    selectedTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.ink },
    selectedEmpty: { fontFamily: fonts.body, color: c.inkMuted },
    selectedItem: { fontFamily: fonts.medium, color: c.inkSoft, fontSize: 13 },
    addBtn: { marginTop: 4 },
    viewDayLink: {
      alignSelf: 'center' as const,
      paddingVertical: 6,
    },
    viewDayText: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: c.work,
    },
    todayBtn: {
      alignSelf: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
    },
    todayText: { fontFamily: fonts.semibold, color: c.ink },
  }));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.brand}>Kairos AI</Text>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Plan by week or month — tap a day to focus it.</Text>

      <View style={styles.modeRow}>
        {(['week', 'month'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            style={[styles.modeChip, mode === value && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, mode === value && styles.modeTextActive]}>
              {value === 'week' ? 'Week' : 'Month'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'week' ? (
        <View style={styles.weekGrid}>
          {weekDays.map((day, index) => {
            const active = day === selectedDate;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDate(day)}
                style={[styles.dayCard, active && styles.dayCardActive]}
              >
                <Text style={[styles.weekday, active && styles.onDark]}>
                  {weekdays[index]}
                </Text>
                <Text style={[styles.dayNum, active && styles.onDark]}>
                  {parseDateKey(day).getDate()}
                </Text>
                <Text style={[styles.count, active && styles.onDark]}>
                  {counts[day] || 0} tasks
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.monthWrap}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
                )
              }
            >
              <Text style={styles.monthNav}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {monthCursor.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Pressable
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
                )
              }
            >
              <Text style={styles.monthNav}>›</Text>
            </Pressable>
          </View>
          <View style={styles.monthLabels}>
            {weekdays.map((d) => (
              <Text key={d} style={styles.monthLabel}>
                {d[0]}
              </Text>
            ))}
          </View>
          {monthMatrix.map((week) => (
            <View key={week[0]} style={styles.monthRow}>
              {week.map((day) => {
                const inMonth =
                  parseDateKey(day).getMonth() === monthCursor.getMonth();
                const active = day === selectedDate;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDate(day)}
                    style={[
                      styles.monthCell,
                      active && styles.monthCellActive,
                      !inMonth && styles.monthCellMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        active && styles.onDark,
                        !inMonth && styles.mutedText,
                      ]}
                    >
                      {parseDateKey(day).getDate()}
                    </Text>
                    {counts[day] ? <View style={styles.dot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View style={styles.selectedBlock}>
        <Text style={styles.selectedEyebrow}>
          {selectedIsToday ? 'Selected · Today' : 'Selected day'}
        </Text>
        <Text style={styles.selectedTitle}>{formatDisplayDate(selectedDate)}</Text>
        {tasksForSelectedDate.length === 0 ? (
          <Text style={styles.selectedEmpty}>
            No tasks on this day yet — add some below.
          </Text>
        ) : (
          tasksForSelectedDate.map((task) => (
            <Text key={task.id} style={styles.selectedItem}>
              {task.start} · {task.title}
            </Text>
          ))
        )}
        <PrimaryButton
          label={
            selectedIsToday
              ? 'Add tasks for today'
              : `Add tasks for ${formatDisplayDate(selectedDate).split(',')[0]}`
          }
          onPress={() => router.push('/ai-input')}
          style={styles.addBtn}
        />
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={styles.viewDayLink}
        >
          <Text style={styles.viewDayText}>
            {selectedIsToday
              ? 'Open today’s schedule →'
              : `Open ${formatDisplayDate(selectedDate).split(',')[0]} schedule →`}
          </Text>
        </Pressable>
      </View>

      {!selectedIsToday ? (
        <Pressable
          onPress={() => setSelectedDate(toDateKey(new Date()))}
          style={styles.todayBtn}
        >
          <Text style={styles.todayText}>Jump to today</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
