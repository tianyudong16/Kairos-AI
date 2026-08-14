import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { fromJsDate } from '@/lib/calendar-sync/time';
import { RemoteEvent } from '@/lib/calendar-sync/types';
import { toDateKey } from '@/lib/schedule';

const CLOUD_UID_KEY = 'kairos.cloudUid';

function readEnv(name: string) {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return (env[name] || '').trim();
}

/** Stable per-device id used as Firestore users/{uid} for calendar connections. */
export function getCloudUid(): string {
  if (typeof localStorage !== 'undefined') {
    const existing = localStorage.getItem(CLOUD_UID_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLOUD_UID_KEY, next);
    return next;
  }
  return `uid-${Date.now()}`;
}

export function setCloudUid(uid: string) {
  if (typeof localStorage !== 'undefined' && uid) {
    localStorage.setItem(CLOUD_UID_KEY, uid);
  }
}

export function getGoogleOAuthStartUrl() {
  return (
    readEnv('EXPO_PUBLIC_GOOGLE_OAUTH_START_URL') ||
    // Deployed Kairos Cloud Function (kairos-ai-13e53)
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

export function isCloudGoogleConfigured() {
  return Boolean(getGoogleOAuthStartUrl());
}

/** Opens Kairos backend Google OAuth — user only signs into Google. */
export async function startCloudGoogleConnect() {
  const uid = getCloudUid();
  const url = `${getGoogleOAuthStartUrl()}?uid=${encodeURIComponent(uid)}`;

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
  /** Raw Google RFC3339 timestamps — preferred for local conversion */
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  /** Legacy/server-computed fields (UTC-skewed on old deploys) */
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

/**
 * Convert Google timestamps to the device's local wall clock.
 * This must happen in the browser/app — Cloud Functions run in UTC.
 */
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

  // Fallback for older function responses without startDateTime
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

/** Check whether Firestore has a Google connection for this device. */
export async function getGoogleCloudStatus(): Promise<CloudGoogleStatus> {
  const uid = getCloudUid();
  const url = `${getGoogleStatusUrl()}?uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const json = (await res.json()) as CloudGoogleStatus & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || 'Could not check Google connection.');
  }
  return json;
}

/** Pull Google events via Kairos Cloud Function (uses stored refresh token). */
export async function importGoogleFromCloud(
  daysAhead = 14
): Promise<CloudImportResult> {
  const uid = getCloudUid();
  const base = getImportGoogleUrl();
  const tz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Los_Angeles';
  const url = `${base}?uid=${encodeURIComponent(uid)}&days=${daysAhead}&tz=${encodeURIComponent(
    tz
  )}`;
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
        : `Import failed (${res.status}). Redeploy Cloud Functions so importGoogle is live.`
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
