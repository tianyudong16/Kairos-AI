import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { getCalendarSyncReturnUrl } from '@/lib/app-url';
import { loadCloudAuthSession } from '@/lib/cloud-auth';
import { fromJsDate, toIsoLocal } from '@/lib/calendar-sync/time';
import { RemoteEvent } from '@/lib/calendar-sync/types';
import type { SyncTaskPatch } from '@/lib/calendar-sync/types';
import { toDateKey } from '@/lib/schedule';

const CLOUD_UID_KEY = 'kairos.cloudUid';

function readEnv(name: string) {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return (env[name] || '').trim();
}

function requireAuthSession() {
  const session = loadCloudAuthSession();
  if (!session?.token || !session.user?.uid) {
    throw new Error('Sign in to your Kairos account before using Google Calendar.');
  }
  return session;
}

/** Signed-in account id — used as Firestore users/{uid} for calendar + auth. */
export function getCloudUid(): string {
  const session = loadCloudAuthSession();
  if (session?.user?.uid) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLOUD_UID_KEY, session.user.uid);
    }
    return session.user.uid;
  }

  throw new Error('Sign in to your Kairos account before connecting Google Calendar.');
}

export function setCloudUid(uid: string) {
  if (typeof localStorage !== 'undefined' && uid) {
    localStorage.setItem(CLOUD_UID_KEY, uid);
  }
}

function authQuery() {
  const session = requireAuthSession();
  return `uid=${encodeURIComponent(session.user.uid)}&token=${encodeURIComponent(session.token)}`;
}

export function getGoogleOAuthStartUrl() {
  return (
    readEnv('EXPO_PUBLIC_GOOGLE_OAUTH_START_URL') ||
    'https://googleoauthstart-terdg5ahya-uc.a.run.app'
  );
}

export function getImportGoogleUrl() {
  return (
    readEnv('EXPO_PUBLIC_IMPORT_GOOGLE_URL') ||
    'https://importgoogle-terdg5ahya-uc.a.run.app'
  );
}

export function getGoogleStatusUrl() {
  return (
    readEnv('EXPO_PUBLIC_GOOGLE_STATUS_URL') ||
    'https://googlestatus-terdg5ahya-uc.a.run.app'
  );
}

export function getExportGoogleUrl() {
  return (
    readEnv('EXPO_PUBLIC_EXPORT_GOOGLE_URL') ||
    'https://exportgoogle-terdg5ahya-uc.a.run.app'
  );
}

export function isCloudGoogleConfigured() {
  return Boolean(getGoogleOAuthStartUrl());
}

/** Opens Kairos backend Google OAuth — user only signs into Google. */
export async function startCloudGoogleConnect() {
  const session = requireAuthSession();
  const appRedirect = encodeURIComponent(getCalendarSyncReturnUrl());
  const url =
    `${getGoogleOAuthStartUrl()}?uid=${encodeURIComponent(session.user.uid)}` +
    `&token=${encodeURIComponent(session.token)}` +
    `&appRedirect=${appRedirect}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }

  const redirect = Linking.createURL('calendar-sync');
  const result = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }
}

type CloudGoogleEvent = {
  id: string;
  calendarId: string;
  title: string;
  allDay?: boolean;
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  start?: string;
  end?: string;
  durationMinutes?: number;
};

export type CloudImportResult = {
  imported: number;
  accountEmail?: string;
  calendarId?: string;
  calendarTitle?: string;
  events: RemoteEvent[];
  message: string;
};

export type CloudGoogleStatus = {
  connected: boolean;
  accountEmail?: string;
  calendarId?: string;
  calendarTitle?: string;
  lastImportedAt?: string | null;
};

export function localizeCloudGoogleEvent(raw: CloudGoogleEvent): RemoteEvent {
  if (raw.allDay || (raw.startDate && !raw.startDateTime)) {
    const date = raw.startDate || raw.date || toDateKey(new Date());
    return {
      id: raw.id,
      calendarId: raw.calendarId,
      title: raw.title,
      date,
      start: '9:00',
      end: '10:00',
      durationMinutes: 60,
      allDay: true,
    };
  }

  if (raw.startDateTime) {
    const start = new Date(raw.startDateTime);
    const end = new Date(
      raw.endDateTime || new Date(start.getTime() + 60 * 60 * 1000).toISOString()
    );
    const base = fromJsDate(start, end, false);
    return {
      id: raw.id,
      calendarId: raw.calendarId,
      title: raw.title,
      ...base,
    };
  }

  return {
    id: raw.id,
    calendarId: raw.calendarId,
    title: raw.title,
    date: raw.date || toDateKey(new Date()),
    start: raw.start || '9:00',
    end: raw.end || '10:00',
    durationMinutes: raw.durationMinutes || 60,
    allDay: Boolean(raw.allDay),
  };
}

export async function getGoogleCloudStatus(): Promise<CloudGoogleStatus> {
  const url = `${getGoogleStatusUrl()}?${authQuery()}`;
  const res = await fetch(url);
  const json = (await res.json()) as CloudGoogleStatus & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || 'Could not check Google connection.');
  }
  return json;
}

export async function importGoogleFromCloud(
  daysAhead = 14
): Promise<CloudImportResult> {
  const session = requireAuthSession();
  const base = getImportGoogleUrl();
  const tz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Los_Angeles';
  const url =
    `${base}?uid=${encodeURIComponent(session.user.uid)}` +
    `&token=${encodeURIComponent(session.token)}` +
    `&days=${daysAhead}&tz=${encodeURIComponent(tz)}`;
  const res = await fetch(url);
  let json: Omit<CloudImportResult, 'events'> & {
    error?: string;
    events?: CloudGoogleEvent[];
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error(
      res.ok
        ? 'Could not import from Google Calendar.'
        : `Import failed (${res.status}). Deploy Cloud Functions: npx firebase-tools deploy --only functions`
    );
  }
  if (!res.ok) {
    throw new Error(json.error || 'Could not import from Google Calendar.');
  }

  const events = (json.events || []).map(localizeCloudGoogleEvent);
  return {
    imported: events.length,
    accountEmail: json.accountEmail,
    calendarId: json.calendarId,
    calendarTitle: json.calendarTitle,
    events,
    message:
      json.message ||
      `Imported ${events.length} event${events.length === 1 ? '' : 's'} from Google.`,
  };
}

export type CloudExportResult = {
  created: number;
  updated: number;
  failed: number;
  message: string;
  links: Array<{ taskId: string; externalId: string; calendarId: string }>;
};

export async function exportGoogleToCloud(
  tasks: SyncTaskPatch[]
): Promise<CloudExportResult> {
  if (!tasks.length) {
    return {
      created: 0,
      updated: 0,
      failed: 0,
      message: 'No tasks to export.',
      links: [],
    };
  }
  const session = requireAuthSession();
  const url = getExportGoogleUrl();
  const payload = {
    uid: session.user.uid,
    token: session.token,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      priority: task.priority,
      externalId: task.externalId,
      startDateTime: toIsoLocal(task.date, task.start),
      endDateTime: toIsoLocal(task.date, task.end),
    })),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let json: CloudExportResult & { error?: string };
  try {
    json = (await res.json()) as CloudExportResult & { error?: string };
  } catch {
    throw new Error(
      `Export failed (${res.status}). Deploy Cloud Functions: npx firebase-tools deploy --only functions`
    );
  }
  if (!res.ok) {
    throw new Error(json.error || 'Could not export to Google Calendar.');
  }
  return {
    created: json.created || 0,
    updated: json.updated || 0,
    failed: json.failed || 0,
    links: json.links || [],
    message:
      json.message ||
      `Exported to Google: ${json.created || 0} created, ${json.updated || 0} updated.`,
  };
}
