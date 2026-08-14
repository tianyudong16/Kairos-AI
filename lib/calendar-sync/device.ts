import { Platform } from 'react-native';

import { fromJsDate, toIsoLocal } from '@/lib/calendar-sync/time';
import {
  CalendarConnection,
  PullResult,
  PushResult,
  RemoteCalendar,
  RemoteEvent,
  SyncTaskPatch,
} from '@/lib/calendar-sync/types';

async function loadCalendarModule() {
  try {
    return await import('expo-calendar');
  } catch {
    return null;
  }
}

export function isDeviceCalendarSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function connectDeviceCalendar(): Promise<{
  connection: CalendarConnection;
  calendars: RemoteCalendar[];
}> {
  if (!isDeviceCalendarSupported()) {
    throw new Error(
      'Apple Calendar and Samsung Calendar sync need the iOS/Android app. On web, use Google, Outlook, or .ics import.'
    );
  }

  const Calendar = await loadCalendarModule();
  if (!Calendar) {
    throw new Error('expo-calendar is unavailable in this build.');
  }

  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Calendar permission was denied.');
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const mapped: RemoteCalendar[] = calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color,
    source: cal.source?.name || cal.source?.type || Platform.OS,
    allowsModifications: cal.allowsModifications,
  }));

  const preferred =
    mapped.find((c) => /samsung/i.test(`${c.title} ${c.source}`)) ||
    mapped.find((c) => /icloud|apple|personal/i.test(`${c.title} ${c.source}`)) ||
    mapped.find((c) => c.allowsModifications) ||
    mapped[0];

  if (!preferred) {
    throw new Error('No device calendars found on this phone.');
  }

  return {
    connection: {
      provider: 'device',
      connected: true,
      accountLabel: preferred.source || Platform.OS,
      calendarId: preferred.id,
      calendarTitle: preferred.title,
    },
    calendars: mapped,
  };
}

export async function listDeviceCalendars(): Promise<RemoteCalendar[]> {
  const Calendar = await loadCalendarModule();
  if (!Calendar) return [];
  const permission = await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) {
    const requested = await Calendar.requestCalendarPermissionsAsync();
    if (!requested.granted) return [];
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color,
    source: cal.source?.name || cal.source?.type || Platform.OS,
    allowsModifications: cal.allowsModifications,
  }));
}

export async function pullDeviceEvents(
  connection: CalendarConnection,
  rangeStart: Date,
  rangeEnd: Date
): Promise<PullResult> {
  const Calendar = await loadCalendarModule();
  if (!Calendar) throw new Error('expo-calendar unavailable.');
  if (!connection.calendarId) throw new Error('Pick a device calendar first.');

  const items = await Calendar.getEventsAsync(
    [connection.calendarId],
    rangeStart,
    rangeEnd
  );

  const events: RemoteEvent[] = items.map((item) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const base = fromJsDate(start, end, Boolean(item.allDay));
    return {
      id: item.id,
      calendarId: connection.calendarId!,
      title: item.title || 'Untitled event',
      location: item.location || undefined,
      notes: item.notes || undefined,
      ...base,
    };
  });

  return { upserted: events.length, events };
}

export async function pushDeviceEvents(
  connection: CalendarConnection,
  tasks: SyncTaskPatch[]
): Promise<PushResult> {
  const Calendar = await loadCalendarModule();
  if (!Calendar) throw new Error('expo-calendar unavailable.');
  if (!connection.calendarId) throw new Error('Pick a device calendar first.');

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const details = {
        title: task.title,
        startDate: new Date(toIsoLocal(task.date, task.start)),
        endDate: new Date(toIsoLocal(task.date, task.end)),
        notes: `Synced from Kairos AI · ${task.category} · ${task.priority}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      };

      if (task.externalId && task.provider === 'device') {
        await Calendar.updateEventAsync(task.externalId, details);
        updated += 1;
      } else {
        await Calendar.createEventAsync(connection.calendarId, details);
        created += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push(err instanceof Error ? err.message : 'Push failed');
    }
  }

  return { created, updated, failed, errors };
}
