import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { DraftTask, Priority, useApp } from '@/context/AppContext';
import { Category, categoryMeta, colors, fonts, radii } from '@/constants/theme';
import { formatDuration, parseDuration } from '@/lib/schedule';

type Mode = 'ai' | 'manual';

export default function AiInputScreen() {
  const router = useRouter();
  const { addDraftTasks, selectedDate } = useApp();
  const [mode, setMode] = useState<Mode>('ai');
  const [prompt, setPrompt] = useState(
    'I need 2h to code React, 45min cardio before 5pm, and lunch at noon...'
  );
  const [drafts, setDrafts] = useState<DraftTask[]>([]);

  // manual form
  const [title, setTitle] = useState('');
  const [durationText, setDurationText] = useState('60');
  const [category, setCategory] = useState<Category>('work');
  const [priority, setPriority] = useState<Priority>('medium');

  const iconFor = useMemo(
    () =>
      ({
        work: 'logo-react',
        health: 'walk-outline',
        life: 'restaurant-outline',
        study: 'book-outline',
      }) as const,
    []
  );

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

      const preferredStart = /noon/.test(lower)
        ? '12:00'
        : /before\s*5/.test(lower)
          ? '16:00'
          : undefined;

      return {
        id: `draft-${Date.now()}-${index}`,
        title: titleGuess.slice(0, 40),
        durationMinutes,
        category: categoryGuess,
        priority: categoryGuess === 'work' ? 'high' : 'medium',
        preferredStart,
      };
    });

    setDrafts(next.length ? next : drafts);
  };

  const addManual = () => {
    if (!title.trim()) return;
    const durationMinutes = Math.max(15, parseInt(durationText, 10) || 60);
    setDrafts((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
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
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
  };

  const updateDraft = (id: string, patch: Partial<DraftTask>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
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
          { id: 'ai', label: 'AI parse' },
          { id: 'manual', label: 'Manual' },
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
      >
        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>
          {mode === 'ai' ? 'What’s on your mind?' : 'Create a task'}
        </Text>
        <Text style={styles.subtitle}>
          Add tasks, reorder them, set priority, then schedule into{' '}
          {selectedDate}.
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
              style={({ pressed }) => [
                styles.parseBtn,
                pressed && { opacity: 0.85 },
              ]}
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
              {(Object.keys(categoryMeta) as Category[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setCategory(value)}
                  style={[
                    styles.miniChip,
                    category === value && {
                      backgroundColor: categoryMeta[value].color,
                      borderColor: categoryMeta[value].color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      category === value && { color: colors.white },
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {(['high', 'medium', 'low'] as Priority[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setPriority(value)}
                  style={[
                    styles.miniChip,
                    priority === value && styles.miniChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      priority === value && styles.miniChipTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="Add to list" onPress={addManual} />
          </View>
        )}

        {drafts.length > 0 && (
          <View style={styles.parsedBlock}>
            <Text style={styles.parsedTitle}>TASK QUEUE ({drafts.length})</Text>
            {drafts.map((task, index) => (
              <View
                key={task.id}
                style={[
                  styles.parsedCard,
                  { backgroundColor: categoryMeta[task.category].soft },
                ]}
              >
                <View style={styles.parsedLeft}>
                  <Ionicons
                    name={iconFor[task.category] as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={categoryMeta[task.category].color}
                  />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={task.title}
                      onChangeText={(value) => updateDraft(task.id, { title: value })}
                      style={styles.parsedName}
                    />
                    <Text style={styles.parsedMeta}>
                      {formatDuration(task.durationMinutes)} · {task.priority}
                    </Text>
                  </View>
                </View>
                <View style={styles.queueActions}>
                  <CategoryTag category={task.category} />
                  <Pressable onPress={() => moveDraft(task.id, 'up')} style={styles.iconBtn}>
                    <Ionicons name="arrow-up" size={16} color={colors.ink} />
                  </Pressable>
                  <Pressable onPress={() => moveDraft(task.id, 'down')} style={styles.iconBtn}>
                    <Ionicons name="arrow-down" size={16} color={colors.ink} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setDrafts((prev) => prev.filter((d) => d.id !== task.id))
                    }
                    style={styles.iconBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.alert} />
                  </Pressable>
                </View>
                <Text style={styles.orderBadge}>#{index + 1}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <PrimaryButton
        label="Schedule All →"
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
    minHeight: 120,
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
    fontSize: 13,
    color: colors.inkSoft,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  miniChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  miniChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  miniChipTextActive: { color: colors.white },
  parsedBlock: { gap: 10 },
  parsedTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.1,
    color: colors.inkSoft,
  },
  parsedCard: {
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  parsedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  parsedName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  parsedMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  orderBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.inkMuted,
  },
});
