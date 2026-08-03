import React, { createContext, useContext, useMemo, useState } from 'react';

import type { Category } from '@/constants/theme';
import {
  addDays,
  addMinutesToTime,
  chronotypeDefaults,
  Chronotype,
  DraftTask,
  formatDuration,
  iconForCategory,
  minutesToTime,
  parseDuration,
  Priority,
  SleepSchedule,
  Task,
  timeToMinutes,
  toDateKey,
} from '@/lib/schedule';

export type { Chronotype, DraftTask, Priority, SleepSchedule, Task };

type CoachMessage = { id: string; role: 'ai' | 'user'; text: string };

type AppContextValue = {
  onboarded: boolean;
  chronotype: Chronotype | null;
  setChronotype: (value: Chronotype) => void;
  sleep: SleepSchedule;
  setSleep: (value: SleepSchedule) => void;
  completeOnboarding: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
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
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (id: string, direction: 'up' | 'down') => void;
  moveTaskDate: (id: string, date: string) => void;
  optimizeSchedule: (date?: string) => string;
  coachMessages: CoachMessage[];
  sendCoachMessage: (text: string) => void;
  applyCoachAction: (action: string) => string;
  peakWindowLabel: string;
  capacitySummary: { focusHours: number; capacityHours: number; overflowHours: number };
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
  const defaults = chronotypeDefaults('morning');
  const [onboarded, setOnboarded] = useState(false);
  const [chronotype, setChronotypeState] = useState<Chronotype | null>('morning');
  const [sleep, setSleep] = useState<SleepSchedule>(defaults.sleep);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    {
      id: 'c1',
      role: 'ai',
      text: 'I can reshuffle your day around sleep, priorities, and peak focus. Try “protect peak”, “move low priority tomorrow”, or “set bedtime 11pm”.',
    },
  ]);

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

    if (/bedtime|sleep|wake/.test(text)) {
      const bedMatch = text.match(/bedtime\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      const wakeMatch = text.match(/wake\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      const next = { ...sleep };
      if (bedMatch) next.bedtime = normalizeSpokenTime(bedMatch);
      if (wakeMatch) next.wakeTime = normalizeSpokenTime(wakeMatch);
      if (!bedMatch && /bedtime|sleep/.test(text)) {
        if (text.includes('11')) next.bedtime = '23:00';
        if (text.includes('10')) next.bedtime = '22:00';
        if (text.includes('12')) next.bedtime = '0:00';
      }
      setSleep(next);
      return `Updated sleep schedule to wake ${next.wakeTime} / bedtime ${next.bedtime}. I can re-pack your day around this.`;
    }

    if (/protect peak|peak window|deep work/.test(text)) {
      setTasks((prev) => {
        const day = prev.filter((t) => t.date === selectedDate);
        const others = prev.filter((t) => t.date !== selectedDate);
        const high = day.filter((t) => t.priority === 'high' || t.category === 'work');
        const rest = day.filter((t) => !(t.priority === 'high' || t.category === 'work'));
        return [...others, ...packDay([...high, ...rest], selectedDate, peakStart)];
      });
      return `Protected your peak window starting ${peakStart}. High-priority/work blocks are scheduled first.`;
    }

    if (/low priority|tomorrow|overflow|too much/.test(text)) {
      const summary = optimizeSchedule(selectedDate);
      return summary;
    }

    if (/prioritize|priority|focus on work/.test(text)) {
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
      const start = peakStart;
      const newTask: Task = {
        id: `t-${Date.now()}`,
        title: title.slice(0, 48),
        date: selectedDate,
        start,
        end: addMinutesToTime(start, duration),
        durationMinutes: duration,
        category,
        priority: 'medium',
        icon: iconForCategory(category),
        order: tasksForSelectedDate.length,
      };
      setTasks((prev) => [...prev, newTask]);
      optimizeSchedule(selectedDate);
      return `Added “${newTask.title}” (${formatDuration(duration)}) and fitted it into ${selectedDate}.`;
    }

    const summary = optimizeSchedule(selectedDate);
    return `${summary} Tip: ask me to set bedtime, protect peak, prioritize work, or move low-priority tasks.`;
  };

  const value = useMemo<AppContextValue>(
    () => ({
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
      updateTask: (id, patch) => {
        setTasks((prev) =>
          prev.map((task) => {
            if (task.id !== id) return task;
            const next = { ...task, ...patch };
            if (patch.start || patch.durationMinutes) {
              next.end = addMinutesToTime(next.start, next.durationMinutes);
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
      coachMessages,
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
      onboarded,
      chronotype,
      sleep,
      selectedDate,
      tasks,
      tasksForSelectedDate,
      coachMessages,
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

function normalizeSpokenTime(match: RegExpMatchArray) {
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return `${hour}:${`${minute}`.padStart(2, '0')}`;
}
