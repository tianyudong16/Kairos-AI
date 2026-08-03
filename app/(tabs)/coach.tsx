import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

const quickActions = [
  'Protect peak window',
  'Move low priority to tomorrow',
  'Prioritize work today',
  'Set bedtime 11pm',
];

export default function CoachScreen() {
  const {
    coachMessages,
    sendCoachMessage,
    capacitySummary,
    sleep,
    peakWindowLabel,
  } = useApp();
  const [draft, setDraft] = useState('');

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
          Co-pilot that actually reshuffles tasks, priorities, and sleep.
        </Text>
        <Text style={styles.meta}>
          {peakWindowLabel} · wake {sleep.wakeTime} / bed {sleep.bedtime} · focus{' '}
          {capacitySummary.focusHours}h / {capacitySummary.capacityHours}h
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action}
            onPress={() => submit(action)}
            style={styles.quickChip}
          >
            <Text style={styles.quickText}>{action}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        {coachMessages.map((message, index) => (
          <Animated.View
            key={message.id}
            entering={FadeInUp.delay(index * 40)}
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
          <Animated.View entering={FadeInDown.delay(120)} style={styles.alert}>
            <Ionicons name="warning" size={18} color={colors.energy} />
            <Text style={styles.alertText}>
              Capacity alert: {capacitySummary.overflowHours}h overflow before
              bedtime. Ask me to move low-priority work.
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask Kairos to reshape your day…"
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
  header: { marginBottom: 10, gap: 2 },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 4,
  },
  quickRow: { gap: 8, paddingBottom: 10 },
  quickChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
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
    borderColor: 'rgba(47, 111, 237, 0.25)',
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
