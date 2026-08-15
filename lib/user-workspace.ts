import type { CalendarConnection, CalendarProviderId } from '@/lib/calendar-sync/types';
import { defaultConnections } from '@/lib/calendar-sync/storage';
import type {
  CategoryDef,
  Chronotype,
  SleepSchedule,
  Task,
} from '@/lib/schedule';
import { chronotypeDefaults } from '@/lib/schedule';

export type UserWorkspace = {
  version: 1;
  onboarded: boolean;
  chronotype: Chronotype | null;
  sleep: SleepSchedule;
  tasks: Task[];
  categories: CategoryDef[];
  calendarConnections: Record<CalendarProviderId, CalendarConnection>;
  updatedAt: string;
};

export type SessionSnapshot = {
  email: string;
  isGuest: boolean;
  name: string;
  /** Cloud account id when signed in via Kairos backend */
  uid?: string;
  /** Opaque session token for cloud auth APIs */
  authToken?: string;
};

const WORKSPACE_PREFIX = 'kairos.workspace.v1.';
const SESSION_KEY = 'kairos.session.v1';

function canUseStorage() {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function workspaceKeyForUser(input: {
  email: string;
  isGuest?: boolean;
  id?: string;
}) {
  if (input.isGuest) return 'guest';
  if (input.id && !input.id.startsWith('u-') && !input.id.startsWith('guest-')) {
    return input.id;
  }
  return input.email.trim().toLowerCase() || 'unknown';
}

export function emptyWorkspace(
  categories: CategoryDef[],
  demoTasks: Task[] = []
): UserWorkspace {
  const defaults = chronotypeDefaults('morning');
  return {
    version: 1,
    onboarded: false,
    chronotype: 'morning',
    sleep: defaults.sleep,
    tasks: demoTasks,
    categories,
    calendarConnections: defaultConnections(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkspace(userKey: string): UserWorkspace | null {
  if (!canUseStorage() || !userKey) return null;
  try {
    const raw = globalThis.localStorage.getItem(WORKSPACE_PREFIX + userKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserWorkspace>;
    if (!parsed || typeof parsed !== 'object') return null;
    const base = defaultConnections();
    return {
      version: 1,
      onboarded: Boolean(parsed.onboarded),
      chronotype: (parsed.chronotype as Chronotype | null) ?? 'morning',
      sleep: parsed.sleep ?? chronotypeDefaults('morning').sleep,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      calendarConnections: {
        google: {
          ...base.google,
          ...(parsed.calendarConnections?.google || {}),
          provider: 'google',
        },
        microsoft: {
          ...base.microsoft,
          ...(parsed.calendarConnections?.microsoft || {}),
          provider: 'microsoft',
        },
        device: {
          ...base.device,
          ...(parsed.calendarConnections?.device || {}),
          provider: 'device',
        },
      },
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveWorkspace(userKey: string, workspace: UserWorkspace) {
  if (!canUseStorage() || !userKey) return;
  try {
    const next: UserWorkspace = {
      ...workspace,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    globalThis.localStorage.setItem(
      WORKSPACE_PREFIX + userKey,
      JSON.stringify(next)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function loadSession(): SessionSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = globalThis.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionSnapshot | null) {
  if (!canUseStorage()) return;
  try {
    if (!session) {
      globalThis.localStorage.removeItem(SESSION_KEY);
      return;
    }
    globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}
