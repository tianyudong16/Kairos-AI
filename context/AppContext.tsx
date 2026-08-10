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
import { ImportedCalendarEvent } from '@/lib/ics';
import {
  addDays,
  addMinutesToTime,
  applySleepNeedHours,
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
  }) => string | null;
  signIn: (input: { email: string; password: string }) => string | null;
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
  coachMessages: CoachMessage[];
  lastCoachChanges: CoachChange[];
  sendCoachMessage: (text: string) => void;
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

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    saveConnections(calendarConnections);
  }, [calendarConnections]);

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
      text: 'I can reshape your day with concrete actions — protect peak hours, move overflow, insert breaks, split long blocks, or tune sleep. Tap an action card below.',
    },
  ]);
  const [lastCoachChanges, setLastCoachChanges] = useState<CoachChange[]>([]);

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

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      signUp: ({ email, password, name }) => {
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
        setUser({
          id: `u-${Date.now()}`,
          name: trimmedName,
          email: trimmedEmail,
          isGuest: false,
          lifestyle: null,
        });
        setOnboarded(false);
        return null;
      },
      signIn: ({ email, password }) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          return 'Enter a valid email address';
        }
        if (!password) {
          return 'Enter your password';
        }
        const account = findAccount(trimmedEmail, accounts);
        if (!account) {
          return 'No account found for this email — create one or continue as guest';
        }
        if (account.password !== password) {
          return 'Incorrect password';
        }
        setUser({
          id: `u-${account.email}`,
          name: account.name,
          email: account.email,
          isGuest: false,
          lifestyle: account.lifestyle,
        });
        return null;
      },
      signInAsGuest: () => {
        setUser({
          id: `guest-${Date.now()}`,
          name: 'Guest',
          email: 'guest@kairos.app',
          isGuest: true,
          lifestyle: null,
        });
        setOnboarded(false);
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
          return next;
        });
      },
      signOut: () => {
        setUser(null);
        setOnboarded(false);
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
          message: `Pulled ${pulled} event${pulled === 1 ? '' : 's'} from ${provider}.`,
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
          message: `Pushed to ${provider}: ${result.created} created, ${result.updated} updated${
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
          message: `Synced ${provider}: pulled ${pulled}, pushed ${
            pushResult.created + pushResult.updated
          }.`,
        };
      },
      coachMessages,
      lastCoachChanges,
      sendCoachMessage: (text) => {
        const reply = applyCoachAction(text);
        setCoachMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', text },
          { id: `a-${Date.now()}`, role: 'ai', text: reply },
        ]);
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
