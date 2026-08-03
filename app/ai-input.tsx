import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ParsedTask, useApp } from '@/context/AppContext';
import { categoryMeta, colors, fonts, radii } from '@/constants/theme';

const sample =
  'I need 2h to code React, 45min cardio before 5pm, and lunch at noon...';

const defaultParsed: ParsedTask[] = [
  { id: 'p1', title: 'React', duration: '2h', category: 'work' },
  { id: 'p2', title: 'Cardio', duration: '45m', category: 'health' },
  { id: 'p3', title: 'Lunch', duration: '12:30', category: 'life' },
];

export default function AiInputScreen() {
  const router = useRouter();
  const { addParsedTasks } = useApp();
  const [prompt, setPrompt] = useState(sample);
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null);

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

  const runParse = () => {
    // Practical demo parser: keep fidelity to the wireframe result.
    setParsed(defaultParsed);
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
        <Text style={styles.topTitle}>AI Input</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View entering={FadeIn}>
          <Text style={styles.brand}>Kairos AI</Text>
          <Text style={styles.title}>What’s on your mind?</Text>
          <Text style={styles.subtitle}>
            Type naturally — Kairos will parse tasks and categories.
          </Text>
        </Animated.View>

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
            onPress={runParse}
            style={styles.parseBtn}
          >
            <Ionicons name="play" size={20} color={colors.white} />
          </Pressable>
        </View>

        {parsed && (
          <Animated.View entering={FadeInDown} style={styles.parsedBlock}>
            <Text style={styles.parsedTitle}>PARSED TASKS ✓</Text>
            <View style={styles.parsedList}>
              {parsed.map((task) => (
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
                    <Text style={styles.parsedName}>
                      {task.title} – {task.duration}
                    </Text>
                  </View>
                  <CategoryTag category={task.category} />
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <PrimaryButton
        label="Schedule All →"
        onPress={() => {
          if (parsed) {
            addParsedTasks(parsed);
          } else {
            runParse();
            addParsedTasks(defaultParsed);
          }
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
  content: {
    gap: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  brand: {
    fontFamily: fonts.brandItalic,
    fontSize: 24,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.ink,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
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
  },
  parsedBlock: {
    gap: 12,
  },
  parsedTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.1,
    color: colors.inkSoft,
  },
  parsedList: {
    gap: 10,
  },
  parsedCard: {
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  parsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  parsedName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
});
