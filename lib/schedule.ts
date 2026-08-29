export type Category = string;

export type Priority = 'high' | 'medium' | 'low';

export type Chronotype =
  | 'early-bird'
  | 'morning'
  | 'mid-morning'
  | 'night-owl';

export type TaskIcon = 'run' | 'code' | 'people' | 'food' | 'mail' | 'book';

export type CategoryDef = {
  id: string;
  label: string;
  color: string;
  soft: string;
  builtIn?: boolean;
};

export type CalendarProvider = 'google' | 'microsoft' | 'device' | 'ics';

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
  /** Remote event id when synced from/to an external calendar */
  externalId?: string;
  externalCalendarId?: string;
  provider?: CalendarProvider;
  /** Local edits waiting to be pushed */
  syncDirty?: boolean;
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

/** Overnight-aware minutes from bedtime → wake. */
export function sleepDurationMinutes(sleep: SleepSchedule) {
  const wake = timeToMinutes(sleep.wakeTime);
  let bed = timeToMinutes(sleep.bedtime);
  if (bed > wake) bed -= 24 * 60;
  return wake - bed;
}

export function sleepDurationHours(sleep: SleepSchedule) {
  return Math.round((sleepDurationMinutes(sleep) / 60) * 10) / 10;
}

/**
 * Set a target sleep need in hours.
 * Default: keep wake fixed, move bedtime earlier/later.
 */
export function applySleepNeedHours(
  sleep: SleepSchedule,
  hours: number,
  anchor: 'wake' | 'bed' = 'wake'
): SleepSchedule {
  const clamped = Math.min(12, Math.max(4, hours));
  const needMinutes = Math.round(clamped * 60);
  if (anchor === 'bed') {
    return {
      bedtime: sleep.bedtime,
      wakeTime: minutesToTime(timeToMinutes(sleep.bedtime) + needMinutes),
    };
  }
  return {
    wakeTime: sleep.wakeTime,
    bedtime: minutesToTime(timeToMinutes(sleep.wakeTime) - needMinutes),
  };
}

/** Apply a coach/API set_sleep action — explicit times win over needHours. */
export function resolveCoachSleepSchedule(
  current: SleepSchedule,
  action: {
    bedtime?: string;
    wakeTime?: string;
    needHours?: number;
    keep?: 'bed' | 'wake';
  }
): SleepSchedule {
  const bed = action.bedtime
    ? normalizeTimeInput(action.bedtime) ?? action.bedtime.trim()
    : undefined;
  const wake = action.wakeTime
    ? normalizeTimeInput(action.wakeTime) ?? action.wakeTime.trim()
    : undefined;

  if (bed || wake) {
    return {
      bedtime: bed ?? current.bedtime,
      wakeTime: wake ?? current.wakeTime,
    };
  }

  if (typeof action.needHours === 'number' && action.needHours > 0) {
    const anchor = action.keep === 'bed' ? 'bed' : 'wake';
    return applySleepNeedHours(current, action.needHours, anchor);
  }

  return current;
}

/** Parse “need 8h”, “only 8 hours of sleep”, “sleep 8h”. */
export function parseSleepNeedHours(text: string): number | null {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:only\s+)?(?:need(?:s)?|want(?:s)?|require(?:s)?)\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/,
    /(?:sleep(?:\s*time)?|rest|sleeptime)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/,
    /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s+(?:of\s+)?(?:sleep|rest)\b/,
    /(?:sleep(?:\s*time)?|sleeptime)\s+(?:to\s+)?(?:only\s+)?(?:need(?:s)?\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/,
  ];
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const hours = parseFloat(match[1]);
    if (!Number.isNaN(hours) && hours >= 4 && hours <= 12) return hours;
  }
  return null;
}

/** Mix a hex color toward white for soft backgrounds */
export function softFromColor(hex: string, amount = 0.82): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '#F3F0E8';
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export const CATEGORY_COLOR_PRESETS = [
  '#5B4FE8',
  '#1F7FBF',
  '#2F9A5B',
  '#D97706',
  '#E11D48',
  '#0F766E',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#EA580C',
  '#4F46E5',
];


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

export function isToday(key: string) {
  return key === toDateKey(new Date());
}

export function formatShortDate(key: string) {
  const date = parseDateKey(key);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
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
  if (category === 'work') return 'code';
  return 'book';
}

export function chronotypeDefaults(chronotype: Chronotype): {
  sleep: SleepSchedule;
  peakStart: string;
} {
  switch (chronotype) {
    case 'early-bird':
      return { sleep: { bedtime: '21:30', wakeTime: '5:30' }, peakStart: '6:00' }; // 8h
    case 'night-owl':
      return { sleep: { bedtime: '2:00', wakeTime: '10:00' }, peakStart: '11:00' }; // 8h
    case 'mid-morning':
      return { sleep: { bedtime: '0:00', wakeTime: '8:00' }, peakStart: '9:00' }; // 8h
    case 'morning':
    default:
      return { sleep: { bedtime: '23:00', wakeTime: '7:00' }, peakStart: '9:00' }; // 8h
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
