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
  const { colors } = useTheme();
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
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    modeText: { fontFamily: fonts.semibold, color: c.ink },
    modeTextActive: { color: c.white },
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
    demoHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 17,
    },
    guestBtn: {
      alignSelf: 'center' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: 'rgba(255,252,245,0.7)',
    },
    guestText: {
      fontFamily: fonts.semibold,
      color: c.ink,
    },
  }));
  const { signIn, signInAsGuest, onboarded } = useApp();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('maya@kairos.app');
  const [password, setPassword] = useState('kairos');
  const [error, setError] = useState<string | null>(null);

  const goNext = () => {
    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  };

  const submit = () => {
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

  return (
    <LinearGradient
      colors={['#F7F1E4', '#E8F0EA', '#F4F0E6']}
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
              Plan around your energy peaks — sign in to keep your profile, chronotype, and
              schedule together.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80)} style={styles.card}>
            <View style={styles.modeRow}>
              {([
                { id: 'signin', label: 'Sign in' },
                { id: 'signup', label: 'Sign up' },
              ] as const).map((item) => (
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
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                autoCapitalize="words"
              />
            ) : null}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              secureTextEntry
              autoComplete={mode === 'signin' ? 'password' : 'new-password'}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={submit}
            />

            <Text style={styles.demoHint}>
              Prototype login — any email + 4+ character password works. Demo is prefilled.
            </Text>
          </Animated.View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            onPress={guest}
            style={styles.guestBtn}
          >
            <Ionicons name="person-outline" size={18} color={colors.ink} />
            <Text style={styles.guestText}>Continue as guest</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
