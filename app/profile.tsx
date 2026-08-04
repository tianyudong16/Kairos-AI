import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';
import { sleepDurationHours } from '@/lib/schedule';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'K';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    updateProfile,
    signOut,
    chronotype,
    sleep,
    capacitySummary,
    tasksForSelectedDate,
    isAuthenticated,
  } = useApp();

  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [emailDraft, setEmailDraft] = useState(user?.email ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setNameDraft(user?.name ?? '');
    setEmailDraft(user?.email ?? '');
  }, [user?.name, user?.email]);

  const chronoLabel = useMemo(() => {
    switch (chronotype) {
      case 'early-bird':
        return 'Early Bird';
      case 'night-owl':
        return 'Night Owl';
      case 'mid-morning':
        return 'Mid-Morning';
      case 'morning':
        return 'Morning Person';
      default:
        return 'Not set';
    }
  }, [chronotype]);

  if (!user) {
    return null;
  }

  const save = () => {
    updateProfile({ name: nameDraft, email: emailDraft });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const logout = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <AppShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Your account and rhythm preferences in one place.
        </Text>
      </Animated.View>

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.displayName}>{user.name}</Text>
          <Text style={styles.displayEmail}>{user.email}</Text>
          {user.isGuest ? (
            <View style={styles.guestPill}>
              <Text style={styles.guestPillText}>Guest session</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.section}>Account</Text>
      <TextInput
        value={nameDraft}
        onChangeText={setNameDraft}
        placeholder="Name"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <TextInput
        value={emailDraft}
        onChangeText={setEmailDraft}
        placeholder="Email"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!user.isGuest}
      />
      <PrimaryButton label="Save profile" onPress={save} />
      {savedFlash ? <Text style={styles.saved}>Profile saved</Text> : null}

      <Text style={styles.section}>Rhythm snapshot</Text>
      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.todaySoft }]}>
          <Text style={styles.statLabel}>Chronotype</Text>
          <Text style={styles.statValue}>{chronoLabel}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.lifeSoft }]}>
          <Text style={styles.statLabel}>Sleep need</Text>
          <Text style={styles.statValue}>{sleepDurationHours(sleep)}h</Text>
          <Text style={styles.statMeta}>
            {sleep.bedtime} → {sleep.wakeTime}
          </Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.coachSoft }]}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>{tasksForSelectedDate.length} tasks</Text>
          <Text style={styles.statMeta}>
            {capacitySummary.focusHours}h focus / {capacitySummary.capacityHours}h cap
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/settings')}
        style={styles.linkRow}
      >
        <Ionicons name="settings-outline" size={18} color={colors.ink} />
        <Text style={styles.linkText}>Open sleep & category settings</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={logout}
        style={styles.signOut}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.alert} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 28 },
  header: { gap: 4 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 4,
  },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    padding: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  displayName: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  displayEmail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  guestPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.alertSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  guestPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.alert,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 8,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  saved: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.health,
  },
  stats: { gap: 8 },
  stat: {
    borderRadius: radii.md,
    padding: 14,
    gap: 2,
  },
  statLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  statMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  linkRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkText: { flex: 1, fontFamily: fonts.semibold, color: colors.ink },
  signOut: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  signOutText: {
    fontFamily: fonts.semibold,
    color: colors.alert,
  },
});
