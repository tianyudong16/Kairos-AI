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
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Chronotype, useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';
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
  const {
    chronotype,
    setChronotype,
    sleep,
    setSleep,
    completeOnboarding,
    isAuthenticated,
  } = useApp();
  const [step, setStep] = useState<1 | 2>(1);

  const [customWake, setCustomWake] = useState(false);
  const [customBed, setCustomBed] = useState(false);
  const [wakeDraft, setWakeDraft] = useState(sleep.wakeTime);
  const [bedDraft, setBedDraft] = useState(sleep.bedtime);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [bedError, setBedError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

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
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <AppShell>
      <Animated.View entering={FadeIn.duration(400)} style={styles.progress}>
        <View style={[styles.dot, step >= 1 && styles.dotActive]} />
        <View style={[styles.dot, step >= 2 && styles.dotActive]} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Kairos AI</Text>

        {step === 1 ? (
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
        {step === 2 && (
          <PrimaryButton
            label="Back"
            variant="secondary"
            onPress={() => setStep(1)}
            style={{ marginBottom: 10 }}
          />
        )}
        <PrimaryButton
          label={step === 1 ? 'Continue →' : 'Start planning →'}
          onPress={() => {
            if (step === 1) {
              setStep(2);
              return;
            }
            finish();
          }}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lineStrong,
  },
  dotActive: {
    backgroundColor: colors.ink,
    width: 22,
  },
  content: {
    gap: 14,
    paddingBottom: 16,
  },
  brand: {
    fontFamily: fonts.brandItalic,
    fontSize: 28,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
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
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.white,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  otherChip: {
    borderStyle: 'dashed',
    borderColor: colors.energy,
    backgroundColor: colors.lifeSoft,
  },
  otherChipSelected: {
    backgroundColor: colors.energy,
    borderStyle: 'solid',
    borderColor: colors.energy,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.white,
  },
  otherChipTextSelected: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  customBox: {
    gap: 6,
    marginTop: 4,
  },
  customLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSoft,
  },
  customInput: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.energy,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.alert,
  },
  summary: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lifeSoft,
    borderRadius: radii.md,
    padding: 12,
  },
  summaryText: {
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  footer: {
    marginTop: 8,
  },
});
