import { addMinutesToTime, timeToMinutes, toDateKey } from '@/lib/schedule';
import { RemoteEvent } from '@/lib/calendar-sync/types';

export function toIsoLocal(dateKey: string, time: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const date = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh || 0)}:${pad(mm || 0)}:00${sign}${offH}:${offM}`;
}

export function fromJsDate(start: Date, end: Date, allDay = false): Omit<RemoteEvent, 'id' | 'calendarId' | 'title'> {
  const date = toDateKey(start);
  if (allDay) {
    return {
      date,
      start: '9:00',
      end: '17:00',
      durationMinutes: 480,
      allDay: true,
    };
  }
  const startStr = `${start.getHours()}:${`${start.getMinutes()}`.padStart(2, '0')}`;
  let durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (durationMinutes <= 0) durationMinutes = 30;
  return {
    date,
    start: startStr,
    end: addMinutesToTime(startStr, durationMinutes),
    durationMinutes,
    allDay: false,
  };
}

export function parseGoogleDateTime(event: {
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}) {
  const allDay = Boolean(event.start?.date && !event.start?.dateTime);
  const start = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
      ? new Date(`${event.start.date}T09:00:00`)
      : new Date();
  const end = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
      ? new Date(`${event.end.date}T17:00:00`)
      : new Date(start.getTime() + 30 * 60000);
  return { start, end, allDay };
}

export function ensureEnd(start: string, end: string, durationMinutes: number) {
  if (end && timeToMinutes(end) > timeToMinutes(start)) return end;
  return addMinutesToTime(start, durationMinutes || 30);
}
