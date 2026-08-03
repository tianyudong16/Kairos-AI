import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Chronotype, useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

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
  const { chronotype, setChronotype, sleep, setSleep, completeOnboarding } = useApp();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <AppShell>
      <Animated.View entering={FadeIn.duration(400)} style={styles.progress}>
        <View style={[styles.dot, step >= 1 && styles.dotActive]} />
        <View style={[styles.dot, step >= 2 && styles.dotActive]} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
              Kairos uses wake/bed times to protect focus capacity and avoid overflow.
            </Text>

            <Text style={styles.section}>Wake time</Text>
            <View style={styles.chipRow}>
              {wakeOptions.map((time) => {
                const selected = sleep.wakeTime === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => setSleep({ ...sleep, wakeTime: time })}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.section}>Bedtime</Text>
            <View style={styles.chipRow}>
              {bedOptions.map((time) => {
                const selected = sleep.bedtime === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => setSleep({ ...sleep, bedtime: time })}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summary}>
              <Ionicons name="moon" size={18} color={colors.energy} />
              <Text style={styles.summaryText}>
                Wake {sleep.wakeTime} · Bed {sleep.bedtime}
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
            completeOnboarding();
            router.replace('/(tabs)');
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
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.white,
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
