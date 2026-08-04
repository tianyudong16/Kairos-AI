import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signIn, signInAsGuest, onboarded } = useApp();
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const styles = useThemedStyles((c) => ({
    flex: { flex: 1 },
    content: {
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: 24,
      paddingVertical: 40,
      gap: 20,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center' as const,
    },
    hero: { gap: 10 },
    brand: {
      fontFamily: fonts.brandItalic,
      fontSize: 36,
      color: c.ink,
    },
    headline: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: c.ink,
    },
    subhead: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: c.inkMuted,
      maxWidth: 360,
    },
    card: {
      borderRadius: radii.xl,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.lineStrong,
      padding: 18,
      gap: 12,
    },
    modeRow: { flexDirection: 'row' as const, gap: 8 },
    modeChip: {
      flex: 1,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingVertical: 10,
      alignItems: 'center' as const,
      backgroundColor: c.bg,
    },
    modeChipActive: {
      backgroundColor: c.today,
      borderColor: c.today,
    },
    modeText: { fontFamily: fonts.semibold, color: c.ink },
    modeTextActive: { color: c.white },
    fieldLabel: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.inkSoft,
      marginBottom: -4,
    },
    input: {
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.bg,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontFamily: fonts.body,
      fontSize: 15,
      color: c.ink,
    },
    error: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.alert,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 17,
    },
    guestLink: {
      alignSelf: 'center' as const,
      paddingVertical: 8,
    },
    guestText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.inkMuted,
      textDecorationLine: 'underline' as const,
    },
  }));

  const goNext = () => {
    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  };

  const submit = () => {
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your name to create an account');
      return;
    }
    const result = signIn({
      email,
      password,
      name: mode === 'signup' ? name : undefined,
    });
    if (result) {
      setError(result);
      return;
    }
    setError(null);
    goNext();
  };

  const guest = () => {
    signInAsGuest();
    setError(null);
    goNext();
  };

  const gradientColors = (
    isDark
      ? [colors.bg, colors.bgElevated, colors.coachSoft]
      : [colors.bg, colors.todaySoft, colors.coachSoft]
  ) as [string, string, string];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
            <Text style={styles.brand}>Kairos AI</Text>
            <Text style={styles.headline}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={styles.subhead}>
              Enter your details to personalize your energy schedule, chronotype, and
              profile.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80)} style={styles.card}>
            <View style={styles.modeRow}>
              {(
                [
                  { id: 'signup', label: 'Sign up' },
                  { id: 'signin', label: 'Sign in' },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.id === 'signin' ? 'Switch to sign in' : 'Switch to sign up'
                  }
                  onPress={() => {
                    setMode(item.id);
                    setError(null);
                  }}
                  style={[styles.modeChip, mode === item.id && styles.modeChipActive]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      mode === item.id && styles.modeTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'signup' ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.fieldLabel}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Maya Chen"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  autoCapitalize="words"
                  accessibilityLabel="Full name"
                />
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessibilityLabel="Email"
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 4 characters"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                secureTextEntry
                autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                accessibilityLabel="Password"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={submit}
            />

            <Text style={styles.hint}>
              Prototype auth — your details stay on this device for the session.
            </Text>
          </Animated.View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            onPress={guest}
            style={styles.guestLink}
          >
            <Text style={styles.guestText}>Continue without an account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
