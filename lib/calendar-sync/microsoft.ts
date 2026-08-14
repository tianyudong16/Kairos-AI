import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { fromJsDate, toIsoLocal } from '@/lib/calendar-sync/time';
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

function discovery(): AuthSession.DiscoveryDocument {
  const tenant = getCalendarEnv().microsoftTenantId || 'common';
  return {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
  };
}

export function isMicrosoftConfigured() {
  return Boolean(getCalendarEnv().microsoftClientId);
}

export async function connectMicrosoft(): Promise<CalendarConnection> {
  const clientId = getCalendarEnv().microsoftClientId;
  if (!clientId) {
    throw new Error('Add EXPO_PUBLIC_MICROSOFT_CLIENT_ID to your env.');
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
      'offline_access',
      'User.Read',
      'Calendars.ReadWrite',
    ],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const disc = discovery();
  await request.makeAuthUrlAsync(disc);
  const result = await request.promptAsync(disc);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Microsoft sign-in was cancelled.');
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
    disc
  );

  let accountLabel = 'Outlook';
  try {
    const me = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    }).then((r) => r.json());
    accountLabel = me.mail || me.userPrincipalName || accountLabel;
  } catch {
    // ignore
  }

  return {
    provider: 'microsoft',
    connected: true,
    accountLabel,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? undefined,
    expiresAt: token.expiresIn
      ? Date.now() + token.expiresIn * 1000
      : undefined,
    calendarId: 'calendar',
    calendarTitle: 'Calendar',
  };
}

async function graph(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Microsoft Graph ${res.status}: ${body.slice(0, 180)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listMicrosoftCalendars(token: string): Promise<RemoteCalendar[]> {
  const data = await graph('/me/calendars', token);
  return (data?.value || []).map((item: any) => ({
    id: item.id,
    title: item.name || 'Calendar',
    color: item.hexColor,
    source: 'Outlook',
    allowsModifications: item.canEdit !== false,
  }));
}

export async function pullMicrosoftEvents(
  connection: CalendarConnection,
  rangeStart: Date,
  rangeEnd: Date
): Promise<PullResult> {
  if (!connection.accessToken) throw new Error('Outlook is not connected.');
  const calendarId = connection.calendarId || 'calendar';
  const path =
    calendarId === 'calendar'
      ? `/me/calendarView?startDateTime=${encodeURIComponent(rangeStart.toISOString())}&endDateTime=${encodeURIComponent(rangeEnd.toISOString())}&$orderby=start/dateTime&$top=250`
      : `/me/calendars/${encodeURIComponent(calendarId)}/calendarView?startDateTime=${encodeURIComponent(rangeStart.toISOString())}&endDateTime=${encodeURIComponent(rangeEnd.toISOString())}&$orderby=start/dateTime&$top=250`;

  const data = await graph(path, connection.accessToken);
  const events: RemoteEvent[] = (data?.value || []).map((item: any) => {
    const start = new Date(item.start?.dateTime + (item.start?.timeZone === 'UTC' ? 'Z' : ''));
    const end = new Date(item.end?.dateTime + (item.end?.timeZone === 'UTC' ? 'Z' : ''));
    // Graph often returns local wall time without Z — Date parse may shift; prefer dateTime as local-ish
    const startSafe = Number.isNaN(start.getTime())
      ? new Date(item.start?.dateTime)
      : start;
    const endSafe = Number.isNaN(end.getTime()) ? new Date(item.end?.dateTime) : end;
    const base = fromJsDate(startSafe, endSafe, Boolean(item.isAllDay));
    return {
      id: item.id,
      calendarId,
      title: item.subject || 'Untitled event',
      location: item.location?.displayName,
      notes: item.bodyPreview,
      ...base,
    } as RemoteEvent;
  });
  return { upserted: events.length, events };
}

export async function pushMicrosoftEvents(
  connection: CalendarConnection,
  tasks: SyncTaskPatch[]
): Promise<PushResult> {
  if (!connection.accessToken) throw new Error('Outlook is not connected.');
  const calendarId = connection.calendarId || 'calendar';
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const body = {
        subject: task.title,
        body: {
          contentType: 'text',
          content: `Synced from Kairos AI · ${task.category} · ${task.priority}`,
        },
        start: {
          dateTime: toIsoLocal(task.date, task.start).replace(/([+-]\d{2}:\d{2}|Z)$/, ''),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
        end: {
          dateTime: toIsoLocal(task.date, task.end).replace(/([+-]\d{2}:\d{2}|Z)$/, ''),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
      };

      if (task.externalId && task.provider === 'microsoft') {
        await graph(`/me/events/${encodeURIComponent(task.externalId)}`, connection.accessToken, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        updated += 1;
      } else {
        const path =
          calendarId === 'calendar'
            ? '/me/events'
            : `/me/calendars/${encodeURIComponent(calendarId)}/events`;
        await graph(path, connection.accessToken, {
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
