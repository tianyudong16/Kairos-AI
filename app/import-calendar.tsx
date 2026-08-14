import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppShell } from '@/components/ui/AppShell';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackButton } from '@/components/nav/ScreenBackButton';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import {
  ImportedCalendarEvent,
  parseIcs,
  SAMPLE_OUTLOOK_ICS,
} from '@/lib/ics';
import { formatDisplayDate } from '@/lib/schedule';

export default function ImportCalendarScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { importCalendarEvents } = useApp();
  const [icsText, setIcsText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [events, setEvents] = useState<ImportedCalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const styles = useThemedStyles((c) => ({
    content: { gap: 14, paddingBottom: 28 },
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
      gap: 8,
    },
    cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.ink },
    step: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.inkSoft,
      lineHeight: 19,
    },
    actions: { gap: 10 },
    secondaryBtn: {
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: c.work,
      backgroundColor: c.workSoft,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center' as const,
      ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }),
    },
    secondaryText: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: c.work,
    },
    fileMeta: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
    },
    pasteInput: {
      minHeight: 110,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderStyle: 'dashed' as const,
      backgroundColor: c.bg,
      padding: 12,
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.ink,
      textAlignVertical: 'top' as const,
    },
    error: { fontFamily: fonts.medium, fontSize: 13, color: c.alert },
    success: { fontFamily: fonts.medium, fontSize: 13, color: c.health },
    previewHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    previewCount: {
      fontFamily: fonts.bold,
      fontSize: 12,
      letterSpacing: 0.6,
      color: c.inkSoft,
    },
    eventRow: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bg,
      padding: 12,
      gap: 2,
    },
    eventTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.ink },
    eventMeta: { fontFamily: fonts.body, fontSize: 12, color: c.inkMuted },
    note: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 17,
    },
  }));

  const preview = useMemo(() => events.slice(0, 12), [events]);

  const applyParsed = (raw: string, sourceLabel?: string) => {
    try {
      const parsed = parseIcs(raw);
      if (!parsed.length) {
        setEvents([]);
        setError('No events found in that calendar file.');
        setResult(null);
        return;
      }
      setEvents(parsed);
      setError(null);
      setResult(null);
      if (sourceLabel) setFileName(sourceLabel);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : 'Could not read that calendar file.');
      setResult(null);
    }
  };

  const pickFile = () => {
    const doc = (globalThis as { document?: any }).document;
    if (Platform.OS !== 'web' || !doc?.createElement) {
      setError('On this build, paste an exported .ics file below (or use web).');
      return;
    }
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.ics,text/calendar,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      setIcsText(text);
      applyParsed(text, file.name);
    };
    input.click();
  };

  const importSelected = () => {
    if (!events.length) {
      setError('Load a calendar file first.');
      return;
    }
    const { imported, skipped } = importCalendarEvents(events);
    setResult(
      `Imported ${imported} event${imported === 1 ? '' : 's'}` +
        (skipped ? ` · skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : '')
    );
    setError(null);
  };

  return (
    <AppShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <ScreenBackButton fallbackHref="/(tabs)/calendar" style={{ marginBottom: 0 }} />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.brand}>Kairos AI</Text>
        <Text style={styles.title}>Import .ics</Text>
        <Text style={styles.subtitle}>
          Bring Outlook, Google, or Apple events into Kairos by exporting a `.ics`
          calendar file, then importing it here. For live Import / Export with those
          apps, use Calendar → Google, Outlook, or Apple / Samsung.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>From Outlook</Text>
          <Text style={styles.step}>
            1. Open Outlook → Calendar
          </Text>
          <Text style={styles.step}>
            2. Export / save your calendar as an iCalendar (`.ics`) file
          </Text>
          <Text style={styles.step}>
            3. Upload that file below (or paste the file contents)
          </Text>
          <Text style={styles.note}>
            Tip: Outlook on the web can publish or download a calendar as ICS. Desktop
            Outlook: File → Save Calendar.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose ICS calendar file"
            onPress={pickFile}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Choose .ics file</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load sample Outlook calendar"
            onPress={() => {
              setIcsText(SAMPLE_OUTLOOK_ICS);
              applyParsed(SAMPLE_OUTLOOK_ICS, 'sample-outlook.ics');
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Try sample Outlook export</Text>
          </Pressable>
          {fileName ? <Text style={styles.fileMeta}>Loaded: {fileName}</Text> : null}
        </View>

        <Text style={styles.cardTitle}>Or paste .ics text</Text>
        <TextInput
          value={icsText}
          onChangeText={setIcsText}
          placeholder="Paste BEGIN:VCALENDAR… here"
          placeholderTextColor={colors.inkMuted}
          multiline
          style={styles.pasteInput}
          accessibilityLabel="Paste ICS calendar text"
        />
        <PrimaryButton
          label="Parse pasted calendar"
          variant="secondary"
          onPress={() => applyParsed(icsText, fileName || 'pasted.ics')}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {result ? <Text style={styles.success}>{result}</Text> : null}

        {events.length ? (
          <View style={styles.card}>
            <View style={styles.previewHeader}>
              <Text style={styles.cardTitle}>Preview</Text>
              <Text style={styles.previewCount}>
                {events.length} EVENT{events.length === 1 ? '' : 'S'}
              </Text>
            </View>
            {preview.map((event) => (
              <View key={`${event.uid}-${event.date}-${event.start}`} style={styles.eventRow}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {formatDisplayDate(event.date)} · {event.start}–{event.end}
                  {event.allDay ? ' · all day' : ''}
                </Text>
                <Text style={styles.eventMeta}>
                  {event.category.toUpperCase()} · {event.priority}
                  {event.location ? ` · ${event.location}` : ''}
                </Text>
              </View>
            ))}
            {events.length > preview.length ? (
              <Text style={styles.note}>
                Showing first {preview.length}. All {events.length} will import.
              </Text>
            ) : null}
            <PrimaryButton label={`Import ${events.length} events`} onPress={importSelected} />
            {result ? (
              <PrimaryButton
                label="View schedule →"
                variant="secondary"
                onPress={() => router.replace('/(tabs)')}
              />
            ) : null}
          </View>
        ) : null}

        <Text style={styles.note}>
          Live two-way Outlook sync (Microsoft Graph) needs a Microsoft app registration
          and sign-in. This import uses the standard calendar file Outlook already
          exports — no Azure setup required.
        </Text>
      </ScrollView>
    </AppShell>
  );
}
