import { Category, Priority, toDateKey } from '@/lib/schedule';

export type ImportedCalendarEvent = {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // H:MM
  end: string;
  durationMinutes: number;
  location?: string;
  description?: string;
  allDay: boolean;
  category: Category;
  priority: Priority;
};

/** Unfold ICS content lines per RFC 5545. */
export function unfoldIcs(raw: string) {
  return raw.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function splitProperty(line: string): { name: string; params: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(';');
  if (semi < 0) {
    return { name: left.toUpperCase(), params: '', value };
  }
  return {
    name: left.slice(0, semi).toUpperCase(),
    params: left.slice(semi + 1),
    value,
  };
}

function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function formatLocalTime(date: Date) {
  return `${date.getHours()}:${pad2(date.getMinutes())}`;
}

function formatLocalDateKey(date: Date) {
  return toDateKey(date);
}

/** Parse ICS date/time values into a local Date. */
export function parseIcsDateTime(value: string, params = ''): { date: Date; allDay: boolean } | null {
  const cleaned = value.trim();
  const isDateOnly =
    /VALUE=DATE/i.test(params) || /^\d{8}$/.test(cleaned);
  const match = cleaned.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (isDateOnly || !match[4]) {
    return { date: new Date(year, month, day, 0, 0, 0, 0), allDay: true };
  }

  const hour = Number(match[4]);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  if (match[7] === 'Z') {
    return {
      date: new Date(Date.UTC(year, month, day, hour, minute, second)),
      allDay: false,
    };
  }
  return {
    date: new Date(year, month, day, hour, minute, second),
    allDay: false,
  };
}

function guessCategory(title: string, description = ''): Category {
  const text = `${title} ${description}`.toLowerCase();
  if (/gym|run|workout|cardio|yoga|health|doctor|therapy/.test(text)) return 'health';
  if (/class|lecture|study|exam|homework|assignment|lab/.test(text)) return 'study';
  if (/lunch|dinner|errand|birthday|personal|family|dentist/.test(text)) return 'life';
  return 'work';
}

function guessPriority(title: string): Priority {
  const text = title.toLowerCase();
  if (/urgent|asap|critical|interview|deadline/.test(text)) return 'high';
  if (/optional|flex|catch.?up|social/.test(text)) return 'low';
  return 'medium';
}

function extractVevents(unfolded: string): string[] {
  const blocks: string[] = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(unfolded))) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function parseIcs(raw: string): ImportedCalendarEvent[] {
  const unfolded = unfoldIcs(raw);
  if (!/BEGIN:VCALENDAR/i.test(unfolded) && !/BEGIN:VEVENT/i.test(unfolded)) {
    throw new Error('This file does not look like a calendar (.ics) export.');
  }

  const events: ImportedCalendarEvent[] = [];

  for (const block of extractVevents(unfolded)) {
    const props: Record<string, { params: string; value: string }> = {};
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = splitProperty(trimmed);
      if (!parsed) continue;
      // Keep first occurrence for DTSTART/DTEND; UID/SUMMARY etc. overwrite fine
      if (!props[parsed.name]) {
        props[parsed.name] = { params: parsed.params, value: parsed.value };
      }
    }

    const startProp = props.DTSTART;
    if (!startProp) continue;
    const startParsed = parseIcsDateTime(startProp.value, startProp.params);
    if (!startParsed) continue;

    let endParsed = props.DTEND
      ? parseIcsDateTime(props.DTEND.value, props.DTEND.params)
      : null;

    if (!endParsed && props.DURATION?.value) {
      const durationMatch = props.DURATION.value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
      if (durationMatch) {
        const hours = Number(durationMatch[1] || 0);
        const minutes = Number(durationMatch[2] || 0);
        const end = new Date(startParsed.date.getTime() + (hours * 60 + minutes) * 60000);
        endParsed = { date: end, allDay: startParsed.allDay };
      }
    }

    if (!endParsed) {
      const end = new Date(startParsed.date);
      end.setHours(end.getHours() + (startParsed.allDay ? 8 : 1));
      endParsed = { date: end, allDay: startParsed.allDay };
    }

    // Skip cancelled events
    if ((props.STATUS?.value || '').toUpperCase() === 'CANCELLED') continue;

    const title = unescapeIcsText(props.SUMMARY?.value || 'Imported event');
    const description = unescapeIcsText(props.DESCRIPTION?.value || '');
    const location = unescapeIcsText(props.LOCATION?.value || '');
    const uid =
      unescapeIcsText(props.UID?.value || '') ||
      `${title}-${startParsed.date.toISOString()}`;

    let durationMinutes = Math.round(
      (endParsed.date.getTime() - startParsed.date.getTime()) / 60000
    );
    if (startParsed.allDay) {
      durationMinutes = Math.max(60, Math.min(durationMinutes || 480, 480));
    }
    if (durationMinutes <= 0) durationMinutes = 30;

    const start = startParsed.allDay ? '9:00' : formatLocalTime(startParsed.date);
    const endDate = new Date(startParsed.date.getTime() + durationMinutes * 60000);
    const end = startParsed.allDay
      ? formatLocalTime(endDate)
      : formatLocalTime(endParsed.date);

    events.push({
      uid,
      title: title.slice(0, 80),
      date: formatLocalDateKey(startParsed.date),
      start,
      end,
      durationMinutes,
      location: location || undefined,
      description: description || undefined,
      allDay: startParsed.allDay,
      category: guessCategory(title, description),
      priority: guessPriority(title),
    });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)
  );
}

/** Tiny sample used for demos / smoke tests (Outlook-style export). */
export const SAMPLE_OUTLOOK_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Kairos AI//Outlook Import Demo//EN
BEGIN:VEVENT
UID:demo-standup-1@kairos
DTSTART:20260811T150000Z
DTEND:20260811T153000Z
SUMMARY:Team standup
LOCATION:Teams
DESCRIPTION:Daily sync with the product team
END:VEVENT
BEGIN:VEVENT
UID:demo-design-2@kairos
DTSTART:20260812T180000Z
DTEND:20260812T190000Z
SUMMARY:Design review
DESCRIPTION:Review Kairos screens with design partners
END:VEVENT
BEGIN:VEVENT
UID:demo-lunch-3@kairos
DTSTART:20260811T170000Z
DTEND:20260811T173000Z
SUMMARY:Lunch with mentor
LOCATION:Cafe
END:VEVENT
END:VCALENDAR
`;
