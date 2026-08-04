import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { SuggestedAction } from '@/lib/coach';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';
import { SCENARIO_PRESETS } from '@/lib/personas';
import { formatDisplayDate, isToday, sleepDurationHours } from '@/lib/schedule';

const colorMap: Record<SuggestedAction['colorKey'], { color: string; soft: string }> = {
  work: { color: colors.work, soft: colors.workSoft },
  energy: { color: colors.energy, soft: colors.lifeSoft },
  health: { color: colors.health, soft: colors.healthSoft },
  study: { color: colors.study, soft: colors.studySoft },
  calendar: { color: colors.calendar, soft: colors.calendarSoft },
  priorityHigh: { color: colors.priorityHigh, soft: colors.priorityHighSoft },
  coach: { color: colors.coach, soft: colors.coachSoft },
  life: { color: colors.life, soft: colors.lifeSoft },
};

export default function CoachScreen() {
  const router = useRouter();
  const {
    coachMessages,
    sendCoachMessage,
    lastCoachChanges,
    capacitySummary,
    sleep,
    peakWindowLabel,
    tasksForSelectedDate,
    dayAnalysis,
    selectedDate,
  } = useApp();
  const [draft, setDraft] = useState('');
  const dayLabel = isToday(selectedDate) ? 'Today' : formatDisplayDate(selectedDate);

  const actionCards = useMemo(
    () => dayAnalysis.suggestions,
    [dayAnalysis.suggestions]
  );

  const submit = (text?: string) => {
    const value = (text ?? draft).trim();
    if (!value) return;
    sendCoachMessage(value);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Kairos AI</Text>
        <View style={styles.titleRow}>
          <Ionicons name="flash" size={18} color={colors.energy} />
          <Text style={styles.title}>AI Coach</Text>
        </View>
        <Text style={styles.subtitle}>
          I read your day, then change it — tap a contextual action or ask in plain language.
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: colors.todaySoft }]}>
            <Text style={styles.metaText}>{peakWindowLabel}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.lifeSoft }]}>
            <Text style={styles.metaText}>
              {sleepDurationHours(sleep)}h · {sleep.bedtime}→{sleep.wakeTime}
            </Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.coachSoft }]}>
            <Text style={styles.metaText}>
              {capacitySummary.focusHours}h / {capacitySummary.capacityHours}h
            </Text>
          </View>
        </View>
        <Text style={styles.summaryLine}>{dayAnalysis.summaryLine}</Text>
      </View>

      {dayAnalysis.insights.some((i) => i.severity === 'warn') ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightRow}
        >
          {dayAnalysis.insights
            .filter((i) => i.severity === 'warn')
            .map((insight) => (
              <View key={insight.id} style={styles.insightChip}>
                <Ionicons name="alert-circle" size={14} color={colors.energy} />
                <Text style={styles.insightText} numberOfLines={2}>
                  {insight.text}
                </Text>
              </View>
            ))}
        </ScrollView>
      ) : null}

      <Text style={styles.actionsLabel}>Suggested for today</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRow}
      >
        {actionCards.map((action) => {
          const tone = colorMap[action.colorKey];
          return (
            <Pressable
              key={action.id}
              onPress={() => submit(action.prompt)}
              style={[
                styles.actionCard,
                { backgroundColor: tone.soft, borderColor: tone.color },
              ]}
            >
              <Text style={[styles.actionTitle, { color: tone.color }]}>
                {action.title}
              </Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
            </Pressable>
          );
        })}
        {SCENARIO_PRESETS.filter((s) => s.coachPrompt).map((scenario) => (
          <Pressable
            key={scenario.id}
            onPress={() => submit(scenario.coachPrompt!)}
            style={[
              styles.actionCard,
              { backgroundColor: colors.lifeSoft, borderColor: colors.life },
            ]}
          >
            <Text style={[styles.actionTitle, { color: colors.life }]}>
              {scenario.title}
            </Text>
            <Text style={styles.actionDetail}>{scenario.detail}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {lastCoachChanges.length > 0 ? (
        <View style={styles.changesBox}>
          <Text style={styles.changesTitle}>Latest changes</Text>
          {lastCoachChanges.map((change) => (
            <View key={change.id} style={styles.changeRow}>
              <View style={styles.changeDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.changeLabel}>{change.label}</Text>
                <Text style={styles.changeDetail}>{change.detail}</Text>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() =>
              router.push(isToday(selectedDate) ? '/(tabs)' : '/(tabs)/calendar')
            }
          >
            <Text style={styles.viewDay}>
              {isToday(selectedDate) ? 'View Today →' : 'View selected day →'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.nowTitle}>
          {dayLabel} · {tasksForSelectedDate.length} tasks
        </Text>
        {coachMessages.map((message, index) => (
          <Animated.View
            key={message.id}
            entering={FadeInUp.delay(index * 30)}
            style={[
              styles.bubble,
              message.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                message.role === 'user' && styles.userText,
              ]}
            >
              {message.text}
            </Text>
          </Animated.View>
        ))}

        {capacitySummary.overflowHours > 0 ? (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.alert}>
            <Ionicons name="warning" size={18} color={colors.energy} />
            <Text style={styles.alertText}>
              {capacitySummary.overflowHours}h over capacity — try Move overflow or Clear evening.
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder='Try “review my day” or “add 45m gym at 5pm”'
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          onSubmitEditing={() => submit()}
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={() => submit()}
          style={({ pressed }) => [styles.send, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginBottom: 10, gap: 4 },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
  summaryLine: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  insightRow: { gap: 8, paddingBottom: 8 },
  insightChip: {
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.alert,
    backgroundColor: colors.alertSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
  },
  actionsLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  actionRow: { gap: 10, paddingBottom: 12 },
  actionCard: {
    width: 150,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
  },
  actionTitle: { fontFamily: fonts.bold, fontSize: 14 },
  actionDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 16 },
  changesBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.coach,
    backgroundColor: colors.coachSoft,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  changesTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.coach, letterSpacing: 0.6 },
  changeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  changeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coach,
    marginTop: 5,
  },
  changeLabel: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 13 },
  changeDetail: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12 },
  viewDay: { fontFamily: fonts.semibold, color: colors.coach, marginTop: 4 },
  nowTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.inkMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  messages: { gap: 12, paddingBottom: 12 },
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: '92%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.coachSoft,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.black,
  },
  bubbleText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  userText: { color: colors.white },
  alert: {
    marginTop: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.alert,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.alertSoft,
  },
  alertText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.coach,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' } as object,
      default: {},
    }),
  },
});
