import {
  CalendarConnection,
  CalendarProviderId,
  getCalendarEnv,
} from '@/lib/calendar-sync/types';

const STORAGE_KEY = 'kairos.calendar.connections.v1';

function canUseStorage() {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function defaultConnections(): Record<CalendarProviderId, CalendarConnection> {
  return {
    google: { provider: 'google', connected: false },
    microsoft: { provider: 'microsoft', connected: false },
    device: { provider: 'device', connected: false },
  };
}

export function loadConnections(): Record<CalendarProviderId, CalendarConnection> {
  const base = defaultConnections();
  if (!canUseStorage()) return base;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<CalendarProviderId, CalendarConnection>>;
    return {
      google: { ...base.google, ...parsed.google, provider: 'google' },
      microsoft: { ...base.microsoft, ...parsed.microsoft, provider: 'microsoft' },
      device: { ...base.device, ...parsed.device, provider: 'device' },
    };
  } catch {
    return base;
  }
}

export function saveConnections(
  connections: Record<CalendarProviderId, CalendarConnection>
) {
  if (!canUseStorage()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  } catch {
    // ignore
  }
}

export function providerConfigured(provider: CalendarProviderId) {
  const env = getCalendarEnv();
  if (provider === 'google') {
    return Boolean(
      env.googleWebClientId || env.googleIosClientId || env.googleAndroidClientId
    );
  }
  if (provider === 'microsoft') {
    return Boolean(env.microsoftClientId);
  }
  return true; // device calendars need OS permissions, not cloud client IDs
}
