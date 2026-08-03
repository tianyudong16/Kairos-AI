export type Category = 'work' | 'study' | 'health' | 'life';

export type Priority = 'high' | 'medium' | 'low';

export type Chronotype =
  | 'early-bird'
  | 'morning'
  | 'mid-morning'
  | 'night-owl';

export type TaskIcon = 'run' | 'code' | 'people' | 'food' | 'mail' | 'book';

export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // H:MM or HH:MM
  end: string;
  durationMinutes: number;
  category: Category;
  priority: Priority;
  icon: TaskIcon;
  order: number;
};

export type DraftTask = {
  id: string;
  title: string;
  durationMinutes: number;
  category: Category;
  priority: Priority;
  preferredStart?: string;
};

export type SleepSchedule = {
  bedtime: string;
  wakeTime: string;
};

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDisplayDate(key: string) {
  const date = parseDateKey(key);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number) {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h}:${`${m}`.padStart(2, '0')}`;
}

/** Accepts 7:30, 07:30, 7:30am, 11pm, 23:00 → H:MM */
export function normalizeTimeInput(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return null;

  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return `${hour}:${`${minute}`.padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function parseDuration(text: string) {
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+)\s*m/);
  let minutes = 0;
  if (hourMatch) minutes += Math.round(parseFloat(hourMatch[1]) * 60);
  if (minMatch) minutes += parseInt(minMatch[1], 10);
  return minutes || 60;
}

export function iconForCategory(category: Category): TaskIcon {
  if (category === 'health') return 'run';
  if (category === 'life') return 'food';
  if (category === 'study') return 'book';
  return 'code';
}

export function chronotypeDefaults(chronotype: Chronotype): {
  sleep: SleepSchedule;
  peakStart: string;
} {
  switch (chronotype) {
    case 'early-bird':
      return { sleep: { bedtime: '21:30', wakeTime: '5:30' }, peakStart: '6:00' };
    case 'night-owl':
      return { sleep: { bedtime: '1:00', wakeTime: '10:00' }, peakStart: '11:00' };
    case 'mid-morning':
      return { sleep: { bedtime: '23:30', wakeTime: '8:00' }, peakStart: '9:00' };
    case 'morning':
    default:
      return { sleep: { bedtime: '22:30', wakeTime: '7:00' }, peakStart: '9:00' };
  }
}

export function startOfWeek(key: string) {
  const date = parseDateKey(key);
  const day = date.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

export function getMonthMatrix(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(first);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toDateKey(start));
      start.setDate(start.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
