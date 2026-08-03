import React, { createContext, useContext, useMemo, useState } from 'react';

import { colors } from '@/constants/theme';
import {
  addDays,
  addMinutesToTime,
  Category,
  CategoryDef,
  chronotypeDefaults,
  Chronotype,
  DraftTask,
  formatDuration,
  iconForCategory,
  minutesToTime,
  parseDuration,
  Priority,
  SleepSchedule,
  softFromColor,
  Task,
  timeToMinutes,
  toDateKey,
} from '@/lib/schedule';

export type { Category, CategoryDef, Chronotype, DraftTask, Priority, SleepSchedule, Task };

type CoachMessage = { id: string; role: 'ai' | 'user'; text: string };
type CoachChange = { id: string; label: string; detail: string };

type AppContextValue = {
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
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (id: string, direction: 'up' | 'down') => void;
  moveTaskDate: (id: string, date: string) => void;
  optimizeSchedule: (date?: string) => string;
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
  const defaults = chronotypeDefaults('morning');
  const [onboarded, setOnboarded] = useState(false);
  const [chronotype, setChronotypeState] = useState<Chronotype | null>('morning');
  const [sleep, setSleep] = useState<SleepSchedule>(defaults.sleep);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [categories, setCategories] = useState<CategoryDef[]>(DEFAULT_CATEGORIES);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    {
      id: 'c1',
      role: 'ai',
      text: 'I can reshape your day with concrete actions — protect peak hours, move overflow, insert breaks, split long blocks, or tune sleep. Tap an action card below.',
    },
  ]);
  const [lastCoachChanges, setLastCoachChanges] = useState<CoachChange[]>([]);

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

    if (/bedtime|sleep|wake/.test(text)) {
      const next = { ...sleep };
      if (text.includes('11')) next.bedtime = '23:00';
      if (text.includes('10') && /bed/.test(text)) next.bedtime = '22:00';
      if (text.includes('12')) next.bedtime = '0:00';
      if (/wake early|wake 6/.test(text)) next.wakeTime = '6:00';
      if (/wake 7/.test(text)) next.wakeTime = '7:00';
      if (/wake 8/.test(text)) next.wakeTime = '8:00';
      setSleep(next);
      pushChange('Sleep updated', `Wake ${next.wakeTime} · Bed ${next.bedtime}`);
      setLastCoachChanges(changes);
      return `Updated sleep to wake ${next.wakeTime} / bedtime ${next.bedtime}.`;
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
      onboarded,
      chronotype,
      sleep,
      selectedDate,
      categories,
      tasks,
      tasksForSelectedDate,
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
