import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackButton } from '@/components/nav/ScreenBackButton';
import { useApp } from '@/context/AppContext';
import { shareIcsFile, tasksToIcs } from '@/lib/ics';
import {
  formatDisplayDate,
  getMonthMatrix,
  isToday,
  parseDateKey,
  startOfWeek,
  toDateKey,
  addDays,
} from '@/lib/schedule';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const calendarPorts = [
  {
    key: 'google',
    title: 'Google Calendar',
    meta: 'Import events in · export Kairos tasks out',
    icon: 'logo-google' as const,
    href: '/calendar-sync',
  },
  {
    key: 'outlook',
    title: 'Outlook / Microsoft 365',
    meta: 'Import events in · export Kairos tasks out',
    icon: 'mail-outline' as const,
    href: '/calendar-sync',
  },
  {
    key: 'device',
    title: 'Apple / Samsung',
    meta: 'Import & export with calendars on this phone',
    icon: 'phone-portrait-outline' as const,
    href: '/calendar-sync',
  },
  {
    key: 'ics-import',
    title: 'Import .ics file',
    meta: 'One-time upload from Outlook, Google, or Apple export',
    icon: 'download-outline' as const,
    href: '/import-calendar',
  },
] as const;

export default function CalendarScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { tasks, selectedDate, setSelectedDate, tasksForSelectedDate } = useApp();
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [exportNote, setExportNote] = useState<string | null>(null);
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
    sectionLabel: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: c.ink,
      marginTop: 4,
    },
    sectionHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.inkMuted,
      lineHeight: 18,
      marginTop: -6,
    },
    portRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    portIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.calendarSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    portCopy: { flex: 1, gap: 2 },
    portTitle: { fontFamily: fonts.semibold, color: c.ink },
    portMeta: { fontFamily: fonts.body, fontSize: 12, color: c.inkMuted, lineHeight: 16 },
    exportNote: { fontFamily: fonts.medium, fontSize: 12, color: c.health },
  }));

  const exportSchedule = () => {
    if (!tasks.length) {
      const empty = 'Add some tasks first, then export them as a .ics file.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(empty);
      } else {
        Alert.alert('Nothing to export', empty);
      }
      return;
    }
    const ics = tasksToIcs(tasks);
    const result = shareIcsFile(`kairos-schedule-${selectedDate}.ics`, ics);
    const note =
      result === 'downloaded'
        ? `Downloaded ${tasks.length} tasks as .ics — open in Google, Outlook, or Apple Calendar.`
        : `Copied ${tasks.length} tasks as .ics text — paste into a .ics file or calendar import.`;
    setExportNote(note);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <ScreenBackButton fallbackHref="/(tabs)" />
      <Text style={styles.brand}>Kairos AI</Text>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Plan by week or month — tap a day to focus it.</Text>

      <Text style={styles.sectionLabel}>Import & export</Text>
      <Text style={styles.sectionHint}>
        Bring events in from Google, Outlook, or Apple — or send your Kairos schedule out.
      </Text>
      {calendarPorts.map((port) => (
        <Pressable
          key={port.key}
          accessibilityRole="button"
          accessibilityLabel={`${port.title}. ${port.meta}`}
          onPress={() => router.push(port.href as any)}
          style={styles.portRow}
        >
          <View style={styles.portIcon}>
            <Ionicons name={port.icon} size={18} color={colors.calendar} />
          </View>
          <View style={styles.portCopy}>
            <Text style={styles.portTitle}>{port.title}</Text>
            <Text style={styles.portMeta}>{port.meta}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export Kairos schedule as ics file"
        onPress={exportSchedule}
        style={styles.portRow}
      >
        <View style={styles.portIcon}>
          <Ionicons name="share-outline" size={18} color={colors.calendar} />
        </View>
        <View style={styles.portCopy}>
          <Text style={styles.portTitle}>Export .ics file</Text>
          <Text style={styles.portMeta}>
            Download your Kairos tasks for Outlook, Google, or Apple
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>
      {exportNote ? <Text style={styles.exportNote}>{exportNote}</Text> : null}

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
