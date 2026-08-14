import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { RemoteEvent } from '@/lib/calendar-sync/types';

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

export type CloudImportResult = {
  imported: number;
  accountEmail?: string;
  calendarId?: string;
  calendarTitle?: string;
  events: RemoteEvent[];
  message: string;
};

/** Pull Google events via Kairos Cloud Function (uses stored refresh token). */
export async function importGoogleFromCloud(
  daysAhead = 14
): Promise<CloudImportResult> {
  const uid = getCloudUid();
  const base = getImportGoogleUrl();
  const url = `${base}?uid=${encodeURIComponent(uid)}&days=${daysAhead}`;
  const res = await fetch(url);
  const json = (await res.json()) as CloudImportResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error || 'Could not import from Google Calendar.');
  }
  return json;
}
