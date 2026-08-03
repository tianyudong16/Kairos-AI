import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Chronotype, useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

const options: {
  id: Chronotype;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'early-bird', label: 'Before 6 AM – Early Bird', icon: 'moon-outline' },
  { id: 'morning', label: '6–8 AM – Morning Person', icon: 'sunny' },
  { id: 'mid-morning', label: '8–10 AM – Mid-Morning', icon: 'partly-sunny-outline' },
  { id: 'night-owl', label: 'After 10 AM – Night Owl', icon: 'cloudy-night-outline' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { chronotype, setChronotype, completeOnboarding } = useApp();

  return (
    <AppShell>
      <Animated.View entering={FadeIn.duration(400)} style={styles.progress}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80)} style={styles.hero}>
        <View style={styles.heroArt}>
          <Ionicons name="sunny-outline" size={42} color={colors.energy} />
          <Text style={styles.heroCaption}>Your chronotype</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140)} style={styles.copy}>
        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>When does your energy peak?</Text>
        <Text style={styles.subtitle}>
          We’ll align deep work with your natural rhythm.
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {options.map((option, index) => {
          const selected = chronotype === option.id;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInUp.delay(180 + index * 50)}
            >
              <Pressable
                onPress={() => setChronotype(option.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={selected ? colors.white : colors.inkSoft}
                />
                <Text
                  style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                >
                  {option.label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Continue →"
          onPress={() => {
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
    marginBottom: 20,
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
  hero: {
    marginBottom: 20,
  },
  heroArt: {
    height: 150,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroCaption: {
    fontFamily: fonts.medium,
    color: colors.inkMuted,
    fontSize: 13,
  },
  copy: {
    gap: 8,
    marginBottom: 22,
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
  },
  list: {
    gap: 10,
    flex: 1,
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
  footer: {
    marginTop: 16,
  },
});
