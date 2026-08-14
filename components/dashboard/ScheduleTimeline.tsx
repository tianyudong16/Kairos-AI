import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PriorityTag } from '@/components/ui/PriorityTag';
import type { Priority, Task } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import {
  addMinutesToTime,
  formatDuration,
  normalizeTimeInput,
  timeToMinutes,
} from '@/lib/schedule';

const iconMap = {
  run: 'walk-outline',
  code: 'logo-react',
  people: 'people-outline',
  food: 'restaurant-outline',
  mail: 'mail-outline',
  book: 'book-outline',
} as const;

type Props = {
  tasks: Task[];
  onMoveEarlier?: (id: string) => void;
  onMoveLater?: (id: string) => void;
  onMoveTomorrow?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPriority?: (id: string, priority: Priority) => void;
  onUpdateTiming?: (
    id: string,
    patch: { start?: string; durationMinutes?: number }
  ) => void;
};

export function ScheduleTimeline({
  tasks,
  onMoveEarlier,
  onMoveLater,
  onMoveTomorrow,
  onDelete,
  onPriority,
  onUpdateTiming,
}: Props) {
  const { getCategory } = useApp();
  const { colors } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDraft, setStartDraft] = useState('');
  const [durationDraft, setDurationDraft] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

  const styles = useThemedStyles((c) => ({
    wrap: { gap: 12 },
    legend: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 16,
      marginBottom: 2,
    },
    empty: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 16,
      gap: 4,
    },
    emptyTitle: { fontFamily: fonts.semibold, color: c.ink },
    emptyBody: { fontFamily: fonts.body, color: c.inkMuted, fontSize: 13 },
    row: { flexDirection: 'row' as const, gap: 12, alignItems: 'stretch' as const },
    timeCol: { width: 48, alignItems: 'center' as const },
    time: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
      marginBottom: 6,
    },
    rail: { width: 3, flex: 1, borderRadius: 2, opacity: 0.7 },
    card: {
      flex: 1,
      borderRadius: radii.md,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
      minHeight: 64,
      borderWidth: 1,
    },
    accent: { width: 6 },
    cardBody: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center' as const,
      gap: 6,
    },
    titleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    title: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    catPill: {
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    catText: {
      color: c.white,
      fontFamily: fonts.bold,
      fontSize: 10,
      letterSpacing: 0.4,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkSoft,
    },
    actions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      marginTop: 2,
    },
    actionChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    actionDisabled: { opacity: 0.4 },
    actionLabel: { fontFamily: fonts.semibold, fontSize: 12, color: c.ink },
    actionLabelDisabled: { color: c.inkMuted },
    deleteChip: { borderColor: c.alertSoft, backgroundColor: c.alertSoft },
    editBox: {
      marginTop: 4,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 10,
    },
    editRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
    editField: { flex: 1, gap: 4 },
    editLabel: { fontFamily: fonts.medium, fontSize: 11, color: c.inkMuted },
    editInput: {
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.ink,
    },
    nudgeBtn: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    nudgeText: { fontFamily: fonts.semibold, fontSize: 12, color: c.ink },
    error: { fontFamily: fonts.medium, fontSize: 12, color: c.alert },
    saveBtn: {
      borderRadius: radii.pill,
      backgroundColor: c.today,
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignSelf: 'flex-start' as const,
    },
    saveText: { fontFamily: fonts.bold, fontSize: 12, color: c.white },
  }));

  const openEditor = (task: Task) => {
    setEditingId(task.id);
    setStartDraft(task.start);
    setDurationDraft(String(task.durationMinutes));
    setTimeError(null);
  };

  const saveTiming = (task: Task) => {
    if (!onUpdateTiming) return;
    const start = normalizeTimeInput(startDraft);
    const durationMinutes = parseInt(durationDraft, 10);
    if (!start) {
      setTimeError('Use a time like 9:30 or 2:15pm');
      return;
    }
    if (!durationMinutes || durationMinutes < 5 || durationMinutes > 12 * 60) {
      setTimeError('Duration must be 5–720 minutes');
      return;
    }
    onUpdateTiming(task.id, { start, durationMinutes });
    setEditingId(null);
    setTimeError(null);
  };

  const nudgeStart = (task: Task, delta: number) => {
    if (!onUpdateTiming) return;
    const next = addMinutesToTime(task.start, delta);
    onUpdateTiming(task.id, { start: next });
    if (editingId === task.id) setStartDraft(next);
  };

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => a.order - b.order || timeToMinutes(a.start) - timeToMinutes(b.start)
      ),
    [tasks]
  );

  return (
    <View style={styles.wrap}>
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>Tap + to add tasks with AI or manually.</Text>
        </View>
      ) : (
        <Text style={styles.legend}>
          Edit time, nudge ±15m, or use Earlier / Later to reshuffle the day.
        </Text>
      )}
      {sorted.map((task, index) => {
        const meta = getCategory(task.category);
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;
        const isEditing = editingId === task.id;
        return (
          <Animated.View
            key={task.id}
            entering={FadeInDown.delay(index * 40).springify()}
            style={styles.row}
          >
            <View style={styles.timeCol}>
              <Text style={styles.time}>{task.start}</Text>
              <View style={[styles.rail, { backgroundColor: meta.color }]} />
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: meta.soft, borderColor: meta.color },
              ]}
            >
              <View style={[styles.accent, { backgroundColor: meta.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Ionicons
                    name={iconMap[task.icon] as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={meta.color}
                  />
                  <Text style={styles.title}>{task.title}</Text>
                  <View style={[styles.catPill, { backgroundColor: meta.color }]}>
                    <Text style={styles.catText}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {task.start} – {task.end} · {formatDuration(task.durationMinutes)}
                </Text>
                {onPriority ? (
                  <PriorityTag
                    priority={task.priority}
                    onChange={(next) => onPriority(task.id, next)}
                  />
                ) : (
                  <PriorityTag priority={task.priority} />
                )}

                <View style={styles.actions}>
                  {onUpdateTiming ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Nudge start 15 minutes earlier"
                        onPress={() => nudgeStart(task, -15)}
                        style={styles.actionChip}
                      >
                        <Text style={styles.actionLabel}>−15m</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Nudge start 15 minutes later"
                        onPress={() => nudgeStart(task, 15)}
                        style={styles.actionChip}
                      >
                        <Text style={styles.actionLabel}>+15m</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          isEditing ? 'Close time editor' : 'Edit task time'
                        }
                        onPress={() =>
                          isEditing ? setEditingId(null) : openEditor(task)
                        }
                        style={styles.actionChip}
                      >
                        <Ionicons name="time-outline" size={14} color={colors.ink} />
                        <Text style={styles.actionLabel}>
                          {isEditing ? 'Close' : 'Edit time'}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                  {onMoveEarlier ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move earlier in the day"
                      disabled={isFirst}
                      onPress={() => onMoveEarlier(task.id)}
                      style={[styles.actionChip, isFirst && styles.actionDisabled]}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={14}
                        color={isFirst ? colors.inkMuted : colors.ink}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          isFirst && styles.actionLabelDisabled,
                        ]}
                      >
                        Earlier
                      </Text>
                    </Pressable>
                  ) : null}
                  {onMoveLater ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move later in the day"
                      disabled={isLast}
                      onPress={() => onMoveLater(task.id)}
                      style={[styles.actionChip, isLast && styles.actionDisabled]}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={14}
                        color={isLast ? colors.inkMuted : colors.ink}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          isLast && styles.actionLabelDisabled,
                        ]}
                      >
                        Later
                      </Text>
                    </Pressable>
                  ) : null}
                  {onMoveTomorrow ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move task to tomorrow"
                      onPress={() => onMoveTomorrow(task.id)}
                      style={styles.actionChip}
                    >
                      <Ionicons name="calendar-outline" size={14} color={colors.ink} />
                      <Text style={styles.actionLabel}>Tomorrow</Text>
                    </Pressable>
                  ) : null}
                  {onDelete ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete task"
                      onPress={() => onDelete(task.id)}
                      style={[styles.actionChip, styles.deleteChip]}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.alert} />
                    </Pressable>
                  ) : null}
                </View>

                {isEditing && onUpdateTiming ? (
                  <View style={styles.editBox}>
                    <View style={styles.editRow}>
                      <View style={styles.editField}>
                        <Text style={styles.editLabel}>Start</Text>
                        <TextInput
                          value={startDraft}
                          onChangeText={setStartDraft}
                          placeholder="9:30am"
                          placeholderTextColor={colors.inkMuted}
                          style={styles.editInput}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.editField}>
                        <Text style={styles.editLabel}>Duration (min)</Text>
                        <TextInput
                          value={durationDraft}
                          onChangeText={setDurationDraft}
                          placeholder="60"
                          placeholderTextColor={colors.inkMuted}
                          keyboardType="number-pad"
                          style={styles.editInput}
                        />
                      </View>
                    </View>
                    {timeError ? <Text style={styles.error}>{timeError}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Save task timing"
                      onPress={() => saveTiming(task)}
                      style={styles.saveBtn}
                    >
                      <Text style={styles.saveText}>Save time</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
