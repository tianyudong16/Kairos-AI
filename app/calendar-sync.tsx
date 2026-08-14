import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ScreenBackButton } from '@/components/nav/ScreenBackButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import {
  getGoogleCloudStatus,
  isCloudGoogleConfigured,
  setCloudUid,
  startCloudGoogleConnect,
} from '@/lib/cloud-calendar';
import {
  CalendarProviderId,
  connectDeviceCalendar,
  connectMicrosoft,
  getCalendarEnv,
  isDeviceCalendarSupported,
  isMicrosoftConfigured,
  listDeviceCalendars,
  listMicrosoftCalendars,
  PROVIDER_META,
  providerConfigured,
  RemoteCalendar,
} from '@/lib/calendar-sync';

export default function CalendarSyncScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ google?: string; uid?: string }>();
  const { colors } = useTheme();
  const {
    calendarConnections,
    setCalendarConnection,
    pullCalendar,
    pushCalendar,
    syncCalendar,
    importGoogleCloud,
    exportGoogleCloud,
  } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceCalendars, setDeviceCalendars] = useState<RemoteCalendar[]>([]);
  const handledGoogleReturn = useRef(false);
  const verifiedCloud = useRef(false);

  const env = useMemo(() => getCalendarEnv(), []);
  const cloudGoogle = isCloudGoogleConfigured();
  const google = calendarConnections.google;

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

  const markGoogleDisconnected = () => {
    setCalendarConnection('google', {
      provider: 'google',
      connected: false,
    });
  };

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

  // Keep local "Connected" badge in sync with Firestore (source of truth)
  useEffect(() => {
    if (!cloudGoogle || verifiedCloud.current || params.google === 'connected') {
      return;
    }
    verifiedCloud.current = true;
    void (async () => {
      try {
        const status = await getGoogleCloudStatus();
        if (status.connected) {
          setCalendarConnection('google', {
            provider: 'google',
            connected: true,
            accountLabel: status.accountEmail,
            calendarId: status.calendarId || 'primary',
            calendarTitle: status.calendarTitle || 'Primary',
            lastPulledAt: status.lastImportedAt || undefined,
          });
        } else if (google.connected) {
          markGoogleDisconnected();
        }
      } catch {
        // Status function may not be deployed yet — don't fake "connected"
        if (google.connected) {
          markGoogleDisconnected();
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudGoogle]);

  // After Google OAuth, Cloud Function redirects here with ?google=connected&uid=...
  useEffect(() => {
    if (params.google !== 'connected' || handledGoogleReturn.current) return;
    handledGoogleReturn.current = true;

    if (typeof params.uid === 'string' && params.uid) {
      setCloudUid(params.uid);
    }

    void run('import-google', async () => {
      try {
        const res = await importGoogleCloud(14);
        setCalendarConnection('google', {
          provider: 'google',
          connected: true,
          accountLabel: undefined,
          calendarId: 'primary',
          calendarTitle: 'Primary',
          lastPulledAt: new Date().toISOString(),
        });
        // Refresh labels from cloud status when available
        try {
          const status = await getGoogleCloudStatus();
          if (status.connected) {
            setCalendarConnection('google', {
              provider: 'google',
              connected: true,
              accountLabel: status.accountEmail,
              calendarId: status.calendarId || 'primary',
              calendarTitle: status.calendarTitle || 'Primary',
              lastPulledAt: new Date().toISOString(),
            });
          }
        } catch {
          // optional
        }
        setMessage(
          `Connected Google. ${res.message} Open Schedule or Calendar to see them.`
        );
      } catch (err) {
        markGoogleDisconnected();
        throw err;
      } finally {
        router.replace('/calendar-sync' as any);
      }
    });
  }, [params.google, params.uid, importGoogleCloud, router, setCalendarConnection]);

  const connect = async (provider: CalendarProviderId) => {
    await run(`connect-${provider}`, async () => {
      if (provider === 'google') {
        if (!cloudGoogle) {
          throw new Error(
            'Google connect is not configured on the Kairos backend yet.'
          );
        }
        markGoogleDisconnected();
        setMessage('Opening Google…');
        await startCloudGoogleConnect();
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
          <ScreenBackButton fallbackHref="/(tabs)/calendar" style={{ marginBottom: 0 }} />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>Import & export</Text>
        <Text style={styles.subtitle}>
          Connect Google once — Kairos imports your events into Schedule
          automatically. Outlook and Apple/Samsung follow the same idea.
        </Text>

        {providers.map((provider) => {
          const meta = PROVIDER_META[provider];
          const connection = calendarConnections[provider];
          const configured =
            provider === 'google'
              ? cloudGoogle
              : provider === 'microsoft'
                ? isMicrosoftConfigured() || providerConfigured(provider)
                : providerConfigured(provider);
          const connecting = busy === `connect-${provider}`;
          const isGoogleCloud = provider === 'google' && cloudGoogle;

          return (
            <View key={provider} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name={meta.icon} size={18} color={colors.coach} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle}>{meta.label}</Text>
                  <Text style={styles.cardMeta}>
                    {provider === 'google'
                      ? 'Sign in with Google — no API keys for you to paste.'
                      : meta.blurb}
                  </Text>
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
                    ? `\nLast import: ${new Date(
                        connection.lastPulledAt
                      ).toLocaleString()}`
                    : ''}
                  {connection.lastPushedAt
                    ? `\nLast export: ${new Date(
                        connection.lastPushedAt
                      ).toLocaleString()}`
                    : ''}
                </Text>
              ) : null}

              {!configured && provider === 'microsoft' ? (
                <Text style={styles.note}>
                  Outlook live connect still needs Microsoft client setup on our
                  backend. Use Import .ics for now, or Connect Google.
                </Text>
              ) : null}

              {provider === 'device' && !isDeviceCalendarSupported() ? (
                <Text style={styles.note}>
                  Device calendars require the iOS/Android app. On web, use Google
                  or Import .ics.
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
                      label={busy === `pull-${provider}` ? 'Importing…' : 'Import'}
                      variant="secondary"
                      onPress={() =>
                        run(`pull-${provider}`, async () => {
                          if (isGoogleCloud) {
                            const res = await importGoogleCloud(14);
                            setMessage(res.message);
                            return;
                          }
                          const res = await pullCalendar(provider);
                          setMessage(res.message);
                        })
                      }
                    />
                    {isGoogleCloud ? (
                      <>
                        <PrimaryButton
                          label={busy === 'export-google' ? 'Exporting…' : 'Export'}
                          variant="secondary"
                          onPress={() =>
                            run('export-google', async () => {
                              const res = await exportGoogleCloud();
                              setMessage(res.message);
                            })
                          }
                        />
                        <PrimaryButton
                          label="Reconnect"
                          variant="secondary"
                          onPress={() => connect('google')}
                        />
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                    <PrimaryButton
                      label="Disconnect"
                      variant="secondary"
                      onPress={() => disconnect(provider)}
                    />
                  </>
                )}
                {isGoogleCloud && connection.connected ? (
                  <Text style={styles.note}>
                    Import pulls Google events into Schedule. Export sends your
                    Kairos tasks to Google Calendar.
                  </Text>
                ) : null}
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
          Google uses Kairos’s secure backend. After you connect, events appear on
          Schedule and Calendar automatically.
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
        {Platform.OS === 'web' && !env.microsoftClientId ? (
          <Text style={styles.note}>
            Outlook two-way sync is next on the backend roadmap. .ics import works
            today.
          </Text>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
