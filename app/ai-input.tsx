import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppShell } from '@/components/ui/AppShell';
import { CategoryEditModal } from '@/components/ui/CategoryEditModal';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PriorityTag } from '@/components/ui/PriorityTag';
import { Category, DraftTask, Priority, useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import {
  addDays,
  formatDisplayDate,
  formatDuration,
  formatShortDate,
  isToday,
  parseDuration,
  toDateKey,
} from '@/lib/schedule';

type Mode = 'ai' | 'manual';

export default function AiInputScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    addDraftTasks,
    selectedDate,
    setSelectedDate,
    categories,
    getCategory,
  } = useApp();
  const [mode, setMode] = useState<Mode>('manual');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    'I need 2h to code React, 45min cardio before 5pm, and lunch at noon...'
  );
  const [drafts, setDrafts] = useState<DraftTask[]>([
    {
      id: 'seed-1',
      title: 'Deep work block',
      durationMinutes: 90,
      category: 'work',
      priority: 'high',
    },
    {
      id: 'seed-2',
      title: 'Recovery walk',
      durationMinutes: 30,
      category: 'health',
      priority: 'medium',
    },
  ]);

  const [title, setTitle] = useState('');
  const [durationText, setDurationText] = useState('60');
  const [category, setCategory] = useState<Category>('work');
  const [priority, setPriority] = useState<Priority>('high');

  const todayKey = toDateKey(new Date());
  const dateOptions = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(todayKey, i)),
    [todayKey]
  );

  const categoryIds = categories.map((c) => c.id);
  const parsePrompt = () => {
    const chunks = prompt
      .split(/,| and /i)
      .map((part) => part.trim())
      .filter(Boolean);

    const next: DraftTask[] = chunks.map((chunk, index) => {
      const durationMinutes = parseDuration(chunk);
      const lower = chunk.toLowerCase();
      const categoryGuess: Category = /cardio|run|gym|workout|walk/.test(lower)
        ? 'health'
        : /lunch|dinner|errand|break/.test(lower)
          ? 'life'
          : /study|exam|read|calculus/.test(lower)
            ? 'study'
            : 'work';
      const titleGuess =
        chunk
          .replace(/i need|to|before.*|at noon|at \d+.*/gi, '')
          .replace(/\d+\s*h|\d+\s*m/gi, '')
          .replace(/code/i, 'Code')
          .trim() || `Task ${index + 1}`;

      return {
        id: `draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        title: titleGuess.slice(0, 40),
        durationMinutes,
        category: categoryGuess,
        priority: (categoryGuess === 'work' ? 'high' : 'medium') as Priority,
        preferredStart: /noon/.test(lower)
          ? '12:00'
          : /before\s*5/.test(lower)
            ? '16:00'
            : undefined,
      };
    });

    setDrafts(next);
  };

  const addManual = () => {
    if (!title.trim()) return;
    const durationMinutes = Math.max(15, parseInt(durationText, 10) || 60);
    setDrafts((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        durationMinutes,
        category,
        priority,
      },
    ]);
    setTitle('');
  };

  const moveDraft = (id: string, direction: 'up' | 'down') => {
    setDrafts((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index < 0) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const cycleCategory = (id: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id) return draft;
        const idx = categoryIds.indexOf(draft.category);
        const next = categoryIds[(idx + 1) % categoryIds.length] || categoryIds[0];
        return { ...draft, category: next };
      })
    );
  };

  const styles = useThemedStyles((c) => ({
    topBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 12,
    },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.line,
    },
    topTitle: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: c.inkSoft,
    },
    modeRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 12 },
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
    content: { gap: 14, paddingBottom: 20, flexGrow: 1 },
    brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: c.ink },
    title: { fontFamily: fonts.bold, fontSize: 26, color: c.ink },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.inkMuted,
      lineHeight: 20,
    },
    dateSection: { gap: 8 },
    dateLabel: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.inkSoft,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    dateScroll: { gap: 8, paddingVertical: 2 },
    dateChip: {
      minWidth: 72,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center' as const,
      gap: 2,
    },
    dateChipActive: {
      backgroundColor: c.today,
      borderColor: c.today,
    },
    dateChipWeekday: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 0.4,
    },
    dateChipDay: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: c.ink,
    },
    dateChipMonth: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: c.inkSoft,
    },
    dateOnActive: { color: c.white },
    selectedHint: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.work,
    },
    inputRow: {
      flexDirection: 'row' as const,
      gap: 10,
      alignItems: 'flex-end' as const,
    },
    input: {
      flex: 1,
      minHeight: 110,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      borderStyle: 'dashed' as const,
      backgroundColor: c.bgElevated,
      padding: 16,
      fontFamily: fonts.body,
      fontSize: 15,
      color: c.ink,
      textAlignVertical: 'top' as const,
    },
    parseBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.today,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
    },
    manualBox: { gap: 10 },
    singleInput: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.body,
      color: c.ink,
    },
    fieldRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    fieldLabel: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.inkSoft,
      marginTop: 2,
    },
    manageLink: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.energy,
    },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    miniChip: {
      borderRadius: radii.pill,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    miniChipText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      textTransform: 'capitalize' as const,
    },
    parsedBlock: { gap: 12, marginTop: 4 },
    parsedTitle: {
      fontFamily: fonts.bold,
      fontSize: 12,
      letterSpacing: 1.1,
      color: c.inkSoft,
    },
    emptyQueue: {
      fontFamily: fonts.body,
      color: c.inkMuted,
      fontSize: 13,
    },
    parsedCard: {
      borderRadius: radii.lg,
      padding: 14,
      gap: 10,
      borderWidth: 1.5,
    },
    cardTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    orderPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.ink,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    orderText: {
      color: c.white,
      fontFamily: fonts.bold,
      fontSize: 13,
    },
    parsedName: {
      flex: 1,
      fontFamily: fonts.semibold,
      fontSize: 16,
      color: c.ink,
      paddingVertical: 4,
    },
    parsedMeta: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.inkSoft,
    },
    reorderCol: {
      gap: 4,
    },
    reorderBtn: {
      width: 36,
      height: 32,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.lineStrong,
      ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
    },
    reorderDisabled: {
      opacity: 0.4,
    },
    queueActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginTop: 2,
    },
    tapHint: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 11,
      color: c.inkMuted,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.alertSoft,
    },
  }));

  return (
    <AppShell>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>Add tasks</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.modeRow}>
        {(
          [
            { id: 'manual', label: 'Manual' },
            { id: 'ai', label: 'AI parse' },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setMode(item.id)}
            style={[styles.modeChip, mode === item.id && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, mode === item.id && styles.modeTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>
          {mode === 'ai' ? 'Parse a brain dump' : 'Build your task queue'}
        </Text>
        <Text style={styles.subtitle}>
          Choose the day, set priority, reorder with ↑↓, then schedule.
        </Text>

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>Schedule for</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {dateOptions.map((day) => {
              const active = day === selectedDate;
              const d = new Date(day + 'T12:00:00');
              const weekday = isToday(day)
                ? 'Today'
                : d.toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose date ${formatShortDate(day)}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedDate(day)}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                >
                  <Text style={[styles.dateChipWeekday, active && styles.dateOnActive]}>
                    {weekday}
                  </Text>
                  <Text style={[styles.dateChipDay, active && styles.dateOnActive]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateChipMonth, active && styles.dateOnActive]}>
                    {d.toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.selectedHint}>
            Adding to {isToday(selectedDate) ? 'today' : formatDisplayDate(selectedDate)}
          </Text>
        </View>

        {mode === 'ai' ? (
          <View style={styles.inputRow}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              style={styles.input}
              placeholderTextColor={colors.inkMuted}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Parse tasks"
              onPress={parsePrompt}
              style={({ pressed }) => [styles.parseBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="play" size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.manualBox}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title"
              placeholderTextColor={colors.inkMuted}
              style={styles.singleInput}
            />
            <TextInput
              value={durationText}
              onChangeText={setDurationText}
              placeholder="Duration minutes"
              keyboardType="numeric"
              placeholderTextColor={colors.inkMuted}
              style={styles.singleInput}
            />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Category</Text>
              <Pressable
                onPress={() => {
                  setEditingCategoryId(null);
                  setCategoryModalOpen(true);
                }}
              >
                <Text style={styles.manageLink}>Manage</Text>
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  onLongPress={() => {
                    setEditingCategoryId(cat.id);
                    setCategoryModalOpen(true);
                  }}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor:
                        category === cat.id ? cat.color : cat.soft,
                      borderColor: cat.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      {
                        color: category === cat.id ? colors.white : cat.color,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Priority</Text>
            <PriorityTag priority={priority} onChange={setPriority} />
            <PrimaryButton label="Add to queue" onPress={addManual} />
          </View>
        )}

        <View style={styles.parsedBlock}>
          <Text style={styles.parsedTitle}>
            QUEUE · {drafts.length} task{drafts.length === 1 ? '' : 's'}
          </Text>
          {drafts.length === 0 ? (
            <Text style={styles.emptyQueue}>
              Add a manual task or parse with AI to fill the queue.
            </Text>
          ) : null}

          {drafts.map((task, index) => {
            const catMeta = getCategory(task.category);
            return (
              <View
                key={task.id}
                style={[
                  styles.parsedCard,
                  {
                    backgroundColor: catMeta.soft,
                    borderColor: catMeta.color,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.orderPill}>
                    <Text style={styles.orderText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    value={task.title}
                    onChangeText={(value) =>
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === task.id ? { ...d, title: value } : d))
                      )
                    }
                    style={styles.parsedName}
                  />
                  <View style={styles.reorderCol}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move task up"
                      disabled={index === 0}
                      hitSlop={8}
                      onPress={() => moveDraft(task.id, 'up')}
                      style={[
                        styles.reorderBtn,
                        index === 0 && styles.reorderDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={index === 0 ? colors.inkMuted : colors.ink}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move task down"
                      disabled={index === drafts.length - 1}
                      hitSlop={8}
                      onPress={() => moveDraft(task.id, 'down')}
                      style={[
                        styles.reorderBtn,
                        index === drafts.length - 1 && styles.reorderDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          index === drafts.length - 1 ? colors.inkMuted : colors.ink
                        }
                      />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.parsedMeta}>
                  {formatDuration(task.durationMinutes)}
                </Text>

                <Text style={styles.fieldLabel}>Priority</Text>
                <PriorityTag
                  priority={task.priority}
                  onChange={(next) =>
                    setDrafts((prev) =>
                      prev.map((d) => (d.id === task.id ? { ...d, priority: next } : d))
                    )
                  }
                />

                <View style={styles.queueActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cycle category"
                    onPress={() => cycleCategory(task.id)}
                    onLongPress={() => {
                      setEditingCategoryId(task.category);
                      setCategoryModalOpen(true);
                    }}
                  >
                    <CategoryTag category={task.category} />
                  </Pressable>
                  <Text style={styles.tapHint}>tap to cycle · hold to edit</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete task"
                    onPress={() =>
                      setDrafts((prev) => prev.filter((d) => d.id !== task.id))
                    }
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.alert} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <PrimaryButton
        label={`Schedule ${drafts.length || ''} →`}
        onPress={() => {
          if (!drafts.length) {
            if (mode === 'ai') parsePrompt();
            return;
          }
          addDraftTasks(drafts, selectedDate);
          router.replace(isToday(selectedDate) ? '/(tabs)' : '/(tabs)/calendar');
        }}
      />

      <CategoryEditModal
        visible={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategoryId(null);
        }}
        initialCategoryId={editingCategoryId}
        onSelectCategory={(id) => setCategory(id)}
      />
    </AppShell>
  );
}
