/** Where the web app is running — used for OAuth return URLs on hosted builds. */
export function getAppOrigin(): string {
  const fromEnv = (
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_APP_URL : '') || ''
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://kairos-ai-13e53.web.app';
}

export function getCalendarSyncReturnUrl(): string {
  return `${getAppOrigin()}/calendar-sync`;
}

/** True when the app is served from Firebase Hosting (not local dev). */
export function isHostedWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com') ||
    (host !== 'localhost' && host !== '127.0.0.1')
  );
}
