import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppShell } from '@/components/ui/AppShell';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PriorityTag } from '@/components/ui/PriorityTag';
import { DraftTask, Priority, useApp } from '@/context/AppContext';
import { Category, categoryMeta, colors, fonts, radii } from '@/constants/theme';
import { formatDuration, parseDuration } from '@/lib/schedule';

type Mode = 'ai' | 'manual';

const categories = Object.keys(categoryMeta) as Category[];

export default function AiInputScreen() {
  const router = useRouter();
  const { addDraftTasks, selectedDate } = useApp();
  const [mode, setMode] = useState<Mode>('manual');
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
        const idx = categories.indexOf(draft.category);
        const next = categories[(idx + 1) % categories.length];
        return { ...draft, category: next };
      })
    );
  };

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
        {([
          { id: 'manual', label: 'Manual' },
          { id: 'ai', label: 'AI parse' },
        ] as const).map((item) => (
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
          Set priority, reorder with ↑↓, then schedule into {selectedDate}.
        </Text>

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
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {categories.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setCategory(value)}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor:
                        category === value
                          ? categoryMeta[value].color
                          : categoryMeta[value].soft,
                      borderColor: categoryMeta[value].color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      {
                        color:
                          category === value ? colors.white : categoryMeta[value].color,
                      },
                    ]}
                  >
                    {value}
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

          {drafts.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.parsedCard,
                {
                  backgroundColor: categoryMeta[task.category].soft,
                  borderColor: categoryMeta[task.category].color,
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
                >
                  <CategoryTag category={task.category} />
                </Pressable>
                <Text style={styles.tapHint}>tap tag to change category</Text>
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
          ))}
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
          router.replace('/(tabs)');
        }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.inkSoft,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  modeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { fontFamily: fonts.medium, color: colors.ink },
  modeTextActive: { color: colors.white },
  content: { gap: 14, paddingBottom: 20, flexGrow: 1 },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 110,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderStyle: 'dashed',
    backgroundColor: colors.bgElevated,
    padding: 16,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  parseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
  },
  manualBox: { gap: 10 },
  singleInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  parsedBlock: { gap: 12, marginTop: 4 },
  parsedTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.1,
    color: colors.inkSoft,
  },
  emptyQueue: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 13,
  },
  parsedCard: {
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  parsedName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 4,
  },
  parsedMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  reorderCol: {
    gap: 4,
  },
  reorderBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
  },
  reorderDisabled: {
    opacity: 0.4,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  tapHint: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.alertSoft,
  },
});
