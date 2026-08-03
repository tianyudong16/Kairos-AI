import React, { createContext, useContext, useMemo, useState } from 'react';

import type { Category } from '@/constants/theme';

export type Chronotype =
  | 'early-bird'
  | 'morning'
  | 'mid-morning'
  | 'night-owl';

export type Task = {
  id: string;
  title: string;
  start: string;
  end: string;
  category: Category;
  icon: 'run' | 'code' | 'people' | 'food' | 'mail' | 'book';
};

export type ParsedTask = {
  id: string;
  title: string;
  duration: string;
  category: Category;
};

type AppContextValue = {
  onboarded: boolean;
  chronotype: Chronotype | null;
  setChronotype: (value: Chronotype) => void;
  completeOnboarding: () => void;
  tasks: Task[];
  addParsedTasks: (parsed: ParsedTask[]) => void;
  coachMessages: { id: string; role: 'ai' | 'user'; text: string }[];
  sendCoachMessage: (text: string) => void;
};

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Morning Cardio',
    start: '9:00',
    end: '9:45',
    category: 'health',
    icon: 'run',
  },
  {
    id: '2',
    title: 'React Architecture',
    start: '10:00',
    end: '11:30',
    category: 'work',
    icon: 'code',
  },
  {
    id: '3',
    title: 'Standup',
    start: '11:30',
    end: '11:45',
    category: 'study',
    icon: 'people',
  },
  {
    id: '4',
    title: 'Lunch',
    start: '12:00',
    end: '12:45',
    category: 'life',
    icon: 'food',
  },
  {
    id: '5',
    title: 'Email Admin',
    start: '13:00',
    end: '13:45',
    category: 'study',
    icon: 'mail',
  },
  {
    id: '6',
    title: 'Calculus',
    start: '14:00',
    end: '15:00',
    category: 'life',
    icon: 'book',
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [onboarded, setOnboarded] = useState(false);
  const [chronotype, setChronotype] = useState<Chronotype | null>('morning');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [coachMessages, setCoachMessages] = useState([
    {
      id: 'c1',
      role: 'ai' as const,
      text: 'You have 9h of high-focus tasks but only 5.5h capacity before 7:30 PM stop.',
    },
    {
      id: 'c2',
      role: 'user' as const,
      text: 'Schedule exam study + workout + 3h coding today.',
    },
    {
      id: 'c3',
      role: 'ai' as const,
      text: 'Splitting exam study 2×90m. Moving coding to tomorrow 9 AM peak window.',
    },
  ]);

  const value = useMemo<AppContextValue>(
    () => ({
      onboarded,
      chronotype,
      setChronotype,
      completeOnboarding: () => setOnboarded(true),
      tasks,
      addParsedTasks: (parsed) => {
        const mapped: Task[] = parsed.map((item, index) => ({
          id: `p-${Date.now()}-${index}`,
          title: item.title,
          start: item.duration.includes(':') ? item.duration : '15:30',
          end: item.duration.includes(':') ? addMinutes(item.duration, 45) : '16:30',
          category: item.category,
          icon:
            item.category === 'health'
              ? 'run'
              : item.category === 'life'
                ? 'food'
                : item.category === 'study'
                  ? 'book'
                  : 'code',
        }));
        setTasks((prev) => [...prev, ...mapped]);
      },
      coachMessages,
      sendCoachMessage: (text) => {
        const userMsg = {
          id: `u-${Date.now()}`,
          role: 'user' as const,
          text,
        };
        const aiMsg = {
          id: `a-${Date.now()}`,
          role: 'ai' as const,
          text: 'Got it. I’ll protect your peak window and reshuffle lower-priority work to later.',
        };
        setCoachMessages((prev) => [...prev, userMsg, aiMsg]);
      },
    }),
    [onboarded, chronotype, tasks, coachMessages]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${nh}:${nm.toString().padStart(2, '0')}`;
}
