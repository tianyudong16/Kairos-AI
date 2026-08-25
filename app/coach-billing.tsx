import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FloatingTabBar } from '@/components/nav/FloatingTabBar';
import { ScreenBackButton } from '@/components/nav/ScreenBackButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

export default function CoachBillingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ billing?: string }>();
  const { colors } = useTheme();
  const {
    user,
    isAuthenticated,
    coachCredits,
    coachCreditPacks,
    creditsPerCoachMessage,
    freeSignupCredits,
    refreshCoachBilling,
    purchaseCoachCredits,
  } = useApp();
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.isGuest) {
      router.replace('/login');
    }
  }, [isAuthenticated, user?.isGuest, router]);

  useEffect(() => {
    void refreshCoachBilling();
  }, [refreshCoachBilling]);

  useEffect(() => {
    if (params.billing === 'success') {
      setStatus('Payment received — credits may take a few seconds to appear.');
      void refreshCoachBilling();
    } else if (params.billing === 'cancel') {
      setStatus('Checkout canceled.');
    }
  }, [params.billing, refreshCoachBilling]);

  const styles = useThemedStyles((c) => ({
    content: { gap: 14, paddingBottom: 28 },
    header: { gap: 4 },
    brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: c.ink },
    title: { fontFamily: fonts.bold, fontSize: 28, color: c.ink },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.inkMuted,
      lineHeight: 20,
    },
    balanceCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.coach,
      backgroundColor: c.coachSoft,
      padding: 16,
      gap: 6,
    },
    balanceLabel: {
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.8,
      color: c.coach,
      textTransform: 'uppercase' as const,
    },
    balanceValue: { fontFamily: fonts.bold, fontSize: 36, color: c.ink },
    balanceMeta: { fontFamily: fonts.body, fontSize: 13, color: c.inkSoft },
    pack: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 14,
      gap: 8,
    },
    packTitle: { fontFamily: fonts.bold, fontSize: 16, color: c.ink },
    packMeta: { fontFamily: fonts.body, fontSize: 13, color: c.inkMuted },
    packPrice: { fontFamily: fonts.bold, fontSize: 18, color: c.today },
    status: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.health,
      lineHeight: 18,
    },
    note: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 18,
    },
  }));

  if (!user || user.isGuest) {
    return null;
  }

  const buy = async (packId: string) => {
    setBusyPack(packId);
    setStatus(null);
    const err = await purchaseCoachCredits(packId);
    if (err) setStatus(err);
    setBusyPack(null);
  };

  return (
    <AppShell footer={<FloatingTabBar />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <ScreenBackButton fallbackHref="/profile" />
          <Text style={styles.brand}>Kairos AI</Text>
          <Text style={styles.title}>Coach credits</Text>
          <Text style={styles.subtitle}>
            Live AI chat uses Gemini on our servers. Each message costs{' '}
            {creditsPerCoachMessage} credit. New accounts get {freeSignupCredits}{' '}
            free credits.
          </Text>
        </Animated.View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <Text style={styles.balanceValue}>
            {coachCredits === null ? '—' : coachCredits}
          </Text>
          <Text style={styles.balanceMeta}>
            {creditsPerCoachMessage} credit per AI message · action cards are free
          </Text>
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        {coachCreditPacks.map((pack) => (
          <View key={pack.id} style={styles.pack}>
            <Text style={styles.packTitle}>{pack.label}</Text>
            <Text style={styles.packMeta}>{pack.credits} coach credits</Text>
            <Text style={styles.packPrice}>{pack.priceLabel}</Text>
            <PrimaryButton
              label={busyPack === pack.id ? 'Opening checkout…' : 'Buy with Stripe'}
              onPress={() => {
                void buy(pack.id);
              }}
            />
            {busyPack === pack.id ? (
              <ActivityIndicator color={colors.coach} />
            ) : null}
          </View>
        ))}

        {!coachCreditPacks.length ? (
          <Text style={styles.note}>
            Credit packs appear after billing functions are deployed and Stripe
            price IDs are configured.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/coach')}
          style={{ paddingVertical: 8 }}
        >
          <Text style={[styles.note, { color: colors.coach, fontFamily: fonts.semibold }]}>
            Back to AI Coach →
          </Text>
        </Pressable>
      </ScrollView>
    </AppShell>
  );
}
