import React, { createContext, useContext, useMemo, useState } from 'react';

import { colors } from '@/constants/theme';
import { analyzeDay, DayAnalysis, packDay, runCoach } from '@/lib/coach';
import {
  addDays,
  addMinutesToTime,
  Category,
  CategoryDef,
  chronotypeDefaults,
  Chronotype,
  DraftTask,
  iconForCategory,
  minutesToTime,
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
  dayAnalysis: DayAnalysis;
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
      text: 'I’m your schedule co-pilot. Tap an action or ask me to review the day, protect peak hours, move overflow, insert breaks, split long blocks, batch admin, or add tasks — I’ll change the calendar and show what moved.',
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

  const coachCtx = useMemo(
    () => ({
      tasks,
      selectedDate,
      sleep,
      peakStart,
      chronotype,
      categories,
    }),
    [tasks, selectedDate, sleep, peakStart, chronotype, categories]
  );

  const dayAnalysis = useMemo(() => analyzeDay(coachCtx), [coachCtx]);

  const capacitySummary = useMemo(() => {
    const capacityHours = Math.round((dayAnalysis.capacityMinutes / 60) * 10) / 10;
    const focusHours =
      Math.round(
        (tasksForSelectedDate
          .filter((t) => t.priority === 'high' || t.category === 'work' || t.category === 'study')
          .reduce((sum, t) => sum + t.durationMinutes, 0) /
          60) *
          10
      ) / 10;
    return {
      focusHours,
      capacityHours,
      overflowHours: Math.max(0, Math.round((dayAnalysis.overflowMinutes / 60) * 10) / 10),
    };
  }, [dayAnalysis, tasksForSelectedDate]);

  const optimizeSchedule = (date = selectedDate) => {
    const result = runCoach('optimize my day', {
      tasks,
      selectedDate: date,
      sleep,
      peakStart,
      chronotype,
      categories,
    });
    if (result.tasks) setTasks(result.tasks);
    if (result.sleep) setSleep(result.sleep);
    setLastCoachChanges(result.changes);
    return result.reply;
  };

  const applyCoachAction = (raw: string) => {
    const result = runCoach(raw, {
      tasks,
      selectedDate,
      sleep,
      peakStart,
      chronotype,
      categories,
    });
    if (result.tasks) setTasks(result.tasks);
    if (result.sleep) setSleep(result.sleep);
    setLastCoachChanges(result.changes);
    return result.reply;
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
          return [...others, ...packDay(copy, selectedDate, copy[0]?.start || peakStart, sleep)];
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
      dayAnalysis,
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
      dayAnalysis,
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
