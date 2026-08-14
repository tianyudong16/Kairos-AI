import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import { findAccountPassword } from '@/lib/auth';
import {
  CalendarProviderId,
  connectDeviceCalendar,
  connectGoogle,
  connectMicrosoft,
  isDeviceCalendarSupported,
  isMicrosoftConfigured,
  listDeviceCalendars,
  listGoogleCalendars,
  listMicrosoftCalendars,
  PROVIDER_META,
  providerConfigured,
  refreshGoogleConnectionFromBackend,
  RemoteCalendar,
} from '@/lib/calendar-sync';
import { ensureFirebaseUser, isFirebaseConfigured } from '@/lib/firebase';

export default function CalendarSyncScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ google?: string }>();
  const { colors } = useTheme();
  const {
    user,
    calendarConnections,
    setCalendarConnection,
    pullCalendar,
    pushCalendar,
    syncCalendar,
  } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceCalendars, setDeviceCalendars] = useState<RemoteCalendar[]>([]);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  const styles = useThemedStyles((c) => ({
    content: { gap: 14, paddingBottom: 32 },
    topBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.line,
    },
    brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: c.ink },
    title: { fontFamily: fonts.bold, fontSize: 28, color: c.ink },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.inkMuted,
      lineHeight: 20,
    },
    card: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 14,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.coachSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.ink },
    cardMeta: { fontFamily: fonts.body, fontSize: 12, color: c.inkMuted, flex: 1 },
    status: { fontFamily: fonts.medium, fontSize: 12, color: c.today },
    statusOff: { fontFamily: fonts.medium, fontSize: 12, color: c.inkMuted },
    row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    chip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bg,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    chipActive: { backgroundColor: c.today, borderColor: c.today },
    chipText: { fontFamily: fonts.medium, fontSize: 12, color: c.ink },
    chipTextActive: { color: c.white },
    note: { fontFamily: fonts.body, fontSize: 12, color: c.inkMuted, lineHeight: 17 },
    error: { fontFamily: fonts.medium, fontSize: 13, color: c.alert },
    success: { fontFamily: fonts.medium, fontSize: 13, color: c.health },
  }));

  const resolveFirebaseUid = async () => {
    if (firebaseUid) return firebaseUid;
    if (!user || user.isGuest) return null;
    const password = findAccountPassword(user.email);
    if (!password || !isFirebaseConfigured()) return null;
    const fbUser = await ensureFirebaseUser(user.email, password);
    setFirebaseUid(fbUser.uid);
    return fbUser.uid;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (params.google !== 'connected') return;
      setMessage('Google connected. Finishing setup…');
      try {
        const uid = await resolveFirebaseUid();
        if (cancelled) return;
        if (uid) {
          const fromBackend = await refreshGoogleConnectionFromBackend(uid);
          if (fromBackend?.connected) {
            setCalendarConnection('google', fromBackend);
            setMessage(`Connected Google as ${fromBackend.accountLabel}.`);
            return;
          }
        }
        setCalendarConnection('google', {
          provider: 'google',
          connected: true,
          accountLabel: 'Google Calendar',
          calendarId: 'primary',
          calendarTitle: 'Primary',
        });
        setMessage('Connected Google Calendar.');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not finish Google connect.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.google]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const connect = async (provider: CalendarProviderId) => {
    await run(`connect-${provider}`, async () => {
      if (provider === 'google') {
        if (!user || user.isGuest) {
          throw new Error('Sign in to Kairos (not as guest) to connect Google.');
        }
        const password = findAccountPassword(user.email);
        const connection = await connectGoogle({
          email: user.email,
          password: password || undefined,
          firebaseUid: firebaseUid || undefined,
        });
        if (!connection.connected && Platform.OS === 'web') {
          setMessage('Continue in the browser to finish Google sign-in…');
          return;
        }
        setCalendarConnection('google', connection);
        if (connection.accessToken) {
          try {
            const calendars = await listGoogleCalendars(connection.accessToken);
            if (calendars[0]) {
              setCalendarConnection('google', {
                ...connection,
                calendarId: calendars[0].id,
                calendarTitle: calendars[0].title,
              });
            }
          } catch {
            // keep primary
          }
        }
        setMessage(
          connection.accountLabel
            ? `Connected Google as ${connection.accountLabel}.`
            : 'Connected Google Calendar.'
        );
        return;
      }
      if (provider === 'microsoft') {
        if (!isMicrosoftConfigured()) {
          throw new Error(
            'Outlook seamless Connect is next. Use Import .ics for Outlook for now.'
          );
        }
        const connection = await connectMicrosoft();
        setCalendarConnection('microsoft', connection);
        try {
          const calendars = await listMicrosoftCalendars(connection.accessToken!);
          if (calendars[0]) {
            setCalendarConnection('microsoft', {
              ...connection,
              calendarId: calendars[0].id,
              calendarTitle: calendars[0].title,
            });
          }
        } catch {
          // keep default
        }
        setMessage(`Connected Outlook as ${connection.accountLabel}.`);
        return;
      }
      const { connection, calendars } = await connectDeviceCalendar();
      setDeviceCalendars(calendars);
      setCalendarConnection('device', connection);
      setMessage(`Connected device calendar “${connection.calendarTitle}”.`);
    });
  };

  const disconnect = (provider: CalendarProviderId) => {
    setCalendarConnection(provider, {
      provider,
      connected: false,
    });
    setMessage(`Disconnected ${PROVIDER_META[provider].label}.`);
  };

  const providers: CalendarProviderId[] = ['google', 'microsoft', 'device'];
  const microsoftNeedsKeys = useMemo(() => !isMicrosoftConfigured(), []);

  return (
    <AppShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>Import & export</Text>
        <Text style={styles.subtitle}>
          Connect Google, Outlook, or this phone’s calendars (Apple / Samsung). Import
          events into Kairos and export Kairos tasks back out.
        </Text>

        {providers.map((provider) => {
          const meta = PROVIDER_META[provider];
          const connection = calendarConnections[provider];
          const configured = providerConfigured(provider);
          const connecting = busy === `connect-${provider}`;
          return (
            <View key={provider} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name={meta.icon} size={18} color={colors.coach} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle}>{meta.label}</Text>
                  <Text style={styles.cardMeta}>{meta.blurb}</Text>
                </View>
                <Text style={connection.connected ? styles.status : styles.statusOff}>
                  {connection.connected ? 'Connected' : 'Not connected'}
                </Text>
              </View>

              {connection.connected ? (
                <Text style={styles.note}>
                  {connection.accountLabel || meta.label}
                  {connection.calendarTitle ? ` · ${connection.calendarTitle}` : ''}
                  {connection.lastPulledAt
                    ? `\nLast import: ${new Date(connection.lastPulledAt).toLocaleString()}`
                    : ''}
                  {connection.lastPushedAt
                    ? `\nLast export: ${new Date(connection.lastPushedAt).toLocaleString()}`
                    : ''}
                </Text>
              ) : null}

              {provider === 'microsoft' && microsoftNeedsKeys ? (
                <Text style={styles.note}>
                  Outlook Connect is coming soon via Kairos backend (same seamless flow
                  as Google).
                </Text>
              ) : null}

              {provider === 'device' && !isDeviceCalendarSupported() ? (
                <Text style={styles.note}>
                  Device calendars require the iOS/Android app. On web, use Google or
                  Outlook, or Settings → Import .ics.
                </Text>
              ) : null}

              {provider === 'device' && deviceCalendars.length > 0 ? (
                <View style={styles.row}>
                  {deviceCalendars.slice(0, 8).map((cal) => {
                    const active = connection.calendarId === cal.id;
                    return (
                      <Pressable
                        key={cal.id}
                        onPress={() =>
                          setCalendarConnection('device', {
                            ...connection,
                            calendarId: cal.id,
                            calendarTitle: cal.title,
                            accountLabel: cal.source,
                          })
                        }
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[styles.chipText, active && styles.chipTextActive]}
                        >
                          {cal.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.row}>
                {!connection.connected ? (
                  <PrimaryButton
                    label={connecting ? 'Connecting…' : 'Connect'}
                    onPress={() => connect(provider)}
                    style={{ minWidth: 120 }}
                  />
                ) : (
                  <>
                    <PrimaryButton
                      label="Import"
                      variant="secondary"
                      onPress={() =>
                        run(`pull-${provider}`, async () => {
                          const res = await pullCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    <PrimaryButton
                      label="Export"
                      variant="secondary"
                      onPress={() =>
                        run(`push-${provider}`, async () => {
                          const res = await pushCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    <PrimaryButton
                      label="Import & export"
                      onPress={() =>
                        run(`sync-${provider}`, async () => {
                          const res = await syncCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    <PrimaryButton
                      label="Disconnect"
                      variant="secondary"
                      onPress={() => disconnect(provider)}
                    />
                  </>
                )}
                {provider === 'device' && connection.connected ? (
                  <PrimaryButton
                    label="Refresh calendars"
                    variant="secondary"
                    onPress={() =>
                      run('list-device', async () => {
                        const list = await listDeviceCalendars();
                        setDeviceCalendars(list);
                        setMessage(`Found ${list.length} device calendar(s).`);
                      })
                    }
                  />
                ) : null}
              </View>
            </View>
          );
        })}

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={colors.today} />
            <Text style={styles.note}>Working…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Text style={styles.note}>
          Import brings remote events into Kairos. Export sends Kairos tasks (new or
          edited) to the connected calendar — including Outlook.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import calendar from ics file"
          onPress={() => router.push('/import-calendar' as any)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Import .ics file</Text>
          <Text style={styles.note}>
            One-time upload from an Outlook, Google, or Apple calendar export.
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to calendar"
          onPress={() => router.push('/(tabs)/calendar')}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Export .ics from Calendar tab</Text>
          <Text style={styles.note}>
            Prefer a file? Open Calendar → Export .ics file to download your schedule.
          </Text>
        </Pressable>
        {Platform.OS === 'web' ? (
          <Text style={styles.note}>
            On web, Google Connect opens a secure Kairos sign-in — no API keys in the app.
            Apple & Samsung need a native build.
          </Text>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
