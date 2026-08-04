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
import { CategoryEditModal } from '@/components/ui/CategoryEditModal';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PriorityTag } from '@/components/ui/PriorityTag';
import { Category, DraftTask, Priority, useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';
import { SCENARIO_PRESETS } from '@/lib/personas';
import {
  formatDisplayDate,
  formatDuration,
  isToday,
  parseDuration,
} from '@/lib/schedule';

type Mode = 'ai' | 'manual';

export default function AiInputScreen() {
  const router = useRouter();
  const { addDraftTasks, selectedDate, categories, getCategory } = useApp();
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

  return (
    <AppShell>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
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
          Set priority, reorder queue order, then schedule into{' '}
          {isToday(selectedDate) ? 'today' : formatDisplayDate(selectedDate)}.
        </Text>

        {mode === 'ai' ? (
          <View style={styles.aiBlock}>
            <Text style={styles.fieldLabel}>Persona scenarios</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scenarioRow}
            >
              {SCENARIO_PRESETS.map((scenario) => (
                <Pressable
                  key={scenario.id}
                  onPress={() => {
                    setPrompt(scenario.prompt);
                  }}
                  style={styles.scenarioChip}
                >
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioDetail}>{scenario.detail}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
                    accessibilityLabel="Move earlier in queue"
                    disabled={index === 0}
                    hitSlop={8}
                    onPress={() => moveDraft(task.id, 'up')}
                    style={[
                      styles.reorderBtn,
                      index === 0 && styles.reorderDisabled,
                    ]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={index === 0 ? colors.inkMuted : colors.ink}
                    />
                    <Text
                      style={[
                        styles.reorderText,
                        index === 0 && { color: colors.inkMuted },
                      ]}
                    >
                      Earlier
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Move later in queue"
                    disabled={index === drafts.length - 1}
                    hitSlop={8}
                    onPress={() => moveDraft(task.id, 'down')}
                    style={[
                      styles.reorderBtn,
                      index === drafts.length - 1 && styles.reorderDisabled,
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={
                        index === drafts.length - 1 ? colors.inkMuted : colors.ink
                      }
                    />
                    <Text
                      style={[
                        styles.reorderText,
                        index === drafts.length - 1 && { color: colors.inkMuted },
                      ]}
                    >
                      Later
                    </Text>
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
          // Return to the day you were planning — calendar if not today
          router.replace(
            isToday(selectedDate) ? '/(tabs)' : '/(tabs)/calendar'
          );
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
  aiBlock: { gap: 10 },
  scenarioRow: { gap: 8, paddingBottom: 2 },
  scenarioChip: {
    width: 150,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.coach,
    backgroundColor: colors.coachSoft,
    padding: 10,
    gap: 4,
  },
  scenarioTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.coach },
  scenarioDetail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSoft,
    lineHeight: 14,
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  manageLink: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.energy,
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
    minWidth: 72,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
  },
  reorderText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.ink,
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
