import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Chronotype, Lifestyle, useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import { LIFESTYLE_OPTIONS } from '@/lib/auth';
import { normalizeTimeInput } from '@/lib/schedule';

const chronotypeOptions: {
  id: Chronotype;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'early-bird', label: 'Before 6 AM – Early Bird', icon: 'moon-outline' },
  { id: 'morning', label: '6–8 AM – Morning Person', icon: 'sunny' },
  { id: 'mid-morning', label: '8–10 AM – Mid-Morning', icon: 'partly-sunny-outline' },
  { id: 'night-owl', label: 'After 10 AM – Night Owl', icon: 'cloudy-night-outline' },
];

const wakeOptions = ['5:30', '6:30', '7:00', '7:30', '8:00', '9:00', '10:00'];
const bedOptions = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '0:00', '1:00'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    progress: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 8,
      marginBottom: 16,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.lineStrong,
    },
    dotActive: {
      backgroundColor: c.ink,
      width: 22,
    },
    content: {
      gap: 14,
      paddingBottom: 16,
    },
    brand: {
      fontFamily: fonts.brandItalic,
      fontSize: 28,
      color: c.ink,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: c.ink,
      lineHeight: 30,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: c.inkSoft,
      lineHeight: 22,
      marginBottom: 8,
    },
    list: {
      gap: 10,
    },
    option: {
      minHeight: 54,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    optionSelected: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    optionLabel: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    optionLabelSelected: {
      color: c.white,
    },
    section: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: c.ink,
      marginTop: 8,
    },
    chipRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
    },
    chip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipSelected: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    otherChip: {
      borderStyle: 'dashed' as const,
      borderColor: c.energy,
      backgroundColor: c.lifeSoft,
    },
    otherChipSelected: {
      backgroundColor: c.energy,
      borderStyle: 'solid' as const,
      borderColor: c.energy,
    },
    chipText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.ink,
    },
    chipTextSelected: {
      color: c.white,
    },
    otherChipTextSelected: {
      color: c.white,
      fontFamily: fonts.semibold,
    },
    customBox: {
      gap: 6,
      marginTop: 4,
    },
    customLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkSoft,
    },
    customInput: {
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.energy,
      backgroundColor: c.bgElevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.body,
      fontSize: 15,
      color: c.ink,
    },
    error: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.alert,
    },
    summary: {
      marginTop: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: c.lifeSoft,
      borderRadius: radii.md,
      padding: 12,
    },
    summaryText: {
      fontFamily: fonts.semibold,
      color: c.ink,
    },
    footer: {
      marginTop: 8,
    },
  }));
  const {
    chronotype,
    setChronotype,
    sleep,
    setSleep,
    completeOnboarding,
    isAuthenticated,
    onboarded,
    user,
    updateProfile,
  } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(user?.lifestyle ?? null);
  const [lifestyleError, setLifestyleError] = useState<string | null>(null);

  const [customWake, setCustomWake] = useState(false);
  const [customBed, setCustomBed] = useState(false);
  const [wakeDraft, setWakeDraft] = useState(sleep.wakeTime);
  const [bedDraft, setBedDraft] = useState(sleep.bedtime);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [bedError, setBedError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (onboarded) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, onboarded, router]);

  const wakeIsPreset = useMemo(
    () => wakeOptions.includes(sleep.wakeTime),
    [sleep.wakeTime]
  );
  const bedIsPreset = useMemo(
    () => bedOptions.includes(sleep.bedtime),
    [sleep.bedtime]
  );

  const applyCustomWake = (value: string) => {
    setWakeDraft(value);
    const normalized = normalizeTimeInput(value);
    if (!normalized) {
      setWakeError('Use a time like 7:30, 7:30am, or 19:00');
      return;
    }
    setWakeError(null);
    setSleep({ ...sleep, wakeTime: normalized });
  };

  const applyCustomBed = (value: string) => {
    setBedDraft(value);
    const normalized = normalizeTimeInput(value);
    if (!normalized) {
      setBedError('Use a time like 11pm, 23:00, or 0:30');
      return;
    }
    setBedError(null);
    setSleep({ ...sleep, bedtime: normalized });
  };

  const finish = () => {
    if (!lifestyle) {
      setLifestyleError('Choose a lifestyle title to continue');
      setStep(1);
      return;
    }
    // Re-validate custom fields before continuing
    if (customWake || !wakeIsPreset) {
      const normalized = normalizeTimeInput(wakeDraft);
      if (!normalized) {
        setWakeError('Enter a valid custom wake time');
        setCustomWake(true);
        return;
      }
      setSleep({ ...sleep, wakeTime: normalized });
    }
    if (customBed || !bedIsPreset) {
      const normalized = normalizeTimeInput(bedDraft);
      if (!normalized) {
        setBedError('Enter a valid custom bedtime');
        setCustomBed(true);
        return;
      }
      setSleep({
        wakeTime: normalizeTimeInput(wakeDraft) || sleep.wakeTime,
        bedtime: normalized,
      });
    }
    updateProfile({ lifestyle });
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <AppShell>
      <Animated.View entering={FadeIn.duration(400)} style={styles.progress}>
        <View style={[styles.dot, step >= 1 && styles.dotActive]} />
        <View style={[styles.dot, step >= 2 && styles.dotActive]} />
        <View style={[styles.dot, step >= 3 && styles.dotActive]} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Kairos AI</Text>

        {step === 1 ? (
          <Animated.View entering={FadeInUp}>
            <Text style={styles.title}>What’s your lifestyle?</Text>
            <Text style={styles.subtitle}>
              We’ll tailor planning defaults around how you spend your days.
            </Text>
            <View style={styles.list}>
              {LIFESTYLE_OPTIONS.map((option) => {
                const selected = lifestyle === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => {
                      setLifestyle(option.id);
                      setLifestyleError(null);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {lifestyleError ? <Text style={styles.error}>{lifestyleError}</Text> : null}
          </Animated.View>
        ) : step === 2 ? (
          <Animated.View entering={FadeInUp}>
            <Text style={styles.title}>When does your energy peak?</Text>
            <Text style={styles.subtitle}>
              We’ll schedule deep work around your natural rhythm.
            </Text>
            <View style={styles.list}>
              {chronotypeOptions.map((option) => {
                const selected = chronotype === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setChronotype(option.id)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={selected ? colors.white : colors.inkSoft}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp}>
            <Text style={styles.title}>Customize your sleep schedule</Text>
            <Text style={styles.subtitle}>
              Pick a preset, or choose Other to type your own times.
            </Text>

            <Text style={styles.section}>Wake time</Text>
            <View style={styles.chipRow}>
              {wakeOptions.map((time) => {
                const selected = !customWake && sleep.wakeTime === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => {
                      setCustomWake(false);
                      setWakeError(null);
                      setWakeDraft(time);
                      setSleep({ ...sleep, wakeTime: time });
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  setCustomWake(true);
                  setWakeDraft(
                    wakeIsPreset ? '' : sleep.wakeTime
                  );
                }}
                style={[styles.chip, styles.otherChip, customWake && styles.otherChipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    customWake && styles.otherChipTextSelected,
                  ]}
                >
                  Other
                </Text>
              </Pressable>
            </View>
            {customWake ? (
              <View style={styles.customBox}>
                <Text style={styles.customLabel}>Custom wake time</Text>
                <TextInput
                  value={wakeDraft}
                  onChangeText={applyCustomWake}
                  placeholder="e.g. 6:45am or 6:45"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.customInput}
                />
                {wakeError ? <Text style={styles.error}>{wakeError}</Text> : null}
              </View>
            ) : null}

            <Text style={styles.section}>Bedtime</Text>
            <View style={styles.chipRow}>
              {bedOptions.map((time) => {
                const selected = !customBed && sleep.bedtime === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => {
                      setCustomBed(false);
                      setBedError(null);
                      setBedDraft(time);
                      setSleep({ ...sleep, bedtime: time });
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  setCustomBed(true);
                  setBedDraft(bedIsPreset ? '' : sleep.bedtime);
                }}
                style={[styles.chip, styles.otherChip, customBed && styles.otherChipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    customBed && styles.otherChipTextSelected,
                  ]}
                >
                  Other
                </Text>
              </Pressable>
            </View>
            {customBed ? (
              <View style={styles.customBox}>
                <Text style={styles.customLabel}>Custom bedtime</Text>
                <TextInput
                  value={bedDraft}
                  onChangeText={applyCustomBed}
                  placeholder="e.g. 11:15pm or 23:15"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.customInput}
                />
                {bedError ? <Text style={styles.error}>{bedError}</Text> : null}
              </View>
            ) : null}

            <View style={styles.summary}>
              <Ionicons name="moon" size={18} color={colors.energy} />
              <Text style={styles.summaryText}>
                Wake {sleep.wakeTime} · Bed {sleep.bedtime}
                {customWake || customBed ? ' (custom)' : ''}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <PrimaryButton
            label="Back"
            variant="secondary"
            onPress={() => setStep((prev) => (prev === 3 ? 2 : 1))}
            style={{ marginBottom: 10 }}
          />
        ) : null}
        <PrimaryButton
          label={step === 3 ? 'Start planning →' : 'Continue →'}
          onPress={() => {
            if (step === 1) {
              if (!lifestyle) {
                setLifestyleError('Choose a lifestyle title to continue');
                return;
              }
              updateProfile({ lifestyle });
              setStep(2);
              return;
            }
            if (step === 2) {
              setStep(3);
              return;
            }
            finish();
          }}
        />
      </View>
    </AppShell>
  );
}
