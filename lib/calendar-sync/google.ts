import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ensureFirebaseUser, isFirebaseConfigured, readGoogleConnectionDoc } from '@/lib/firebase';
import { fromJsDate, parseGoogleDateTime, toIsoLocal } from '@/lib/calendar-sync/time';
import {
  CalendarConnection,
  getCalendarEnv,
  PullResult,
  PushResult,
  RemoteCalendar,
  RemoteEvent,
  SyncTaskPatch,
} from '@/lib/calendar-sync/types';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_OAUTH_START =
  'https://us-central1-kairos-ai-13e53.cloudfunctions.net/googleOAuthStart';

function oauthStartUrl() {
  const env = getCalendarEnv();
  return (env.googleOAuthStartUrl || DEFAULT_OAUTH_START).replace(/\/$/, '');
}

/** Backend holds Google client secrets — end users never paste API keys. */
export function isGoogleConfigured() {
  return true;
}

function connectionFromFirestoreDoc(
  data: Record<string, unknown> | null
): CalendarConnection | null {
  if (!data) return null;
  const connected = Boolean(data.connected ?? data.accessToken ?? data.refreshToken);
  if (!connected) return null;
  return {
    provider: 'google',
    connected: true,
    accountLabel:
      (typeof data.email === 'string' && data.email) ||
      (typeof data.accountLabel === 'string' && data.accountLabel) ||
      'Google Calendar',
    accessToken: typeof data.accessToken === 'string' ? data.accessToken : undefined,
    refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : undefined,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
    calendarId:
      (typeof data.calendarId === 'string' && data.calendarId) || 'primary',
    calendarTitle:
      (typeof data.calendarTitle === 'string' && data.calendarTitle) || 'Primary',
  };
}

export async function refreshGoogleConnectionFromBackend(
  uid: string
): Promise<CalendarConnection | null> {
  if (!uid || !isFirebaseConfigured()) return null;
  try {
    const data = await readGoogleConnectionDoc(uid);
    return connectionFromFirestoreDoc(data);
  } catch {
    return null;
  }
}

/**
 * Seamless Connect: open Kairos Cloud Function OAuth (no client API keys in the app).
 * Requires Firebase Auth uid (bridged from the signed-in Kairos account).
 */
export async function connectGoogle(input: {
  email?: string;
  password?: string;
  firebaseUid?: string;
}): Promise<CalendarConnection> {
  let uid = input.firebaseUid?.trim() || '';

  if (!uid) {
    if (!input.email || !input.password) {
      throw new Error('Sign in to Kairos (not as guest) before connecting Google.');
    }
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Add Firebase web config to `.env` (EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, APP_ID) so Connect can use your account. Google API keys are not needed.'
      );
    }
    const user = await ensureFirebaseUser(input.email, input.password);
    uid = user.uid;
  }

  const start = `${oauthStartUrl()}?uid=${encodeURIComponent(uid)}`;
  const returnUrl = Linking.createURL('calendar-sync');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(start);
    // Navigation away — caller should treat as in-progress.
    return {
      provider: 'google',
      connected: false,
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(start, returnUrl);
  if (result.type !== 'success' && result.type !== 'dismiss') {
    throw new Error('Google sign-in was cancelled.');
  }

  // Prefer Firestore tokens written by googleOAuthCallback.
  if (isFirebaseConfigured()) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const fromBackend = await refreshGoogleConnectionFromBackend(uid);
      if (fromBackend?.connected) return fromBackend;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return {
    provider: 'google',
    connected: true,
    accountLabel: 'Google Calendar',
    calendarId: 'primary',
    calendarTitle: 'Primary',
  };
}

async function authedFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${body.slice(0, 180)}`);
  }
  return res.json();
}

export async function listGoogleCalendars(token: string): Promise<RemoteCalendar[]> {
  const data = await authedFetch('/users/me/calendarList', token);
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.summary || item.id,
    color: item.backgroundColor,
    source: 'Google',
    allowsModifications: item.accessRole === 'owner' || item.accessRole === 'writer',
  }));
}

export async function pullGoogleEvents(
  connection: CalendarConnection,
  rangeStart: Date,
  rangeEnd: Date
): Promise<PullResult> {
  if (!connection.accessToken) {
    throw new Error(
      'Google is connected on the server, but Import needs a token refresh. Disconnect and Connect Google again, or try shortly.'
    );
  }
  const calendarId = encodeURIComponent(connection.calendarId || 'primary');
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    maxResults: '250',
  });
  const data = await authedFetch(
    `/calendars/${calendarId}/events?${params.toString()}`,
    connection.accessToken
  );
  const events: RemoteEvent[] = (data.items || [])
    .filter((item: any) => item.status !== 'cancelled')
    .map((item: any) => {
      const { start, end, allDay } = parseGoogleDateTime(item);
      const base = fromJsDate(start, end, allDay);
      return {
        id: item.id,
        calendarId: connection.calendarId || 'primary',
        title: item.summary || 'Untitled event',
        location: item.location,
        notes: item.description,
        ...base,
      } as RemoteEvent;
    });
  return { upserted: events.length, events };
}

export async function pushGoogleEvents(
  connection: CalendarConnection,
  tasks: SyncTaskPatch[]
): Promise<PushResult> {
  if (!connection.accessToken) {
    throw new Error(
      'Google is connected on the server, but Export needs a token refresh. Disconnect and Connect Google again, or try shortly.'
    );
  }
  const calendarId = encodeURIComponent(connection.calendarId || 'primary');
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const body = {
        summary: task.title,
        description: `Synced from Kairos AI · ${task.category} · ${task.priority}`,
        start: { dateTime: toIsoLocal(task.date, task.start) },
        end: { dateTime: toIsoLocal(task.date, task.end) },
      };
      if (task.externalId && task.provider === 'google') {
        await authedFetch(
          `/calendars/${calendarId}/events/${encodeURIComponent(task.externalId)}`,
          connection.accessToken,
          { method: 'PATCH', body: JSON.stringify(body) }
        );
        updated += 1;
      } else {
        await authedFetch(`/calendars/${calendarId}/events`, connection.accessToken, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        created += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push(err instanceof Error ? err.message : 'Push failed');
    }
  }

  return { created, updated, failed, errors };
}
