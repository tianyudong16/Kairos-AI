import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { colors, useTheme } from '@/constants/theme';
import {
  findAccount,
  Lifestyle,
  loadAccounts,
  saveAccounts,
  StoredAccount,
} from '@/lib/auth';
import {
  CalendarConnection,
  CalendarProviderId,
  loadConnections,
  pullDeviceEvents,
  pullGoogleEvents,
  pullMicrosoftEvents,
  pushDeviceEvents,
  pushGoogleEvents,
  pushMicrosoftEvents,
  RemoteEvent,
  saveConnections,
  SyncTaskPatch,
} from '@/lib/calendar-sync';
import {
  cloudFetchWorkspace,
  cloudLogin,
  cloudLogout,
  cloudMe,
  cloudRegister,
  cloudSaveWorkspace,
  cloudUpdateProfile,
  isCloudAuthConfigured,
  loadCloudAuthSession,
  saveCloudAuthSession,
} from '@/lib/cloud-auth';
import {
  cloudCoachChat,
  type CoachLlmAction,
} from '@/lib/cloud-coach';
import { importGoogleFromCloud, exportGoogleToCloud, setCloudUid } from '@/lib/cloud-calendar';
import { isHostedWebApp } from '@/lib/app-url';
import { ImportedCalendarEvent } from '@/lib/ics';
import {
  emptyWorkspace,
  loadSession,
  loadWorkspace,
  saveSession,
  saveWorkspace,
  workspaceKeyForUser,
  type UserWorkspace,
} from '@/lib/user-workspace';
import {
  addDays,
  addMinutesToTime,
  applySleepNeedHours,
  resolveCoachSleepSchedule,
  Category,
  CategoryDef,
  chronotypeDefaults,
  Chronotype,
  DraftTask,
  formatDuration,
  iconForCategory,
  minutesToTime,
  parseDuration,
  parseSleepNeedHours,
  Priority,
  SleepSchedule,
  sleepDurationHours,
  softFromColor,
  Task,
  timeToMinutes,
  toDateKey,
} from '@/lib/schedule';

export type { Category, CategoryDef, Chronotype, DraftTask, Priority, SleepSchedule, Task };
export type { Lifestyle };

type CoachMessage = { id: string; role: 'ai' | 'user'; text: string };
type CoachChange = { id: string; label: string; detail: string };

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  lifestyle: Lifestyle | null;
};

type AppContextValue = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<string | null>;
  signIn: (input: { email: string; password: string }) => Promise<string | null>;
  signInAsGuest: () => void;
  updateProfile: (
    patch: Partial<Pick<UserProfile, 'name' | 'email' | 'lifestyle'>>
  ) => void;
  signOut: () => void;
  onboarded: boolean;
  chronotype: Chronotype | null;
  setChronotype: (value: Chronotype) => void;
  sleep: SleepSchedule;
  setSleep: (value: SleepSchedule) => void;
  completeOnboarding: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  categories: CategoryDef[];
  getCategory: (id: string) => CategoryDef;
  addCategory: (input: { label: string; color: string }) => CategoryDef;
  updateCategory: (id: string, patch: Partial<Pick<CategoryDef, 'label' | 'color'>>) => void;
  deleteCategory: (id: string) => void;
  tasks: Task[];
  tasksForSelectedDate: Task[];
  addTask: (input: {
    title: string;
    date?: string;
    durationMinutes: number;
    category: Category;
    priority?: Priority;
    start?: string;
  }) => void;
  addDraftTasks: (drafts: DraftTask[], date?: string) => void;
  importCalendarEvents: (
    events: ImportedCalendarEvent[]
  ) => { imported: number; skipped: number };
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (id: string, direction: 'up' | 'down') => void;
  moveTaskDate: (id: string, date: string) => void;
  optimizeSchedule: (date?: string) => string;
  calendarConnections: Record<CalendarProviderId, CalendarConnection>;
  setCalendarConnection: (
    provider: CalendarProviderId,
    connection: CalendarConnection
  ) => void;
  pullCalendar: (
    provider: CalendarProviderId,
    daysAhead?: number
  ) => Promise<{ pulled: number; message: string }>;
  pushCalendar: (
    provider: CalendarProviderId
  ) => Promise<{ created: number; updated: number; failed: number; message: string }>;
  syncCalendar: (
    provider: CalendarProviderId
  ) => Promise<{ message: string }>;
  /** Seamless Google import via Kairos Cloud Function (Firestore tokens). */
  importGoogleCloud: (
    daysAhead?: number
  ) => Promise<{ imported: number; message: string }>;
  /** Push Kairos tasks to Google Calendar via Cloud Function. */
  exportGoogleCloud: () => Promise<{
    created: number;
    updated: number;
    failed: number;
    message: string;
  }>;
  coachMessages: CoachMessage[];
  lastCoachChanges: CoachChange[];
  coachBusy: boolean;
  sendCoachMessage: (text: string) => Promise<void>;
  applyCoachAction: (action: string) => string;
  peakWindowLabel: string;
  capacitySummary: { focusHours: number; capacityHours: number; overflowHours: number };
};

const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'work',
    label: 'WORK',
    color: colors.work,
    soft: colors.workSoft,
    builtIn: true,
  },
  {
    id: 'study',
    label: 'STUDY',
    color: colors.study,
    soft: colors.studySoft,
    builtIn: true,
  },
  {
    id: 'health',
    label: 'HEALTH',
    color: colors.health,
    soft: colors.healthSoft,
    builtIn: true,
  },
  {
    id: 'life',
    label: 'LIFE',
    color: colors.life,
    soft: colors.lifeSoft,
    builtIn: true,
  },
];

const fallbackCategory: CategoryDef = {
  id: 'life',
  label: 'LIFE',
  color: colors.life,
  soft: colors.lifeSoft,
  builtIn: true,
};

const todayKey = toDateKey(new Date());

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Morning Cardio',
    date: todayKey,
    start: '9:00',
    end: '9:45',
    durationMinutes: 45,
    category: 'health',
    priority: 'medium',
    icon: 'run',
    order: 0,
  },
  {
    id: '2',
    title: 'React Architecture',
    date: todayKey,
    start: '10:00',
    end: '11:30',
    durationMinutes: 90,
    category: 'work',
    priority: 'high',
    icon: 'code',
    order: 1,
  },
  {
    id: '3',
    title: 'Standup',
    date: todayKey,
    start: '11:30',
    end: '11:45',
    durationMinutes: 15,
    category: 'study',
    priority: 'medium',
    icon: 'people',
    order: 2,
  },
  {
    id: '4',
    title: 'Lunch',
    date: todayKey,
    start: '12:00',
    end: '12:45',
    durationMinutes: 45,
    category: 'life',
    priority: 'low',
    icon: 'food',
    order: 3,
  },
  {
    id: '5',
    title: 'Email Admin',
    date: todayKey,
    start: '13:00',
    end: '13:45',
    durationMinutes: 45,
    category: 'study',
    priority: 'low',
    icon: 'mail',
    order: 4,
  },
  {
    id: '6',
    title: 'Calculus',
    date: todayKey,
    start: '14:00',
    end: '15:00',
    durationMinutes: 60,
    category: 'life',
    priority: 'medium',
    icon: 'book',
    order: 5,
  },
  {
    id: '7',
    title: 'Design critique',
    date: addDays(todayKey, 1),
    start: '10:00',
    end: '11:00',
    durationMinutes: 60,
    category: 'work',
    priority: 'high',
    icon: 'code',
    order: 0,
  },
  {
    id: '8',
    title: 'Gym',
    date: addDays(todayKey, 2),
    start: '18:00',
    end: '19:00',
    durationMinutes: 60,
    category: 'health',
    priority: 'medium',
    icon: 'run',
    order: 0,
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { colors: themeColors } = useTheme();
  const defaults = chronotypeDefaults('morning');
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => loadAccounts());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [chronotype, setChronotypeState] = useState<Chronotype | null>('morning');
  const [sleep, setSleep] = useState<SleepSchedule>(defaults.sleep);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [categories, setCategories] = useState<CategoryDef[]>(DEFAULT_CATEGORIES);
  const [calendarConnections, setCalendarConnections] = useState(() =>
    loadConnections()
  );
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const applyWorkspace = (ws: ReturnType<typeof emptyWorkspace>) => {
    setOnboarded(ws.onboarded);
    setChronotypeState(ws.chronotype);
    setSleep(ws.sleep);
    setTasks(ws.tasks);
    setCategories(ws.categories.length ? ws.categories : DEFAULT_CATEGORIES);
    setCalendarConnections(ws.calendarConnections);
  };

  const resetWorkspaceMemory = () => {
    const defaultsSleep = chronotypeDefaults('morning');
    setOnboarded(false);
    setChronotypeState('morning');
    setSleep(defaultsSleep.sleep);
    setTasks(initialTasks);
    setCategories(DEFAULT_CATEGORIES);
    setCalendarConnections(loadConnections());
  };

  // Restore last session + that user's saved schedule/onboarding
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      // Prefer cloud session (works across browsers once functions are deployed)
      if (isCloudAuthConfigured()) {
        try {
          const cloud = await cloudMe();
          if (cancelled) return;
          if (cloud) {
            setCloudUid(cloud.user.uid);
            let ws: UserWorkspace | null = null;
            try {
              ws = await cloudFetchWorkspace(cloud.token);
            } catch {
              ws = null;
            }
            if (!ws) {
              ws =
                loadWorkspace(cloud.user.uid) ||
                loadWorkspace(cloud.user.email) ||
                emptyWorkspace(DEFAULT_CATEGORIES, []);
            }
            if (cloud.user.lifestyle && !ws.onboarded) {
              ws.onboarded = true;
            }
            setUser({
              id: cloud.user.uid,
              name: cloud.user.name,
              email: cloud.user.email,
              isGuest: false,
              lifestyle: (cloud.user.lifestyle as Lifestyle | null) ?? null,
            });
            applyWorkspace(ws);
            saveSession({
              email: cloud.user.email,
              isGuest: false,
              name: cloud.user.name,
              uid: cloud.user.uid,
              authToken: cloud.token,
            });
            saveWorkspace(cloud.user.uid, ws);
            setWorkspaceReady(true);
            return;
          }
        } catch {
          // fall through to local session
        }
      }

      const session = loadSession();
      if (!session) {
        if (!cancelled) setWorkspaceReady(true);
        return;
      }
      const key = workspaceKeyForUser({
        email: session.email,
        isGuest: session.isGuest,
        id: session.uid,
      });
      const stored = loadWorkspace(key);
      const account = !session.isGuest
        ? findAccount(session.email, loadAccounts())
        : null;
      if (!session.isGuest && !account && !session.uid) {
        saveSession(null);
        if (!cancelled) setWorkspaceReady(true);
        return;
      }
      const ws =
        stored ||
        emptyWorkspace(
          DEFAULT_CATEGORIES,
          session.isGuest ? initialTasks : []
        );
      if (!stored && account?.lifestyle) {
        ws.onboarded = true;
      }
      if (session.uid) setCloudUid(session.uid);
      if (!cancelled) {
        setUser({
          id: session.uid
            ? session.uid
            : session.isGuest
              ? `guest-${session.email}`
              : `u-${account!.email}`,
          name: session.name || account?.name || 'Guest',
          email: session.email,
          isGuest: session.isGuest,
          lifestyle: account?.lifestyle ?? null,
        });
        applyWorkspace(ws);
        setWorkspaceReady(true);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    saveConnections(calendarConnections);
  }, [calendarConnections]);

  // Persist the signed-in user's workspace (tasks, onboarding, prefs)
  useEffect(() => {
    if (!workspaceReady || !user) return;
    const key = workspaceKeyForUser(user);
    const payload: UserWorkspace = {
      version: 1,
      onboarded,
      chronotype,
      sleep,
      tasks,
      categories,
      calendarConnections,
      updatedAt: new Date().toISOString(),
    };
    saveWorkspace(key, payload);

    const cloud = loadCloudAuthSession();
    if (cloud?.token && !user.isGuest) {
      void cloudSaveWorkspace(cloud.token, payload).catch(() => {
        // keep local copy if cloud save fails
      });
    }
  }, [
    workspaceReady,
    user,
    onboarded,
    chronotype,
    sleep,
    tasks,
    categories,
    calendarConnections,
  ]);

  const upsertRemoteEvents = (
    provider: CalendarProviderId,
    events: RemoteEvent[]
  ) => {
    let pulled = 0;
    setTasks((prev) => {
      const next = [...prev];
      const byExternal = new Map(
        prev
          .filter((t) => t.provider === provider && t.externalId)
          .map((t) => [t.externalId!, t])
      );
      const orderByDate: Record<string, number> = {};
      prev.forEach((task) => {
        orderByDate[task.date] = Math.max(orderByDate[task.date] ?? -1, task.order);
      });

      events.forEach((event) => {
        const existing = byExternal.get(event.id);
        if (existing) {
          const index = next.findIndex((t) => t.id === existing.id);
          if (index >= 0) {
            next[index] = {
              ...next[index],
              title: event.title,
              date: event.date,
              start: event.start,
              end: event.end,
              durationMinutes: event.durationMinutes,
              externalId: event.id,
              externalCalendarId: event.calendarId,
              provider,
              syncDirty: false,
            };
            pulled += 1;
          }
          return;
        }
        const order = (orderByDate[event.date] ?? -1) + 1;
        orderByDate[event.date] = order;
        next.push({
          id: `${provider}-${event.id}`,
          title: event.title,
          date: event.date,
          start: event.start,
          end: event.end,
          durationMinutes: event.durationMinutes,
          category: /lunch|dinner|personal/i.test(event.title) ? 'life' : 'work',
          priority: 'medium',
          icon: iconForCategory(
            /lunch|dinner|personal/i.test(event.title) ? 'life' : 'work'
          ),
          order,
          externalId: event.id,
          externalCalendarId: event.calendarId,
          provider,
          syncDirty: false,
        });
        pulled += 1;
      });
      return next;
    });
    return pulled;
  };
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    {
      id: 'c1',
      role: 'ai',
      text: 'Chat with me like Gemini — I’ll use your real schedule. Action cards are shortcuts if AI isn’t connected yet.',
    },
  ]);
  const [lastCoachChanges, setLastCoachChanges] = useState<CoachChange[]>([]);
  const [coachBusy, setCoachBusy] = useState(false);

  useEffect(() => {
    const builtInColors: Record<string, { color: string; soft: string }> = {
      work: { color: themeColors.work, soft: themeColors.workSoft },
      study: { color: themeColors.study, soft: themeColors.studySoft },
      health: { color: themeColors.health, soft: themeColors.healthSoft },
      life: { color: themeColors.life, soft: themeColors.lifeSoft },
    };
    setCategories((prev) =>
      prev.map((cat) => {
        if (!cat.builtIn) return cat;
        const next = builtInColors[cat.id];
        if (!next) return cat;
        return { ...cat, color: next.color, soft: next.soft };
      })
    );
  }, [themeColors]);

  const getCategory = (id: string) =>
    categories.find((c) => c.id === id) ||
    categories[0] ||
    fallbackCategory;

  const peakStart = chronotype
    ? chronotypeDefaults(chronotype).peakStart
    : defaults.peakStart;

  const tasksForSelectedDate = useMemo(
    () =>
      tasks
        .filter((task) => task.date === selectedDate)
        .sort((a, b) => a.order - b.order || timeToMinutes(a.start) - timeToMinutes(b.start)),
    [tasks, selectedDate]
  );

  const capacitySummary = useMemo(() => {
    const wake = timeToMinutes(sleep.wakeTime);
    let bed = timeToMinutes(sleep.bedtime);
    if (bed <= wake) bed += 24 * 60;
    const capacityHours = Math.max(0, (bed - wake - 90) / 60); // minus buffer
    const focusHours =
      tasksForSelectedDate
        .filter((t) => t.priority === 'high' || t.category === 'work' || t.category === 'study')
        .reduce((sum, t) => sum + t.durationMinutes, 0) / 60;
    return {
      focusHours: Math.round(focusHours * 10) / 10,
      capacityHours: Math.round(capacityHours * 10) / 10,
      overflowHours: Math.max(0, Math.round((focusHours - capacityHours) * 10) / 10),
    };
  }, [sleep, tasksForSelectedDate]);

  const packDay = (dayTasks: Task[], date: string, startAt = peakStart) => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const sorted = [...dayTasks].sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] || a.order - b.order
    );
    let cursor = timeToMinutes(startAt);
    const bed = timeToMinutes(sleep.bedtime);
    const bedMinutes = bed <= timeToMinutes(sleep.wakeTime) ? bed + 24 * 60 : bed;

    return sorted.map((task, index) => {
      // keep lunch-ish life tasks near noon if possible
      if (task.category === 'life' && /lunch/i.test(task.title)) {
        cursor = Math.max(cursor, timeToMinutes('12:00'));
      }
      if (cursor + task.durationMinutes > bedMinutes - 30) {
        // spill marker handled by caller for tomorrow moves
      }
      const start = minutesToTime(cursor);
      const end = minutesToTime(cursor + task.durationMinutes);
      cursor += task.durationMinutes + 10; // buffer
      return { ...task, date, start, end, order: index };
    });
  };

  const optimizeSchedule = (date = selectedDate) => {
    const dayTasks = tasks.filter((t) => t.date === date);
    const others = tasks.filter((t) => t.date !== date);
    const packed = packDay(dayTasks, date, peakStart);
    const bed = timeToMinutes(sleep.bedtime);
    const bedMinutes = bed <= timeToMinutes(sleep.wakeTime) ? bed + 24 * 60 : bed;

    const keep: Task[] = [];
    const spill: Task[] = [];
    packed.forEach((task) => {
      if (timeToMinutes(task.end) > bedMinutes - 30 && task.priority !== 'high') {
        spill.push(task);
      } else {
        keep.push(task);
      }
    });

    const tomorrow = addDays(date, 1);
    const tomorrowExisting = others.filter((t) => t.date === tomorrow);
    const moved = spill.map((task, index) => ({
      ...task,
      date: tomorrow,
      start: minutesToTime(timeToMinutes(peakStart) + index * 70),
      end: minutesToTime(timeToMinutes(peakStart) + index * 70 + task.durationMinutes),
      order: tomorrowExisting.length + index,
    }));

    const repackedKeep = packDay(keep, date, peakStart);
    setTasks([
      ...others.filter((t) => t.date !== tomorrow),
      ...tomorrowExisting,
      ...repackedKeep,
      ...moved,
    ]);

    return spill.length > 0
      ? `Optimized ${date}: kept ${keep.length} tasks in peak/capacity windows and moved ${spill.length} lower-priority item(s) to ${tomorrow}.`
      : `Optimized ${date}: packed ${keep.length} tasks around your ${peakStart} peak window and ${sleep.bedtime} bedtime.`;
  };

  const applyCoachAction = (raw: string) => {
    const text = raw.toLowerCase();
    const changes: CoachChange[] = [];
    const pushChange = (label: string, detail: string) => {
      changes.push({ id: `ch-${Date.now()}-${changes.length}`, label, detail });
    };

    if (/bedtime|sleep|wake|get up|sleeptime/.test(text)) {
      const beforeHours = sleepDurationHours(sleep);
      const needHours = parseSleepNeedHours(text);

      // “I only need 8h of sleep” → set duration (keep wake, move bedtime)
      if (needHours != null) {
        const keepBed = /keep(?:ing)?\s+(?:my\s+)?bed|from\s+bedtime|bedtime\s+fixed/.test(text);
        const next = applySleepNeedHours(sleep, needHours, keepBed ? 'bed' : 'wake');
        const hours = sleepDurationHours(next);
        setSleep(next);
        pushChange(
          'Sleep need updated',
          `${beforeHours}h → ${hours}h · Bed ${next.bedtime} · Wake ${next.wakeTime}`
        );
        setLastCoachChanges(changes);
        return `Set sleep need to ${hours}h (was ${beforeHours}h). Keeping ${
          keepBed ? 'bedtime' : 'wake'
        } fixed → bed ${next.bedtime}, wake ${next.wakeTime}.`;
      }

      const next = { ...sleep };
      let changed = false;
      const bedMatch = text.match(
        /(?:bed(?:time)?|sleep(?:\s*at)?)\s*(?:at|=|:)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?!\s*(?:h|hr|hrs|hours?)\b)/i
      );
      const wakeMatch = text.match(
        /(?:wake|get up)\s*(?:at|=|:|up)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?!\s*(?:h|hr|hrs|hours?)\b)/i
      );

      if (bedMatch) {
        // Prefer normalize if available via simple HH parsing
        const raw = bedMatch[1].replace(/\s+/g, '');
        const m = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = m[2] ? parseInt(m[2], 10) : 0;
          const mer = m[3]?.toLowerCase();
          if (mer === 'pm' && h < 12) h += 12;
          if (mer === 'am' && h === 12) h = 0;
          next.bedtime = `${h}:${`${min}`.padStart(2, '0')}`;
          changed = true;
        }
      } else if (/\bbed(time)?\b/.test(text)) {
        if (/\b11\b/.test(text)) {
          next.bedtime = '23:00';
          changed = true;
        } else if (/\b10\b/.test(text)) {
          next.bedtime = '22:00';
          changed = true;
        } else if (/\b12\b|midnight/.test(text)) {
          next.bedtime = '0:00';
          changed = true;
        }
      }

      if (wakeMatch) {
        const raw = wakeMatch[1].replace(/\s+/g, '');
        const m = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = m[2] ? parseInt(m[2], 10) : 0;
          const mer = m[3]?.toLowerCase();
          if (mer === 'pm' && h < 12) h += 12;
          if (mer === 'am' && h === 12) h = 0;
          next.wakeTime = `${h}:${`${min}`.padStart(2, '0')}`;
          changed = true;
        }
      } else if (/\bwake\b|\bget up\b/.test(text)) {
        if (/\bearly\b|\b5\b/.test(text)) {
          next.wakeTime = '5:30';
          changed = true;
        } else if (/\b6\b/.test(text)) {
          next.wakeTime = '6:00';
          changed = true;
        } else if (/\b7\b/.test(text)) {
          next.wakeTime = '7:00';
          changed = true;
        } else if (/\b8\b/.test(text)) {
          next.wakeTime = '8:00';
          changed = true;
        } else if (/\b9\b/.test(text)) {
          next.wakeTime = '9:00';
          changed = true;
        } else if (/\b10\b/.test(text)) {
          next.wakeTime = '10:00';
          changed = true;
        }
      }

      if (!changed) {
        pushChange(
          'Sleep unchanged',
          `Still ${beforeHours}h · ${sleep.bedtime}–${sleep.wakeTime}`
        );
        setLastCoachChanges(changes);
        return `Your sleep is currently ${beforeHours}h (bed ${sleep.bedtime} → wake ${sleep.wakeTime}). Try “I only need 8h of sleep”, “set bedtime 11pm”, or “wake at 7”.`;
      }

      const hours = sleepDurationHours(next);
      setSleep(next);
      pushChange('Sleep updated', `${hours}h · Bed ${next.bedtime} · Wake ${next.wakeTime}`);
      setLastCoachChanges(changes);
      return `Updated sleep window → bed ${next.bedtime} / wake ${next.wakeTime} (${hours}h sleep).`;
    }

    if (/protect peak|peak window|deep work/.test(text)) {
      const day = tasks.filter((t) => t.date === selectedDate);
      const others = tasks.filter((t) => t.date !== selectedDate);
      const high = day.filter((t) => t.priority === 'high' || t.category === 'work');
      const rest = day.filter((t) => !(t.priority === 'high' || t.category === 'work'));
      const packed = packDay([...high, ...rest], selectedDate, peakStart);
      setTasks([...others, ...packed]);
      pushChange(
        'Peak protected',
        `${high.length} focus blocks placed from ${peakStart}`
      );
      setLastCoachChanges(changes);
      return `Protected your ${peakStart} peak window. High-priority/work blocks come first.`;
    }

    if (/insert break|recovery|reset/.test(text)) {
      const start = '15:30';
      const breakTask: Task = {
        id: `break-${Date.now()}`,
        title: 'Recovery break',
        date: selectedDate,
        start,
        end: addMinutesToTime(start, 20),
        durationMinutes: 20,
        category: 'health',
        priority: 'medium',
        icon: 'run',
        order: tasksForSelectedDate.length,
      };
      const day = [...tasks.filter((t) => t.date === selectedDate), breakTask];
      const others = tasks.filter((t) => t.date !== selectedDate);
      setTasks([...others, ...packDay(day, selectedDate, peakStart)]);
      pushChange('Break inserted', '20m recovery break added mid-afternoon');
      setLastCoachChanges(changes);
      return 'Inserted a 20-minute recovery break and re-packed the afternoon.';
    }

    if (/split/.test(text)) {
      const day = tasks.filter((t) => t.date === selectedDate);
      const longest = [...day].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
      if (!longest || longest.durationMinutes < 60) {
        return 'No long block to split (need 60m+). Add a longer task first.';
      }
      const half = Math.round(longest.durationMinutes / 2);
      const partA: Task = {
        ...longest,
        title: `${longest.title} (1/2)`,
        durationMinutes: half,
        end: addMinutesToTime(longest.start, half),
      };
      const partB: Task = {
        ...longest,
        id: `${longest.id}-b`,
        title: `${longest.title} (2/2)`,
        durationMinutes: longest.durationMinutes - half,
        start: addMinutesToTime(partA.end, 15),
        end: addMinutesToTime(addMinutesToTime(partA.end, 15), longest.durationMinutes - half),
        order: longest.order + 1,
      };
      const others = tasks.filter((t) => t.id !== longest.id);
      const dayRest = day.filter((t) => t.id !== longest.id);
      setTasks([
        ...others.filter((t) => t.date !== selectedDate),
        ...packDay([...dayRest, partA, partB], selectedDate, peakStart),
      ]);
      pushChange('Split long block', `${longest.title} → two ${formatDuration(half)} sessions`);
      setLastCoachChanges(changes);
      return `Split “${longest.title}” into two sessions with a buffer between them.`;
    }

    if (/clear evening|after 5|evening/.test(text)) {
      const tomorrow = addDays(selectedDate, 1);
      const movedTitles: string[] = [];
      const nextTasks = tasks.map((task) => {
        if (task.date !== selectedDate) return task;
        if (timeToMinutes(task.start) >= timeToMinutes('17:00') && task.priority !== 'high') {
          movedTitles.push(task.title);
          return {
            ...task,
            date: tomorrow,
            start: peakStart,
            end: addMinutesToTime(peakStart, task.durationMinutes),
          };
        }
        return task;
      });
      setTasks(nextTasks);
      pushChange(
        'Evening cleared',
        movedTitles.length
          ? `Moved: ${movedTitles.join(', ')}`
          : 'Nothing after 5pm needed moving'
      );
      setLastCoachChanges(changes);
      return movedTitles.length
        ? `Cleared the evening by moving ${movedTitles.length} task(s) to tomorrow’s peak.`
        : 'Evening already clear of low/medium tasks.';
    }

    if (/boost|raise priority|make .* high/.test(text)) {
      const day = tasks.filter((t) => t.date === selectedDate);
      const candidate =
        day.find((t) => /react|code|exam|study/i.test(t.title)) ||
        day.find((t) => t.priority !== 'high') ||
        day[0];
      if (!candidate) return 'No tasks today to boost.';
      setTasks((prev) =>
        prev.map((t) =>
          t.id === candidate.id ? { ...t, priority: 'high' as Priority } : t
        )
      );
      pushChange('Priority boosted', `${candidate.title} → HIGH`);
      setLastCoachChanges(changes);
      return `Boosted “${candidate.title}” to high priority.`;
    }

    if (/balance|mix categories|variety/.test(text)) {
      const day = tasks.filter((t) => t.date === selectedDate);
      const others = tasks.filter((t) => t.date !== selectedDate);
      const sorted = [...day].sort((a, b) => {
        if (a.category === b.category) return a.order - b.order;
        return a.category.localeCompare(b.category);
      });
      // interleave categories roughly
      const buckets: Record<string, Task[]> = {};
      sorted.forEach((t) => {
        buckets[t.category] = buckets[t.category] || [];
        buckets[t.category].push(t);
      });
      const interleaved: Task[] = [];
      let added = true;
      while (added) {
        added = false;
        Object.keys(buckets).forEach((key) => {
          const item = buckets[key].shift();
          if (item) {
            interleaved.push(item);
            added = true;
          }
        });
      }
      setTasks([...others, ...packDay(interleaved, selectedDate, peakStart)]);
      pushChange('Day balanced', 'Interleaved work / study / health / life blocks');
      setLastCoachChanges(changes);
      return 'Rebalanced the day so categories alternate instead of clustering.';
    }

    if (/low priority|tomorrow|overflow|too much|optimize/.test(text)) {
      const before = tasks.filter((t) => t.date === selectedDate).map((t) => t.title);
      const summary = optimizeSchedule(selectedDate);
      pushChange('Schedule optimized', summary);
      setLastCoachChanges(changes);
      return summary;
    }

    if (/prioritize|focus on work/.test(text)) {
      const updated = tasks.map((task) =>
        task.date === selectedDate && task.category === 'work'
          ? { ...task, priority: 'high' as Priority }
          : task.date === selectedDate && task.category === 'life'
            ? { ...task, priority: 'low' as Priority }
            : task
      );
      const day = updated.filter((t) => t.date === selectedDate);
      const others = updated.filter((t) => t.date !== selectedDate);
      setTasks([...others, ...packDay(day, selectedDate, peakStart)]);
      pushChange('Work prioritized', 'Work → high, life admin → low, then re-packed');
      setLastCoachChanges(changes);
      return 'Marked work as high priority and life admin as lower priority, then re-packed today.';
    }

    if (/add |schedule /.test(text)) {
      const duration = parseDuration(text);
      const title = raw.replace(/add |schedule /i, '').trim() || 'New task';
      const category: Category = /run|gym|cardio|workout/.test(text)
        ? 'health'
        : /study|exam|read/.test(text)
          ? 'study'
          : /lunch|errand|call/.test(text)
            ? 'life'
            : 'work';
      const newTask: Task = {
        id: `t-${Date.now()}`,
        title: title.slice(0, 48),
        date: selectedDate,
        start: peakStart,
        end: addMinutesToTime(peakStart, duration),
        durationMinutes: duration,
        category,
        priority: 'medium',
        icon: iconForCategory(category),
        order: tasksForSelectedDate.length,
      };
      const day = [...tasks.filter((t) => t.date === selectedDate), newTask];
      const others = tasks.filter((t) => t.date !== selectedDate);
      setTasks([...others, ...packDay(day, selectedDate, peakStart)]);
      pushChange('Task added', `${newTask.title} (${formatDuration(duration)})`);
      setLastCoachChanges(changes);
      return `Added “${newTask.title}” and fitted it into ${selectedDate}.`;
    }

    const summary = optimizeSchedule(selectedDate);
    pushChange('Fallback optimize', summary);
    setLastCoachChanges(changes);
    return `${summary} Tip: try “insert break”, “split longest task”, “clear evening”, or “boost priority”.`;
  };

  const findTaskByTitle = (title: string | undefined, date = selectedDate) => {
    if (!title) return null;
    const needle = title.toLowerCase().trim();
    const day = tasks.filter((t) => t.date === date);
    return (
      day.find((t) => t.title.toLowerCase() === needle) ||
      day.find((t) => t.title.toLowerCase().includes(needle)) ||
      tasks.find((t) => t.title.toLowerCase() === needle) ||
      tasks.find((t) => t.title.toLowerCase().includes(needle)) ||
      null
    );
  };

  /** Apply structured actions returned by the cloud LLM coach. */
  const applyCoachLlmActions = (actions: CoachLlmAction[]) => {
    const changes: CoachChange[] = [];
    const notes: string[] = [];
    const pushChange = (label: string, detail: string) => {
      changes.push({ id: `ch-${Date.now()}-${changes.length}`, label, detail });
    };

    for (const action of actions) {
      if (!action || action.type === 'none') continue;

      if (action.type === 'optimize') {
        notes.push(optimizeSchedule(selectedDate));
        pushChange('Schedule optimized', notes[notes.length - 1]);
        continue;
      }
      if (action.type === 'protect_peak') {
        notes.push(applyCoachAction('protect peak window'));
        continue;
      }
      if (action.type === 'insert_break') {
        notes.push(applyCoachAction('insert recovery break'));
        continue;
      }
      if (action.type === 'split_longest') {
        notes.push(applyCoachAction('split longest task'));
        continue;
      }
      if (action.type === 'clear_evening') {
        notes.push(applyCoachAction('clear evening after 5'));
        continue;
      }
      if (action.type === 'balance') {
        notes.push(applyCoachAction('balance categories'));
        continue;
      }
      if (action.type === 'prioritize_work') {
        notes.push(applyCoachAction('prioritize work'));
        continue;
      }
      if (action.type === 'boost_priority') {
        const match = findTaskByTitle(action.taskTitle);
        if (match) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === match.id ? { ...t, priority: 'high' as Priority } : t
            )
          );
          pushChange('Priority boosted', `${match.title} → HIGH`);
          notes.push(`Boosted “${match.title}” to high priority.`);
        } else {
          notes.push(applyCoachAction('boost priority of focus task'));
        }
        continue;
      }
      if (action.type === 'set_sleep') {
        const next = resolveCoachSleepSchedule(sleep, action);
        const changed =
          next.bedtime !== sleep.bedtime || next.wakeTime !== sleep.wakeTime;
        if (changed) {
          setSleep(next);
          const usedNeedHours =
            !action.bedtime &&
            !action.wakeTime &&
            typeof action.needHours === 'number' &&
            action.needHours > 0;
          pushChange(
            usedNeedHours ? 'Sleep need updated' : 'Sleep updated',
            `${sleepDurationHours(next)}h · Bed ${next.bedtime} · Wake ${next.wakeTime}`
          );
          notes.push(
            usedNeedHours
              ? `Set sleep need to ${action.needHours}h → bed ${next.bedtime}, wake ${next.wakeTime}.`
              : `Updated sleep → bed ${next.bedtime} / wake ${next.wakeTime}.`
          );
        } else {
          notes.push(
            `Sleep is already bed ${sleep.bedtime} / wake ${sleep.wakeTime}.`
          );
        }
        continue;
      }
      if (action.type === 'add_task') {
        const duration = action.durationMinutes || 60;
        const category = (action.category || 'work') as Category;
        const priority = (action.priority || 'medium') as Priority;
        const start = action.preferredStart || peakStart;
        const newTask: Task = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.title.slice(0, 64),
          date: selectedDate,
          start,
          end: addMinutesToTime(start, duration),
          durationMinutes: duration,
          category,
          priority,
          icon: iconForCategory(category),
          order: tasksForSelectedDate.length,
        };
        const day = [...tasks.filter((t) => t.date === selectedDate), newTask];
        const others = tasks.filter((t) => t.date !== selectedDate);
        setTasks([...others, ...packDay(day, selectedDate, peakStart)]);
        pushChange('Task added', `${newTask.title} (${formatDuration(duration)})`);
        notes.push(`Added “${newTask.title}”.`);
        continue;
      }
      if (action.type === 'move_task') {
        const match = findTaskByTitle(action.taskTitle);
        if (!match) {
          notes.push(`Couldn’t find a task matching “${action.taskTitle}”.`);
          continue;
        }
        const nextDate = action.date || selectedDate;
        const nextStart = action.start || peakStart;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === match.id
              ? {
                  ...t,
                  date: nextDate,
                  start: nextStart,
                  end: addMinutesToTime(nextStart, t.durationMinutes),
                  syncDirty: true,
                }
              : t
          )
        );
        pushChange(
          'Task moved',
          `${match.title} → ${nextDate} ${nextStart}`
        );
        notes.push(`Moved “${match.title}” to ${nextDate} at ${nextStart}.`);
        continue;
      }
      if (action.type === 'set_priority') {
        const match = findTaskByTitle(action.taskTitle);
        if (!match) {
          notes.push(`Couldn’t find a task matching “${action.taskTitle}”.`);
          continue;
        }
        setTasks((prev) =>
          prev.map((t) =>
            t.id === match.id
              ? { ...t, priority: action.priority, syncDirty: true }
              : t
          )
        );
        pushChange('Priority updated', `${match.title} → ${action.priority}`);
        notes.push(`Set “${match.title}” to ${action.priority} priority.`);
        continue;
      }
      if (action.type === 'delete_task') {
        const match = findTaskByTitle(action.taskTitle);
        if (!match) {
          notes.push(`Couldn’t find a task matching “${action.taskTitle}”.`);
          continue;
        }
        setTasks((prev) => prev.filter((t) => t.id !== match.id));
        pushChange('Task removed', match.title);
        notes.push(`Removed “${match.title}”.`);
      }
    }

    if (changes.length) setLastCoachChanges(changes);
    return notes;
  };

  const buildCoachContext = () => {
    const nearby = tasks
      .filter((t) => {
        const diff =
          Math.abs(
            new Date(t.date).getTime() - new Date(selectedDate).getTime()
          ) /
          (1000 * 60 * 60 * 24);
        return diff <= 2;
      })
      .slice(0, 40)
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        start: t.start,
        end: t.end,
        durationMinutes: t.durationMinutes,
        category: t.category,
        priority: t.priority,
      }));

    return {
      selectedDate,
      chronotype,
      peakStart,
      sleep,
      capacity: capacitySummary,
      tasks: nearby,
      recentMessages: coachMessages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      })),
    };
  };

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      signUp: async ({ email, password, name }) => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();
        if (!trimmedName) {
          return 'Enter your name to create an account';
        }
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          return 'Enter a valid email address';
        }
        if (!password || password.length < 4) {
          return 'Password needs at least 4 characters';
        }

        if (isCloudAuthConfigured()) {
          try {
            const session = await cloudRegister({
              email: trimmedEmail,
              password,
              name: trimmedName,
            });
            setCloudUid(session.user.uid);
            const fresh = emptyWorkspace(DEFAULT_CATEGORIES, []);
            applyWorkspace(fresh);
            setUser({
              id: session.user.uid,
              name: session.user.name,
              email: session.user.email,
              isGuest: false,
              lifestyle: null,
            });
            saveSession({
              email: session.user.email,
              isGuest: false,
              name: session.user.name,
              uid: session.user.uid,
              authToken: session.token,
            });
            saveWorkspace(session.user.uid, fresh);
            void cloudSaveWorkspace(session.token, fresh).catch(() => undefined);
            // Mirror locally so offline sign-in still works on this device
            if (!findAccount(trimmedEmail, loadAccounts())) {
              setAccounts((prev) => [
                ...prev,
                {
                  email: trimmedEmail,
                  password,
                  name: trimmedName,
                  lifestyle: null,
                },
              ]);
            }
            return null;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Sign up failed';
            if (isHostedWebApp()) {
              return `${message} — deploy backend: npx firebase-tools deploy --only functions`;
            }
            if (
              !/Failed to fetch|NetworkError|Network request failed|UNAVAILABLE|ECONNREFUSED/i.test(
                message
              )
            ) {
              return message;
            }
          }
        }

        if (isHostedWebApp()) {
          return 'Sign up requires the Kairos cloud backend on this URL.';
        }

        if (findAccount(trimmedEmail, accounts)) {
          return 'An account with this email already exists — sign in instead';
        }
        const nextAccount: StoredAccount = {
          email: trimmedEmail,
          password,
          name: trimmedName,
          lifestyle: null,
        };
        setAccounts((prev) => [...prev, nextAccount]);
        const fresh = emptyWorkspace(DEFAULT_CATEGORIES, []);
        applyWorkspace(fresh);
        setUser({
          id: `u-${trimmedEmail}`,
          name: trimmedName,
          email: trimmedEmail,
          isGuest: false,
          lifestyle: null,
        });
        saveSession({
          email: trimmedEmail,
          isGuest: false,
          name: trimmedName,
        });
        saveWorkspace(workspaceKeyForUser({ email: trimmedEmail }), fresh);
        return null;
      },
      signIn: async ({ email, password }) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          return 'Enter a valid email address';
        }
        if (!password) {
          return 'Enter your password';
        }

        if (isCloudAuthConfigured()) {
          try {
            const session = await cloudLogin({
              email: trimmedEmail,
              password,
            });
            setCloudUid(session.user.uid);
            let ws: UserWorkspace | null = null;
            try {
              ws = await cloudFetchWorkspace(session.token);
            } catch {
              ws = null;
            }
            if (!ws) {
              ws =
                loadWorkspace(session.user.uid) ||
                loadWorkspace(session.user.email) ||
                emptyWorkspace(DEFAULT_CATEGORIES, []);
            }
            if (session.user.lifestyle && !ws.onboarded) {
              ws.onboarded = true;
            }
            applyWorkspace(ws);
            setUser({
              id: session.user.uid,
              name: session.user.name,
              email: session.user.email,
              isGuest: false,
              lifestyle: (session.user.lifestyle as Lifestyle | null) ?? null,
            });
            saveSession({
              email: session.user.email,
              isGuest: false,
              name: session.user.name,
              uid: session.user.uid,
              authToken: session.token,
            });
            saveWorkspace(session.user.uid, ws);
            // Keep a local mirror for this browser
            setAccounts((prev) => {
              const existing = findAccount(trimmedEmail, prev);
              if (existing) {
                return prev.map((a) =>
                  a.email === trimmedEmail
                    ? {
                        ...a,
                        password,
                        name: session.user.name,
                        lifestyle:
                          (session.user.lifestyle as Lifestyle | null) ??
                          a.lifestyle,
                      }
                    : a
                );
              }
              return [
                ...prev,
                {
                  email: trimmedEmail,
                  password,
                  name: session.user.name,
                  lifestyle:
                    (session.user.lifestyle as Lifestyle | null) ?? null,
                },
              ];
            });
            return null;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Sign in failed';
            if (isHostedWebApp()) {
              return `${message} — deploy backend: npx firebase-tools deploy --only functions`;
            }
            if (
              !/Failed to fetch|NetworkError|Network request failed|UNAVAILABLE|ECONNREFUSED/i.test(
                message
              )
            ) {
              return message;
            }
          }
        }

        if (isHostedWebApp()) {
          return 'Sign in requires the Kairos cloud backend on this URL.';
        }

        const account = findAccount(trimmedEmail, accounts);
        if (!account) {
          return 'No account found for this email — create one or continue as guest';
        }
        if (account.password !== password) {
          return 'Incorrect password';
        }
        const key = workspaceKeyForUser({ email: account.email });
        const stored = loadWorkspace(key);
        const ws = stored || emptyWorkspace(DEFAULT_CATEGORIES, []);
        if (!stored && account.lifestyle) {
          ws.onboarded = true;
        }
        applyWorkspace(ws);
        setUser({
          id: `u-${account.email}`,
          name: account.name,
          email: account.email,
          isGuest: false,
          lifestyle: account.lifestyle,
        });
        saveSession({
          email: account.email,
          isGuest: false,
          name: account.name,
        });
        saveWorkspace(key, ws);
        return null;
      },
      signInAsGuest: () => {
        saveCloudAuthSession(null);
        const key = workspaceKeyForUser({ email: 'guest@kairos.app', isGuest: true });
        const stored = loadWorkspace(key);
        const ws = stored || emptyWorkspace(DEFAULT_CATEGORIES, initialTasks);
        applyWorkspace(ws);
        setUser({
          id: `guest-local`,
          name: 'Guest',
          email: 'guest@kairos.app',
          isGuest: true,
          lifestyle: null,
        });
        saveSession({
          email: 'guest@kairos.app',
          isGuest: true,
          name: 'Guest',
        });
      },
      updateProfile: (patch) => {
        setUser((prev) => {
          if (!prev) return prev;
          const next: UserProfile = {
            ...prev,
            name: patch.name !== undefined ? patch.name.trim() || prev.name : prev.name,
            email:
              patch.email !== undefined
                ? patch.email.trim().toLowerCase() || prev.email
                : prev.email,
            lifestyle:
              patch.lifestyle !== undefined ? patch.lifestyle : prev.lifestyle,
          };
          if (!prev.isGuest) {
            setAccounts((list) =>
              list.map((account) =>
                account.email === prev.email
                  ? {
                      ...account,
                      name: next.name,
                      email: next.email,
                      lifestyle: next.lifestyle,
                    }
                  : account
              )
            );
          }
          const cloud = loadCloudAuthSession();
          saveSession({
            email: next.email,
            isGuest: next.isGuest,
            name: next.name,
            uid: cloud?.user.uid || (prev.id.startsWith('u-') ? undefined : prev.id),
            authToken: cloud?.token,
          });
          if (cloud?.token && !next.isGuest) {
            void cloudUpdateProfile(cloud.token, {
              name: next.name,
              lifestyle: next.lifestyle,
            }).catch(() => undefined);
          }
          return next;
        });
      },
      signOut: () => {
        if (user) {
          const payload: UserWorkspace = {
            version: 1,
            onboarded,
            chronotype,
            sleep,
            tasks,
            categories,
            calendarConnections,
            updatedAt: new Date().toISOString(),
          };
          saveWorkspace(workspaceKeyForUser(user), payload);
          const cloud = loadCloudAuthSession();
          if (cloud?.token && !user.isGuest) {
            void cloudSaveWorkspace(cloud.token, payload).catch(() => undefined);
          }
        }
        void cloudLogout();
        saveSession(null);
        setUser(null);
        resetWorkspaceMemory();
      },
      onboarded,
      chronotype,
      setChronotype: (valueChronotype) => {
        setChronotypeState(valueChronotype);
        setSleep(chronotypeDefaults(valueChronotype).sleep);
      },
      sleep,
      setSleep,
      completeOnboarding: () => setOnboarded(true),
      selectedDate,
      setSelectedDate,
      categories,
      getCategory,
      addCategory: ({ label, color }) => {
        const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const next: CategoryDef = {
          id,
          label: label.trim().toUpperCase() || 'CUSTOM',
          color,
          soft: softFromColor(color),
          builtIn: false,
        };
        setCategories((prev) => [...prev, next]);
        return next;
      },
      updateCategory: (id, patch) => {
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== id) return cat;
            const color = patch.color ?? cat.color;
            const label = patch.label !== undefined
              ? patch.label.trim().toUpperCase() || cat.label
              : cat.label;
            return {
              ...cat,
              label,
              color,
              soft: softFromColor(color),
            };
          })
        );
      },
      deleteCategory: (id) => {
        setCategories((prev) => {
          if (prev.length <= 1) return prev;
          const target = prev.find((c) => c.id === id);
          if (!target || target.builtIn) return prev;
          const remaining = prev.filter((c) => c.id !== id);
          const fallbackId = remaining[0]?.id || 'life';
          setTasks((tasksPrev) =>
            tasksPrev.map((task) =>
              task.category === id ? { ...task, category: fallbackId } : task
            )
          );
          return remaining;
        });
      },
      tasks,
      tasksForSelectedDate,
      addTask: ({ title, date = selectedDate, durationMinutes, category, priority = 'medium', start }) => {
        setTasks((prev) => {
          const dayCount = prev.filter((t) => t.date === date).length;
          const startTime = start || (dayCount === 0 ? peakStart : '15:00');
          return [
            ...prev,
            {
              id: `t-${Date.now()}`,
              title,
              date,
              start: startTime,
              end: addMinutesToTime(startTime, durationMinutes),
              durationMinutes,
              category,
              priority,
              icon: iconForCategory(category),
              order: dayCount,
            },
          ];
        });
      },
      addDraftTasks: (drafts, date = selectedDate) => {
        setTasks((prev) => {
          const dayCount = prev.filter((t) => t.date === date).length;
          let cursor = timeToMinutes(peakStart);
          const mapped = drafts.map((draft, index) => {
            const start = draft.preferredStart || minutesToTime(cursor);
            const task: Task = {
              id: `d-${Date.now()}-${index}`,
              title: draft.title,
              date,
              start,
              end: addMinutesToTime(start, draft.durationMinutes),
              durationMinutes: draft.durationMinutes,
              category: draft.category,
              priority: draft.priority,
              icon: iconForCategory(draft.category),
              order: dayCount + index,
            };
            cursor = timeToMinutes(task.end) + 10;
            return task;
          });
          return [...prev, ...mapped];
        });
      },
      importCalendarEvents: (events) => {
        let summary = { imported: 0, skipped: 0 };
        setTasks((prev) => {
          const next = [...prev];
          const existingKeys = new Set(
            prev.map((task) => `${task.date}|${task.start}|${task.title.toLowerCase()}`)
          );
          const orderByDate: Record<string, number> = {};
          prev.forEach((task) => {
            orderByDate[task.date] = Math.max(orderByDate[task.date] ?? -1, task.order);
          });

          let imported = 0;
          let skipped = 0;
          events.forEach((event, index) => {
            const key = `${event.date}|${event.start}|${event.title.toLowerCase()}`;
            if (existingKeys.has(key)) {
              skipped += 1;
              return;
            }
            existingKeys.add(key);
            const order = (orderByDate[event.date] ?? -1) + 1;
            orderByDate[event.date] = order;
            next.push({
              id: `ics-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
              title: event.title,
              date: event.date,
              start: event.start,
              end: event.end || addMinutesToTime(event.start, event.durationMinutes),
              durationMinutes: event.durationMinutes,
              category: event.category,
              priority: event.priority,
              icon: iconForCategory(event.category),
              order,
              provider: 'ics',
              externalId: event.uid,
              syncDirty: false,
            });
            imported += 1;
          });
          summary = { imported, skipped };
          return next;
        });
        return summary;
      },
      updateTask: (id, patch) => {
        setTasks((prev) =>
          prev.map((task) => {
            if (task.id !== id) return task;
            const next = { ...task, ...patch };
            if (patch.start || patch.durationMinutes) {
              next.end = addMinutesToTime(next.start, next.durationMinutes);
            }
            if (patch.category) {
              next.icon = iconForCategory(patch.category);
            }
            if (
              patch.syncDirty === undefined &&
              (patch.title ||
                patch.start ||
                patch.end ||
                patch.date ||
                patch.durationMinutes ||
                patch.priority ||
                patch.category)
            ) {
              next.syncDirty = true;
            }
            return next;
          })
        );
      },
      deleteTask: (id) => setTasks((prev) => prev.filter((task) => task.id !== id)),
      reorderTask: (id, direction) => {
        setTasks((prev) => {
          const day = prev
            .filter((t) => t.date === selectedDate)
            .sort((a, b) => a.order - b.order);
          const others = prev.filter((t) => t.date !== selectedDate);
          const index = day.findIndex((t) => t.id === id);
          if (index < 0) return prev;
          const target = direction === 'up' ? index - 1 : index + 1;
          if (target < 0 || target >= day.length) return prev;
          const copy = [...day];
          const tmp = copy[index];
          copy[index] = copy[target];
          copy[target] = tmp;
          return [...others, ...packDay(copy, selectedDate, copy[0]?.start || peakStart)];
        });
      },
      moveTaskDate: (id, date) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? {
                  ...task,
                  date,
                  order: prev.filter((t) => t.date === date).length,
                }
              : task
          )
        );
      },
      optimizeSchedule,
      calendarConnections,
      setCalendarConnection: (provider, connection) => {
        setCalendarConnections((prev) => ({
          ...prev,
          [provider]: connection,
        }));
      },
      pullCalendar: async (provider, daysAhead = 14) => {
        const connection = calendarConnections[provider];
        if (!connection?.connected) {
          throw new Error('Connect this calendar first.');
        }
        const rangeStart = new Date();
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

        let result;
        if (provider === 'google') {
          result = await pullGoogleEvents(connection, rangeStart, rangeEnd);
        } else if (provider === 'microsoft') {
          result = await pullMicrosoftEvents(connection, rangeStart, rangeEnd);
        } else {
          result = await pullDeviceEvents(connection, rangeStart, rangeEnd);
        }

        const pulled = upsertRemoteEvents(provider, result.events);
        setCalendarConnections((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            lastPulledAt: new Date().toISOString(),
          },
        }));
        return {
          pulled,
          message: `Imported ${pulled} event${pulled === 1 ? '' : 's'} from ${provider}.`,
        };
      },
      pushCalendar: async (provider) => {
        const connection = calendarConnections[provider];
        if (!connection?.connected) {
          throw new Error('Connect this calendar first.');
        }
        // Prefer pushing dirty tasks + local-only tasks for this provider window
        const toPush: SyncTaskPatch[] = tasks
          .filter(
            (task) =>
              task.syncDirty ||
              !task.externalId ||
              (task.provider === provider && task.syncDirty)
          )
          .map((task) => ({
            id: task.id,
            title: task.title,
            date: task.date,
            start: task.start,
            end: task.end,
            durationMinutes: task.durationMinutes,
            category: task.category,
            priority: task.priority,
            externalId: task.externalId,
            externalCalendarId: task.externalCalendarId,
            provider: task.provider as CalendarProviderId | undefined,
            syncDirty: task.syncDirty,
          }));

        // If nothing dirty, push recent local tasks without external ids
        const payload =
          toPush.length > 0
            ? toPush
            : tasks
                .filter((task) => !task.externalId)
                .slice(0, 40)
                .map((task) => ({
                  id: task.id,
                  title: task.title,
                  date: task.date,
                  start: task.start,
                  end: task.end,
                  durationMinutes: task.durationMinutes,
                  category: task.category,
                  priority: task.priority,
                  externalId: task.externalId,
                  externalCalendarId: task.externalCalendarId,
                  provider: task.provider as CalendarProviderId | undefined,
                  syncDirty: task.syncDirty,
                }));

        let result;
        if (provider === 'google') {
          result = await pushGoogleEvents(connection, payload);
        } else if (provider === 'microsoft') {
          result = await pushMicrosoftEvents(connection, payload);
        } else {
          result = await pushDeviceEvents(connection, payload);
        }

        if (result.created + result.updated > 0) {
          setTasks((prev) =>
            prev.map((task) =>
              payload.some((p) => p.id === task.id)
                ? { ...task, syncDirty: false, provider }
                : task
            )
          );
        }
        setCalendarConnections((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            lastPushedAt: new Date().toISOString(),
          },
        }));

        return {
          ...result,
          message: `Exported to ${provider}: ${result.created} created, ${result.updated} updated${
            result.failed ? `, ${result.failed} failed` : ''
          }.`,
        };
      },
      syncCalendar: async (provider) => {
        const pull = await (async () => {
          const connection = calendarConnections[provider];
          if (!connection?.connected) throw new Error('Connect this calendar first.');
          const rangeStart = new Date();
          rangeStart.setHours(0, 0, 0, 0);
          const rangeEnd = new Date(rangeStart);
          rangeEnd.setDate(rangeEnd.getDate() + 14);
          if (provider === 'google') {
            return pullGoogleEvents(connection, rangeStart, rangeEnd);
          }
          if (provider === 'microsoft') {
            return pullMicrosoftEvents(connection, rangeStart, rangeEnd);
          }
          return pullDeviceEvents(connection, rangeStart, rangeEnd);
        })();
        const pulled = upsertRemoteEvents(provider, pull.events);
        // Push after pull using latest tasks snapshot via functional approach
        const connection = calendarConnections[provider];
        const payload: SyncTaskPatch[] = tasks
          .filter((task) => task.syncDirty || !task.externalId)
          .map((task) => ({
            id: task.id,
            title: task.title,
            date: task.date,
            start: task.start,
            end: task.end,
            durationMinutes: task.durationMinutes,
            category: task.category,
            priority: task.priority,
            externalId: task.externalId,
            externalCalendarId: task.externalCalendarId,
            provider: task.provider as CalendarProviderId | undefined,
            syncDirty: task.syncDirty,
          }));
        let pushResult = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
        if (payload.length) {
          if (provider === 'google') {
            pushResult = await pushGoogleEvents(connection, payload);
          } else if (provider === 'microsoft') {
            pushResult = await pushMicrosoftEvents(connection, payload);
          } else {
            pushResult = await pushDeviceEvents(connection, payload);
          }
          if (pushResult.created + pushResult.updated > 0) {
            setTasks((prev) =>
              prev.map((task) =>
                payload.some((p) => p.id === task.id)
                  ? { ...task, syncDirty: false, provider }
                  : task
              )
            );
          }
        }
        const now = new Date().toISOString();
        setCalendarConnections((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            lastPulledAt: now,
            lastPushedAt: now,
          },
        }));
        return {
          message: `Imported ${pulled} and exported ${
            pushResult.created + pushResult.updated
          } for ${provider}.`,
        };
      },
      importGoogleCloud: async (daysAhead = 14) => {
        const result = await importGoogleFromCloud(daysAhead);
        const imported = upsertRemoteEvents('google', result.events);
        setCalendarConnections((prev) => ({
          ...prev,
          google: {
            provider: 'google',
            connected: true,
            accountLabel: result.accountEmail || prev.google.accountLabel,
            calendarId: result.calendarId || prev.google.calendarId || 'primary',
            calendarTitle:
              result.calendarTitle || prev.google.calendarTitle || 'Primary',
            lastPulledAt: new Date().toISOString(),
          },
        }));
        return {
          imported,
          message:
            result.message ||
            `Imported ${imported} event${imported === 1 ? '' : 's'} from Google.`,
        };
      },
      exportGoogleCloud: async () => {
        const payload = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          date: task.date,
          start: task.start,
          end: task.end,
          durationMinutes: task.durationMinutes,
          category: task.category,
          priority: task.priority,
          externalId: task.externalId,
          externalCalendarId: task.externalCalendarId,
          provider: task.provider as CalendarProviderId | undefined,
          syncDirty: task.syncDirty,
        }));
        const result = await exportGoogleToCloud(payload);
        if (result.links?.length) {
          setTasks((prev) =>
            prev.map((task) => {
              const link = result.links.find((l) => l.taskId === task.id);
              if (!link) return task;
              return {
                ...task,
                externalId: link.externalId,
                externalCalendarId: link.calendarId,
                provider: 'google',
                syncDirty: false,
              };
            })
          );
        }
        setCalendarConnections((prev) => ({
          ...prev,
          google: {
            ...prev.google,
            provider: 'google',
            connected: true,
            lastPushedAt: new Date().toISOString(),
          },
        }));
        return {
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          message: result.message,
        };
      },
      coachMessages,
      lastCoachChanges,
      coachBusy,
      sendCoachMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed || coachBusy) return;
        const userId = `u-${Date.now()}`;
        setCoachBusy(true);
        setCoachMessages((prev) => [
          ...prev,
          { id: userId, role: 'user', text: trimmed },
        ]);

        // Exact quick-action prompts can still use the local schedule tools
        const quickActions = new Set([
          'protect peak window',
          'move low priority to tomorrow',
          'insert recovery break',
          'split longest task',
          'clear evening after 5',
          'boost priority of focus task',
        ]);

        try {
          try {
            const result = await cloudCoachChat({
              message: trimmed,
              context: buildCoachContext(),
            });
            applyCoachLlmActions(result.actions || []);
            setCoachMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'ai',
                text: result.reply,
              },
            ]);
            return;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Coach unavailable';

            if (quickActions.has(trimmed.toLowerCase())) {
              const reply = applyCoachAction(trimmed);
              setCoachMessages((prev) => [
                ...prev,
                { id: `a-${Date.now()}`, role: 'ai', text: reply },
              ]);
              return;
            }

            setCoachMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}`,
                role: 'ai',
                text:
                  `I can’t reach the live AI coach yet (${message}). ` +
                  `On your machine run:\n` +
                  `1) npx firebase-tools functions:secrets:set GEMINI_API_KEY\n` +
                  `2) npx firebase-tools deploy --only functions\n` +
                  `Until then, tap an action card above for quick schedule edits.`,
              },
            ]);
          }
        } finally {
          setCoachBusy(false);
        }
      },
      applyCoachAction,
      peakWindowLabel: `${peakStart} peak`,
      capacitySummary,
    }),
    [
      user,
      accounts,
      onboarded,
      chronotype,
      sleep,
      selectedDate,
      categories,
      tasks,
      tasksForSelectedDate,
      calendarConnections,
      coachMessages,
      lastCoachChanges,
      coachBusy,
      capacitySummary,
      peakStart,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
