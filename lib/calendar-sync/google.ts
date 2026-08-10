import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

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

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function clientIdForPlatform() {
  const env = getCalendarEnv();
  // Prefer web client for Expo web; fall back to any configured ID for prototype.
  return (
    env.googleWebClientId ||
    env.googleIosClientId ||
    env.googleAndroidClientId ||
    ''
  );
}

export function isGoogleConfigured() {
  return Boolean(clientIdForPlatform());
}

export async function connectGoogle(): Promise<CalendarConnection> {
  const clientId = clientIdForPlatform();
  if (!clientId) {
    throw new Error(
      'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and iOS/Android IDs for native) to your env.'
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'kairosai',
    path: 'oauth',
  });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Google sign-in was cancelled.');
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    discovery
  );

  let accountLabel = 'Google Calendar';
  try {
    const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    }).then((r) => r.json());
    if (me?.email) accountLabel = me.email;
  } catch {
    // ignore
  }

  return {
    provider: 'google',
    connected: true,
    accountLabel,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? undefined,
    expiresAt: token.expiresIn
      ? Date.now() + token.expiresIn * 1000
      : undefined,
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
  if (!connection.accessToken) throw new Error('Google is not connected.');
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
  if (!connection.accessToken) throw new Error('Google is not connected.');
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
