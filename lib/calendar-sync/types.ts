export type CalendarProviderId = 'google' | 'microsoft' | 'device';

export type CalendarConnection = {
  provider: CalendarProviderId;
  connected: boolean;
  accountLabel?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  /** Selected device/remote calendar id for sync */
  calendarId?: string;
  calendarTitle?: string;
  lastPulledAt?: string;
  lastPushedAt?: string;
};

export type RemoteCalendar = {
  id: string;
  title: string;
  color?: string;
  source?: string;
  allowsModifications?: boolean;
};

export type RemoteEvent = {
  id: string;
  calendarId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  location?: string;
  notes?: string;
  allDay?: boolean;
};

export type SyncTaskPatch = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  category: string;
  priority: 'high' | 'medium' | 'low';
  externalId?: string;
  externalCalendarId?: string;
  provider?: CalendarProviderId;
  syncDirty?: boolean;
};

export type PullResult = {
  upserted: number;
  events: RemoteEvent[];
};

export type PushResult = {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
};

export const PROVIDER_META: Record<
  CalendarProviderId,
  { label: string; blurb: string; icon: 'logo-google' | 'mail-outline' | 'phone-portrait-outline' }
> = {
  google: {
    label: 'Google Calendar',
    blurb: 'Two-way sync with Google Calendar via OAuth.',
    icon: 'logo-google',
  },
  microsoft: {
    label: 'Outlook / Microsoft 365',
    blurb: 'Two-way sync with Outlook calendars via Microsoft Graph.',
    icon: 'mail-outline',
  },
  device: {
    label: 'Apple / Samsung / Device',
    blurb:
      'Sync with calendars on this phone — Apple Calendar, Samsung Calendar, and accounts already on the device.',
    icon: 'phone-portrait-outline',
  },
};

export function getCalendarEnv() {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return {
    googleWebClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    googleIosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    googleAndroidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    microsoftClientId: env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
    microsoftTenantId: env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common',
  };
}
