import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import {
  CalendarProviderId,
  connectDeviceCalendar,
  connectGoogle,
  connectMicrosoft,
  getCalendarEnv,
  isDeviceCalendarSupported,
  isGoogleConfigured,
  isMicrosoftConfigured,
  listDeviceCalendars,
  listGoogleCalendars,
  listMicrosoftCalendars,
  PROVIDER_META,
  providerConfigured,
  RemoteCalendar,
} from '@/lib/calendar-sync';

export default function CalendarSyncScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
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
  const [showSetup, setShowSetup] = useState(false);

  const env = useMemo(() => getCalendarEnv(), []);

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
    setupBox: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bg,
      padding: 12,
      gap: 6,
    },
    setupTitle: { fontFamily: fonts.semibold, fontSize: 13, color: c.ink },
    code: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.work,
      backgroundColor: c.workSoft,
      padding: 8,
      borderRadius: 8,
    },
  }));

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
        const connection = await connectGoogle();
        setCalendarConnection('google', connection);
        try {
          const calendars = await listGoogleCalendars(connection.accessToken!);
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
        setMessage(`Connected Google as ${connection.accountLabel}.`);
        return;
      }
      if (provider === 'microsoft') {
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
        <Text style={styles.title}>Live calendar sync</Text>
        <Text style={styles.subtitle}>
          Connect Google, Outlook, or this phone’s calendars (Apple / Samsung). Pull
          events into Kairos and push Kairos tasks back out.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show calendar sync setup instructions"
          onPress={() => setShowSetup((v) => !v)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>
            {showSetup ? 'Hide setup guide' : 'Show setup guide (API keys)'}
          </Text>
          {showSetup ? (
            <View style={styles.setupBox}>
              <Text style={styles.setupTitle}>1) Google Calendar</Text>
              <Text style={styles.note}>
                Google Cloud Console → APIs & Services → enable Calendar API → create
                OAuth client IDs (Web, iOS, Android). Add authorized redirect URI from
                Expo AuthSession (scheme `kairosai`).
              </Text>
              <Text style={styles.code}>
                EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...{'\n'}
                EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...{'\n'}
                EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
              </Text>
              <Text style={styles.setupTitle}>2) Outlook / Microsoft 365</Text>
              <Text style={styles.note}>
                Azure Portal → App registrations → New app → add Redirect URI (SPA /
                mobile) for `kairosai://oauth` → API permissions: Calendars.ReadWrite,
                User.Read, offline_access.
              </Text>
              <Text style={styles.code}>
                EXPO_PUBLIC_MICROSOFT_CLIENT_ID=...{'\n'}
                EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
              </Text>
              <Text style={styles.setupTitle}>3) Apple / Samsung</Text>
              <Text style={styles.note}>
                Uses on-device calendars via Expo Calendar. Build the iOS/Android app
                (not web-only). Apple Calendar appears on iOS; Samsung Calendar appears
                on Samsung Android devices. Grant calendar permission when prompted.
              </Text>
              <Text style={styles.note}>
                Status — Google configured: {isGoogleConfigured() ? 'yes' : 'no'} ·
                Microsoft configured: {isMicrosoftConfigured() ? 'yes' : 'no'} · Device
                supported here: {isDeviceCalendarSupported() ? 'yes' : 'no (web)'}
              </Text>
              {!env.googleWebClientId && !env.microsoftClientId ? (
                <Text style={styles.note}>
                  Tip: copy `.env.example` to `.env` and restart Expo after adding keys.
                </Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>

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
                    ? `\nLast pull: ${new Date(connection.lastPulledAt).toLocaleString()}`
                    : ''}
                  {connection.lastPushedAt
                    ? `\nLast push: ${new Date(connection.lastPushedAt).toLocaleString()}`
                    : ''}
                </Text>
              ) : null}

              {!configured && provider !== 'device' ? (
                <Text style={styles.error}>
                  Missing client ID — open the setup guide above.
                </Text>
              ) : null}

              {provider === 'device' && !isDeviceCalendarSupported() ? (
                <Text style={styles.note}>
                  Device calendars require the iOS/Android app. On web, use Google or
                  Outlook OAuth, or Settings → Import .ics.
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
                      label="Pull"
                      variant="secondary"
                      onPress={() =>
                        run(`pull-${provider}`, async () => {
                          const res = await pullCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    <PrimaryButton
                      label="Push"
                      variant="secondary"
                      onPress={() =>
                        run(`push-${provider}`, async () => {
                          const res = await pushCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    <PrimaryButton
                      label="Sync both"
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
          Pull brings remote events into Kairos. Push sends Kairos tasks (new or edited)
          to the connected calendar — including Outlook. One-way .ics import remains in
          Settings if you prefer file export.
        </Text>
        {Platform.OS === 'web' ? (
          <Text style={styles.note}>
            Running on web: Google/Outlook OAuth work here once client IDs are set. Apple
            & Samsung need a native build.
          </Text>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
