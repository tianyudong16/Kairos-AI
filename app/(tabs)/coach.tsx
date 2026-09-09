import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import { ScreenBackButton } from '@/components/nav/ScreenBackButton';

export default function CoachScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    flex: { flex: 1 },
    header: { marginBottom: 10, gap: 4 },
    brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: c.ink },
    titleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    title: { fontFamily: fonts.bold, fontSize: 28, color: c.ink },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: c.inkMuted, lineHeight: 20 },
    metaRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 4 },
    metaChip: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    metaText: { fontFamily: fonts.semibold, fontSize: 11, color: c.ink },
    billingBanner: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.coach,
      backgroundColor: c.coachSoft,
      padding: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginBottom: 8,
    },
    billingBannerText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.ink,
      lineHeight: 18,
    },
    billingLink: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: c.coach,
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
    actionDetail: { fontFamily: fonts.body, fontSize: 12, color: c.inkSoft, lineHeight: 16 },
    changesBox: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.coach,
      backgroundColor: c.coachSoft,
      padding: 12,
      gap: 8,
      marginBottom: 10,
    },
    changesTitle: { fontFamily: fonts.bold, fontSize: 12, color: c.coach, letterSpacing: 0.6 },
    changeRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'flex-start' as const },
    changeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.coach,
      marginTop: 5,
    },
    changeLabel: { fontFamily: fonts.semibold, color: c.ink, fontSize: 13 },
    changeDetail: { fontFamily: fonts.body, color: c.inkSoft, fontSize: 12 },
    viewDay: { fontFamily: fonts.semibold, color: c.coach, marginTop: 4 },
    nowTitle: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: c.inkMuted,
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
      alignSelf: 'flex-start' as const,
      backgroundColor: c.coachSoft,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.3)',
    },
    userBubble: {
      alignSelf: 'flex-end' as const,
      backgroundColor: c.black,
    },
    bubbleText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 21,
      color: c.ink,
    },
    userText: { color: c.white },
    alert: {
      marginTop: 4,
      borderWidth: 1.5,
      borderStyle: 'dashed' as const,
      borderColor: c.alert,
      borderRadius: radii.md,
      padding: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: c.alertSoft,
    },
    alertText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.ink,
      lineHeight: 18,
    },
    composer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginTop: 8,
    },
    input: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 16,
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.ink,
    },
    send: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.coach,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...Platform.select({
        web: { cursor: 'pointer' } as object,
        default: {},
      }),
    },
  }));
  const {
    user,
    coachMessages,
    sendCoachMessage,
    lastCoachChanges,
    coachBusy,
    coachCredits,
    creditsPerCoachMessage,
    refreshCoachBilling,
    capacitySummary,
    sleep,
    peakWindowLabel,
    tasksForSelectedDate,
  } = useApp();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void refreshCoachBilling();
  }, [refreshCoachBilling]);

  const showGuestBilling = user?.isGuest ?? true;
  const showLowCredits =
    !showGuestBilling && coachCredits !== null && coachCredits < creditsPerCoachMessage;

  const actionCards = useMemo(
    () => [
      {
        title: 'Protect peak',
        prompt: 'Protect peak window',
        detail: 'Put deep work first in your peak hours',
        color: colors.work,
        soft: colors.workSoft,
      },
      {
        title: 'Move overflow',
        prompt: 'Move low priority to tomorrow',
        detail: 'Shift leftover tasks past bedtime',
        color: colors.energy,
        soft: colors.lifeSoft,
      },
      {
        title: 'Insert break',
        prompt: 'Insert recovery break',
        detail: 'Add a 20m reset in the afternoon',
        color: colors.health,
        soft: colors.healthSoft,
      },
      {
        title: 'Split longest',
        prompt: 'Split longest task',
        detail: 'Break a long block into two sessions',
        color: colors.study,
        soft: colors.studySoft,
      },
      {
        title: 'Clear evening',
        prompt: 'Clear evening after 5',
        detail: 'Keep nights lighter',
        color: colors.calendar,
        soft: colors.calendarSoft,
      },
      {
        title: 'Boost focus',
        prompt: 'Boost priority of focus task',
        detail: 'Raise a key task to HIGH',
        color: colors.priorityHigh,
        soft: colors.priorityHighSoft,
      },
    ],
    [colors]
  );

  const submit = async (text?: string) => {
    const value = (text ?? draft).trim();
    if (!value || coachBusy) return;
    setDraft('');
    await sendCoachMessage(value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <ScreenBackButton fallbackHref="/(tabs)" />
        <Text style={styles.brand}>Kairos AI</Text>
        <View style={styles.titleRow}>
          <Ionicons name="flash" size={18} color={colors.energy} />
          <Text style={styles.title}>AI Coach</Text>
        </View>
        <Text style={styles.subtitle}>
          Live Gemini chat about your day — uses coach credits when signed in.
          Action cards are free shortcuts.
        </Text>
        <View style={styles.metaRow}>
          {!showGuestBilling && coachCredits !== null ? (
            <Pressable
              onPress={() => router.push('/coach-billing' as any)}
              style={[styles.metaChip, { backgroundColor: colors.coachSoft }]}
            >
              <Text style={styles.metaText}>
                {coachCredits} credit{coachCredits === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ) : null}
          <View style={[styles.metaChip, { backgroundColor: colors.todaySoft }]}>
            <Text style={styles.metaText}>{peakWindowLabel}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.lifeSoft }]}>
            <Text style={styles.metaText}>
              {sleep.wakeTime}–{sleep.bedtime}
            </Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.coachSoft }]}>
            <Text style={styles.metaText}>
              {capacitySummary.focusHours}h / {capacitySummary.capacityHours}h
            </Text>
          </View>
        </View>
      </View>

      {showGuestBilling ? (
        <Pressable
          style={styles.billingBanner}
          onPress={() => router.push('/login' as any)}
        >
          <Ionicons name="person-circle-outline" size={20} color={colors.coach} />
          <Text style={styles.billingBannerText}>
            Sign in to use live AI chat. Action cards still edit your schedule for free.
          </Text>
          <Text style={styles.billingLink}>Sign in</Text>
        </Pressable>
      ) : null}

      {showLowCredits ? (
        <Pressable
          style={styles.billingBanner}
          onPress={() => router.push('/coach-billing' as any)}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.coach} />
          <Text style={styles.billingBannerText}>
            You’re out of coach credits. Buy a pack to keep chatting with AI.
          </Text>
          <Text style={styles.billingLink}>Buy</Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRow}
      >
        {actionCards.map((action) => (
          <Pressable
            key={action.title}
            onPress={() => submit(action.prompt)}
            style={[styles.actionCard, { backgroundColor: action.soft, borderColor: action.color }]}
          >
            <Text style={[styles.actionTitle, { color: action.color }]}>{action.title}</Text>
            <Text style={styles.actionDetail}>{action.detail}</Text>
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
          <Pressable onPress={() => router.push('/(tabs)')}>
            <Text style={styles.viewDay}>View Today →</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.nowTitle}>
          Today · {tasksForSelectedDate.length} tasks
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

        {coachBusy ? (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        ) : null}

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
          placeholder="Ask anything: “I’m overloaded after 4 — what should move?”"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          onSubmitEditing={() => {
            void submit();
          }}
          returnKeyType="send"
          editable={!coachBusy}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={coachBusy}
          onPress={() => {
            void submit();
          }}
          style={({ pressed }) => [
            styles.send,
            (pressed || coachBusy) && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
