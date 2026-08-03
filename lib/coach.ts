import {
  addDays,
  addMinutesToTime,
  Category,
  CategoryDef,
  Chronotype,
  formatDuration,
  formatDisplayDate,
  iconForCategory,
  minutesToTime,
  normalizeTimeInput,
  parseDuration,
  Priority,
  SleepSchedule,
  Task,
  timeToMinutes,
} from '@/lib/schedule';

export type CoachChange = { id: string; label: string; detail: string };

export type CoachContext = {
  tasks: Task[];
  selectedDate: string;
  sleep: SleepSchedule;
  peakStart: string;
  chronotype: Chronotype | null;
  categories: CategoryDef[];
};

export type CoachResult = {
  reply: string;
  changes: CoachChange[];
  tasks?: Task[];
  sleep?: SleepSchedule;
};

export type DayInsight = {
  id: string;
  severity: 'info' | 'warn' | 'good';
  text: string;
};

export type SuggestedAction = {
  id: string;
  title: string;
  prompt: string;
  detail: string;
  colorKey: 'work' | 'energy' | 'health' | 'study' | 'calendar' | 'priorityHigh' | 'coach' | 'life';
};

export type DayAnalysis = {
  taskCount: number;
  totalMinutes: number;
  highCount: number;
  longest: Task | null;
  eveningTasks: Task[];
  hasBreak: boolean;
  categoryCounts: Record<string, number>;
  gaps: { after: string; minutes: number }[];
  overflowMinutes: number;
  capacityMinutes: number;
  insights: DayInsight[];
  suggestions: SuggestedAction[];
  summaryLine: string;
};

function change(label: string, detail: string, index = 0): CoachChange {
  return { id: `ch-${Date.now()}-${index}`, label, detail };
}

function bedMinutes(sleep: SleepSchedule) {
  const wake = timeToMinutes(sleep.wakeTime);
  let bed = timeToMinutes(sleep.bedtime);
  if (bed <= wake) bed += 24 * 60;
  return bed;
}

function dayTasks(tasks: Task[], date: string) {
  return tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.order - b.order || timeToMinutes(a.start) - timeToMinutes(b.start));
}

function replaceDay(all: Task[], date: string, nextDay: Task[]) {
  return [...all.filter((t) => t.date !== date), ...nextDay];
}

export function packDay(
  dayList: Task[],
  date: string,
  startAt: string,
  sleep: SleepSchedule,
  bufferMinutes = 10
) {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const sorted = [...dayList].sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] || a.order - b.order
  );
  let cursor = timeToMinutes(startAt);
  const bed = bedMinutes(sleep);

  return sorted.map((task, index) => {
    if (task.category === 'life' && /lunch/i.test(task.title)) {
      cursor = Math.max(cursor, timeToMinutes('12:00'));
    }
    if (cursor + task.durationMinutes > bed - 30) {
      // spill handled by callers
    }
    const start = minutesToTime(cursor);
    const end = minutesToTime(cursor + task.durationMinutes);
    cursor += task.durationMinutes + bufferMinutes;
    return { ...task, date, start, end, order: index };
  });
}

function findTaskByMention(list: Task[], text: string): Task | null {
  const cleaned = text
    .toLowerCase()
    .replace(
      /^(boost|raise|make|set|delete|remove|cancel|defer|move|postpone|shorten|trim|split|lower)\s+/i,
      ''
    )
    .replace(/\s+(to|as)?\s*(high|medium|low|tomorrow|priority).*$/i, '')
    .replace(/\b(priority|task|block|session)\b/g, '')
    .trim();
  if (!cleaned) return null;
  const exact = list.find((t) => t.title.toLowerCase() === cleaned);
  if (exact) return exact;
  return (
    list.find((t) => t.title.toLowerCase().includes(cleaned)) ||
    list.find((t) => cleaned.includes(t.title.toLowerCase())) ||
    null
  );
}

function guessCategory(text: string, categories: CategoryDef[]): Category {
  const lower = text.toLowerCase();
  if (/run|gym|cardio|workout|walk|yoga|health/.test(lower)) {
    return categories.find((c) => c.id === 'health')?.id || 'health';
  }
  if (/study|exam|read|class|homework|calculus/.test(lower)) {
    return categories.find((c) => c.id === 'study')?.id || 'study';
  }
  if (/lunch|dinner|errand|call|admin|email|life|chore/.test(lower)) {
    return categories.find((c) => c.id === 'life')?.id || 'life';
  }
  const custom = categories.find(
    (c) => !c.builtIn && lower.includes(c.label.toLowerCase())
  );
  if (custom) return custom.id;
  return categories.find((c) => c.id === 'work')?.id || 'work';
}

function extractTitle(raw: string) {
  return raw
    .replace(/^(add|schedule|create|new)\s+(a\s+|an\s+)?/i, '')
    .replace(/\bfor\s+\d+.*/i, '')
    .replace(/\b\d+\s*(h|m|min|minutes|hours)\b/gi, '')
    .replace(/\bat\s+\d+.*/i, '')
    .replace(/\btomorrow\b/i, '')
    .trim() || 'New task';
}

export function analyzeDay(ctx: CoachContext): DayAnalysis {
  const list = dayTasks(ctx.tasks, ctx.selectedDate);
  const totalMinutes = list.reduce((sum, t) => sum + t.durationMinutes, 0);
  const wake = timeToMinutes(ctx.sleep.wakeTime);
  const bed = bedMinutes(ctx.sleep);
  const capacityMinutes = Math.max(0, bed - wake - 90);
  const overflowMinutes = Math.max(0, totalMinutes - capacityMinutes);
  const highCount = list.filter((t) => t.priority === 'high').length;
  const longest =
    [...list].sort((a, b) => b.durationMinutes - a.durationMinutes)[0] || null;
  const eveningTasks = list.filter((t) => timeToMinutes(t.start) >= timeToMinutes('17:00'));
  const hasBreak = list.some(
    (t) =>
      /break|reset|recover|walk|stretch/i.test(t.title) ||
      (t.category === 'health' && t.durationMinutes <= 30)
  );
  const categoryCounts: Record<string, number> = {};
  list.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  const gaps: { after: string; minutes: number }[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    const gap =
      timeToMinutes(list[i + 1].start) - timeToMinutes(list[i].end);
    if (gap >= 25) {
      gaps.push({ after: list[i].title, minutes: gap });
    }
  }

  const insights: DayInsight[] = [];
  if (list.length === 0) {
    insights.push({
      id: 'empty',
      severity: 'info',
      text: 'Nothing scheduled yet — add tasks or ask me to plan a starter day.',
    });
  } else {
    insights.push({
      id: 'load',
      severity: overflowMinutes > 30 ? 'warn' : 'good',
      text:
        overflowMinutes > 30
          ? `${formatDuration(totalMinutes)} planned vs ~${formatDuration(capacityMinutes)} capacity — you're overloaded.`
          : `${formatDuration(totalMinutes)} planned inside ~${formatDuration(capacityMinutes)} waking capacity.`,
    });
  }

  if (longest && longest.durationMinutes >= 90) {
    insights.push({
      id: 'long',
      severity: 'warn',
      text: `“${longest.title}” is ${formatDuration(longest.durationMinutes)} — splitting usually protects focus.`,
    });
  }
  if (!hasBreak && list.length >= 3) {
    insights.push({
      id: 'break',
      severity: 'warn',
      text: 'No recovery break found — a 15–20m reset mid-day helps peak work stick.',
    });
  }
  if (eveningTasks.length >= 2) {
    insights.push({
      id: 'evening',
      severity: 'warn',
      text: `${eveningTasks.length} tasks start after 5pm — evenings look heavy.`,
    });
  }
  if (highCount === 0 && list.length > 0) {
    insights.push({
      id: 'priority',
      severity: 'info',
      text: 'No HIGH tasks today — pick one focus block to protect.',
    });
  } else if (highCount >= 4) {
    insights.push({
      id: 'too-high',
      severity: 'warn',
      text: `${highCount} HIGH tasks — everything can’t be urgent. Demote a few.`,
    });
  }
  if (gaps.length >= 2) {
    insights.push({
      id: 'gaps',
      severity: 'info',
      text: `${gaps.length} open gaps (25m+) — I can compress the day tighter.`,
    });
  }
  const catsUsed = Object.keys(categoryCounts).length;
  if (catsUsed === 1 && list.length >= 3) {
    insights.push({
      id: 'mono',
      severity: 'info',
      text: 'Day is one category only — mix in a health or life block for balance.',
    });
  }

  const suggestions: SuggestedAction[] = [];
  const pushSug = (s: SuggestedAction) => {
    if (!suggestions.find((x) => x.id === s.id)) suggestions.push(s);
  };

  pushSug({
    id: 'review',
    title: 'Review day',
    prompt: 'Review my day',
    detail: 'Diagnose load, peaks, and risks',
    colorKey: 'coach',
  });
  pushSug({
    id: 'protect',
    title: 'Protect peak',
    prompt: 'Protect peak window',
    detail: `Front-load focus from ${ctx.peakStart}`,
    colorKey: 'work',
  });

  if (overflowMinutes > 20 || eveningTasks.length > 0) {
    pushSug({
      id: 'overflow',
      title: 'Move overflow',
      prompt: 'Move overflow to tomorrow',
      detail: 'Defer lower-priority leftover work',
      colorKey: 'energy',
    });
  }
  if (!hasBreak) {
    pushSug({
      id: 'break',
      title: 'Insert break',
      prompt: 'Insert a 20m recovery break',
      detail: 'Add a mid-day reset',
      colorKey: 'health',
    });
  }
  if (longest && longest.durationMinutes >= 60) {
    pushSug({
      id: 'split',
      title: 'Split longest',
      prompt: `Split ${longest.title}`,
      detail: `Break ${formatDuration(longest.durationMinutes)} into two`,
      colorKey: 'study',
    });
  }
  if (eveningTasks.length > 0) {
    pushSug({
      id: 'evening',
      title: 'Clear evening',
      prompt: 'Clear evening after 5',
      detail: 'Keep nights lighter',
      colorKey: 'calendar',
    });
  }
  if (highCount === 0 && list[0]) {
    pushSug({
      id: 'boost',
      title: 'Boost focus',
      prompt: `Make ${list[0].title} high priority`,
      detail: 'Raise a key task to HIGH',
      colorKey: 'priorityHigh',
    });
  }
  if (gaps.length >= 2) {
    pushSug({
      id: 'compress',
      title: 'Compress day',
      prompt: 'Compress gaps',
      detail: 'Tighten buffers between blocks',
      colorKey: 'life',
    });
  }
  pushSug({
    id: 'balance',
    title: 'Balance',
    prompt: 'Balance categories',
    detail: 'Alternate work / study / health',
    colorKey: 'study',
  });
  pushSug({
    id: 'admin',
    title: 'Batch admin',
    prompt: 'Batch admin tasks',
    detail: 'Group low-energy chores together',
    colorKey: 'energy',
  });

  const summaryLine =
    list.length === 0
      ? 'Empty day — ready when you are.'
      : `${list.length} tasks · ${formatDuration(totalMinutes)} · ${highCount} high · peak ${ctx.peakStart}`;

  return {
    taskCount: list.length,
    totalMinutes,
    highCount,
    longest,
    eveningTasks,
    hasBreak,
    categoryCounts,
    gaps,
    overflowMinutes,
    capacityMinutes,
    insights,
    suggestions: suggestions.slice(0, 8),
    summaryLine,
  };
}

function reviewReply(ctx: CoachContext, analysis: DayAnalysis): CoachResult {
  const list = dayTasks(ctx.tasks, ctx.selectedDate);
  const lines = [
    `Here’s my read on ${formatDisplayDate(ctx.selectedDate)}:`,
    analysis.summaryLine,
    ...analysis.insights.map((i) => `• ${i.text}`),
  ];
  if (list.length) {
    const top = [...list]
      .sort((a, b) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority];
      })
      .slice(0, 3)
      .map((t) => `${t.title} (${t.start}, ${t.priority})`)
      .join('; ');
    lines.push(`Focus candidates: ${top}.`);
  }
  const topActions = analysis.suggestions
    .filter((s) => s.id !== 'review')
    .slice(0, 3)
    .map((s) => s.title)
    .join(', ');
  if (topActions) lines.push(`Try next: ${topActions}.`);
  return {
    reply: lines.join('\n'),
    changes: [change('Day reviewed', analysis.summaryLine)],
  };
}

function optimizeDay(ctx: CoachContext): CoachResult {
  const date = ctx.selectedDate;
  const packed = packDay(dayTasks(ctx.tasks, date), date, ctx.peakStart, ctx.sleep);
  const bed = bedMinutes(ctx.sleep);
  const keep: Task[] = [];
  const spill: Task[] = [];
  packed.forEach((task) => {
    if (timeToMinutes(task.end) > bed - 30 && task.priority !== 'high') {
      spill.push(task);
    } else {
      keep.push(task);
    }
  });
  const tomorrow = addDays(date, 1);
  const others = ctx.tasks.filter((t) => t.date !== date && t.date !== tomorrow);
  const tomorrowExisting = ctx.tasks.filter((t) => t.date === tomorrow);
  const moved = spill.map((task, index) => ({
    ...task,
    date: tomorrow,
    start: minutesToTime(timeToMinutes(ctx.peakStart) + index * 70),
    end: minutesToTime(
      timeToMinutes(ctx.peakStart) + index * 70 + task.durationMinutes
    ),
    order: tomorrowExisting.length + index,
  }));
  const repacked = packDay(keep, date, ctx.peakStart, ctx.sleep);
  const reply =
    spill.length > 0
      ? `Optimized today: kept ${keep.length} tasks in capacity and moved ${spill.length} lower-priority item(s) to tomorrow.`
      : `Optimized today: packed ${keep.length} tasks around your ${ctx.peakStart} peak and ${ctx.sleep.bedtime} bedtime.`;
  return {
    reply,
    changes: [
      change(
        'Schedule optimized',
        spill.length
          ? `Moved ${spill.map((t) => t.title).join(', ')} → tomorrow`
          : `Packed ${keep.length} tasks around peak`
      ),
    ],
    tasks: [...others, ...tomorrowExisting, ...repacked, ...moved],
  };
}

function protectPeak(ctx: CoachContext): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const focus = day.filter(
    (t) => t.priority === 'high' || t.category === 'work' || t.category === 'study'
  );
  const rest = day.filter(
    (t) => !(t.priority === 'high' || t.category === 'work' || t.category === 'study')
  );
  const packed = packDay([...focus, ...rest], ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: `Protected your ${ctx.peakStart} peak. ${focus.length} focus block(s) lead the day; lighter work follows.`,
    changes: [
      change('Peak protected', `${focus.length} focus blocks from ${ctx.peakStart}`),
    ],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function insertBreak(ctx: CoachContext, text: string): CoachResult {
  const minutes = Math.min(45, Math.max(10, parseDuration(text) || 20));
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  // Place after the second task, or mid-afternoon default
  let start = '15:00';
  if (day.length >= 2) {
    start = addMinutesToTime(day[1].end, 5);
  } else if (day[0]) {
    start = addMinutesToTime(day[0].end, 5);
  }
  const breakTask: Task = {
    id: `break-${Date.now()}`,
    title: minutes <= 15 ? 'Quick reset' : 'Recovery break',
    date: ctx.selectedDate,
    start,
    end: addMinutesToTime(start, minutes),
    durationMinutes: minutes,
    category: 'health',
    priority: 'medium',
    icon: 'run',
    order: day.length,
  };
  const packed = packDay([...day, breakTask], ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: `Inserted a ${minutes}-minute recovery break and re-packed the afternoon so focus blocks stay intact.`,
    changes: [change('Break inserted', `${minutes}m reset around ${start}`)],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function splitTask(ctx: CoachContext, text: string): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const mentioned = findTaskByMention(day, text);
  const longest =
    mentioned ||
    [...day].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (!longest || longest.durationMinutes < 50) {
    return {
      reply: 'I need a block of ~50m+ to split. Add a longer focus task, or name one.',
      changes: [],
    };
  }
  const half = Math.round(longest.durationMinutes / 2);
  const partA: Task = {
    ...longest,
    title: `${longest.title.replace(/\s*\(\d\/\d\)$/, '')} (1/2)`,
    durationMinutes: half,
    end: addMinutesToTime(longest.start, half),
  };
  const partB: Task = {
    ...longest,
    id: `${longest.id}-b-${Date.now()}`,
    title: `${longest.title.replace(/\s*\(\d\/\d\)$/, '')} (2/2)`,
    durationMinutes: longest.durationMinutes - half,
    start: addMinutesToTime(partA.end, 15),
    end: addMinutesToTime(
      addMinutesToTime(partA.end, 15),
      longest.durationMinutes - half
    ),
    order: longest.order + 1,
  };
  const rest = day.filter((t) => t.id !== longest.id);
  const packed = packDay([...rest, partA, partB], ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: `Split “${longest.title}” into two ${formatDuration(half)} sessions with a buffer between them.`,
    changes: [
      change('Split long block', `${longest.title} → two sessions`),
    ],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function clearEvening(ctx: CoachContext, text: string): CoachResult {
  const cutoffMatch = text.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let cutoff = '17:00';
  if (cutoffMatch) {
    const normalized = normalizeTimeInput(
      `${cutoffMatch[1]}${cutoffMatch[2] ? `:${cutoffMatch[2]}` : ''}${cutoffMatch[3] || 'pm'}`
    );
    if (normalized) cutoff = normalized;
  }
  const tomorrow = addDays(ctx.selectedDate, 1);
  const movedTitles: string[] = [];
  const kept: Task[] = [];
  const moved: Task[] = [];
  ctx.tasks.forEach((task) => {
    if (task.date !== ctx.selectedDate) return;
    if (
      timeToMinutes(task.start) >= timeToMinutes(cutoff) &&
      task.priority !== 'high'
    ) {
      movedTitles.push(task.title);
      moved.push({
        ...task,
        date: tomorrow,
        start: ctx.peakStart,
        end: addMinutesToTime(ctx.peakStart, task.durationMinutes),
      });
    } else {
      kept.push(task);
    }
  });
  const others = ctx.tasks.filter(
    (t) => t.date !== ctx.selectedDate && t.date !== tomorrow
  );
  const tomorrowExisting = ctx.tasks.filter((t) => t.date === tomorrow);
  const packedKeep = packDay(kept, ctx.selectedDate, ctx.peakStart, ctx.sleep);
  const packedMoved = packDay(
    [...tomorrowExisting, ...moved],
    tomorrow,
    ctx.peakStart,
    ctx.sleep
  );
  return {
    reply: movedTitles.length
      ? `Cleared after ${cutoff}: moved ${movedTitles.length} task(s) to tomorrow’s peak (${movedTitles.join(', ')}).`
      : `Nothing non-urgent after ${cutoff} — evening already light.`,
    changes: [
      change(
        'Evening cleared',
        movedTitles.length ? `Moved: ${movedTitles.join(', ')}` : `Already clear after ${cutoff}`
      ),
    ],
    tasks: [...others, ...packedKeep, ...packedMoved],
  };
}

function boostPriority(ctx: CoachContext, text: string): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const mentioned = findTaskByMention(day, text);
  const candidate =
    mentioned ||
    day.find((t) => /react|code|exam|study|architecture|design/i.test(t.title)) ||
    day.find((t) => t.priority !== 'high') ||
    day[0];
  if (!candidate) {
    return { reply: 'No tasks today to boost. Add one first.', changes: [] };
  }
  const nextPriority: Priority = /low/.test(text)
    ? 'low'
    : /medium|med/.test(text)
      ? 'medium'
      : 'high';
  const tasks = ctx.tasks.map((t) =>
    t.id === candidate.id ? { ...t, priority: nextPriority } : t
  );
  return {
    reply: `Set “${candidate.title}” to ${nextPriority.toUpperCase()} priority.`,
    changes: [
      change('Priority updated', `${candidate.title} → ${nextPriority.toUpperCase()}`),
    ],
    tasks,
  };
}

function balanceCategories(ctx: CoachContext): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const buckets: Record<string, Task[]> = {};
  day.forEach((t) => {
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
  const packed = packDay(interleaved, ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: 'Rebalanced the day so categories alternate instead of clustering.',
    changes: [change('Day balanced', 'Interleaved category blocks')],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function batchAdmin(ctx: CoachContext): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const admin = day.filter(
    (t) =>
      t.priority === 'low' ||
      /email|admin|errand|chore|standup|lunch/i.test(t.title) ||
      t.category === 'life'
  );
  const focus = day.filter((t) => !admin.includes(t));
  // Focus first through peak, admin batched later
  const adminStart = addMinutesToTime(ctx.peakStart, 180);
  let cursor = timeToMinutes(adminStart);
  const batchedAdmin = admin.map((task, index) => {
    const start = minutesToTime(cursor);
    const end = minutesToTime(cursor + task.durationMinutes);
    cursor += task.durationMinutes + 5;
    return { ...task, start, end, order: focus.length + index };
  });
  const packedFocus = packDay(focus, ctx.selectedDate, ctx.peakStart, ctx.sleep);
  const combined = [...packedFocus, ...batchedAdmin].map((t, i) => ({
    ...t,
    order: i,
  }));
  return {
    reply: `Batched ${admin.length} admin/life item(s) after peak focus. Deep work stays early.`,
    changes: [
      change(
        'Admin batched',
        admin.length
          ? `Grouped: ${admin.map((t) => t.title).join(', ')}`
          : 'No admin-like tasks found'
      ),
    ],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, combined),
  };
}

function compressGaps(ctx: CoachContext): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const packed = packDay(day, ctx.selectedDate, ctx.peakStart, ctx.sleep, 5);
  return {
    reply: 'Compressed the day with tighter 5-minute buffers between blocks.',
    changes: [change('Day compressed', 'Buffers reduced to 5m')],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function healthEarlier(ctx: CoachContext): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const health = day.filter((t) => t.category === 'health');
  const rest = day.filter((t) => t.category !== 'health');
  if (!health.length) {
    const walk: Task = {
      id: `health-${Date.now()}`,
      title: 'Morning movement',
      date: ctx.selectedDate,
      start: ctx.sleep.wakeTime,
      end: addMinutesToTime(ctx.sleep.wakeTime, 30),
      durationMinutes: 30,
      category: 'health',
      priority: 'medium',
      icon: 'run',
      order: 0,
    };
    const packed = packDay([walk, ...day], ctx.selectedDate, ctx.sleep.wakeTime, ctx.sleep);
    return {
      reply: 'No health block found — added 30m morning movement right after wake.',
      changes: [change('Health added', '30m morning movement')],
      tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
    };
  }
  const packed = packDay(
    [...health, ...rest],
    ctx.selectedDate,
    ctx.sleep.wakeTime,
    ctx.sleep
  );
  return {
    reply: `Moved ${health.length} health block(s) earlier, near wake (${ctx.sleep.wakeTime}).`,
    changes: [change('Health earlier', health.map((t) => t.title).join(', '))],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function deferLows(ctx: CoachContext): CoachResult {
  const tomorrow = addDays(ctx.selectedDate, 1);
  const movedTitles: string[] = [];
  const kept: Task[] = [];
  const moved: Task[] = [];
  dayTasks(ctx.tasks, ctx.selectedDate).forEach((task) => {
    if (task.priority === 'low') {
      movedTitles.push(task.title);
      moved.push({
        ...task,
        date: tomorrow,
        start: ctx.peakStart,
        end: addMinutesToTime(ctx.peakStart, task.durationMinutes),
      });
    } else {
      kept.push(task);
    }
  });
  const others = ctx.tasks.filter(
    (t) => t.date !== ctx.selectedDate && t.date !== tomorrow
  );
  const tomorrowExisting = ctx.tasks.filter((t) => t.date === tomorrow);
  return {
    reply: movedTitles.length
      ? `Deferred ${movedTitles.length} LOW task(s) to tomorrow: ${movedTitles.join(', ')}.`
      : 'No LOW-priority tasks to defer today.',
    changes: [
      change(
        'Lows deferred',
        movedTitles.length ? movedTitles.join(', ') : 'Nothing to move'
      ),
    ],
    tasks: [
      ...others,
      ...packDay(kept, ctx.selectedDate, ctx.peakStart, ctx.sleep),
      ...packDay([...tomorrowExisting, ...moved], tomorrow, ctx.peakStart, ctx.sleep),
    ],
  };
}

function shortenLongest(ctx: CoachContext, text: string): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const target =
    findTaskByMention(day, text) ||
    [...day].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (!target || target.durationMinutes <= 30) {
    return { reply: 'Nothing long enough to shorten meaningfully.', changes: [] };
  }
  const explicit = parseDuration(text);
  const nextDuration =
    explicit && explicit < target.durationMinutes
      ? explicit
      : Math.max(30, Math.round(target.durationMinutes * 0.7));
  const updated = day.map((t) =>
    t.id === target.id
      ? {
          ...t,
          durationMinutes: nextDuration,
          end: addMinutesToTime(t.start, nextDuration),
        }
      : t
  );
  const packed = packDay(updated, ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: `Shortened “${target.title}” from ${formatDuration(target.durationMinutes)} to ${formatDuration(nextDuration)}.`,
    changes: [
      change(
        'Task shortened',
        `${target.title}: ${formatDuration(target.durationMinutes)} → ${formatDuration(nextDuration)}`
      ),
    ],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function removeTask(ctx: CoachContext, text: string): CoachResult {
  const day = dayTasks(ctx.tasks, ctx.selectedDate);
  const target = findTaskByMention(day, text);
  if (!target) {
    return {
      reply: 'Tell me which task to remove — e.g. “delete Email Admin”.',
      changes: [],
    };
  }
  const rest = day.filter((t) => t.id !== target.id);
  const packed = packDay(rest, ctx.selectedDate, ctx.peakStart, ctx.sleep);
  return {
    reply: `Removed “${target.title}” and closed the gap.`,
    changes: [change('Task removed', target.title)],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function addTask(ctx: CoachContext, raw: string, text: string): CoachResult {
  const duration = parseDuration(text);
  const tomorrow = /tomorrow/.test(text);
  const date = tomorrow ? addDays(ctx.selectedDate, 1) : ctx.selectedDate;
  const category = guessCategory(text, ctx.categories);
  const title = extractTitle(raw).slice(0, 48);
  const priority: Priority = /high|urgent|important/.test(text)
    ? 'high'
    : /low/.test(text)
      ? 'low'
      : 'medium';
  const timeMatch = text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const preferred = timeMatch ? normalizeTimeInput(timeMatch[1]) : null;
  const newTask: Task = {
    id: `t-${Date.now()}`,
    title,
    date,
    start: preferred || ctx.peakStart,
    end: addMinutesToTime(preferred || ctx.peakStart, duration),
    durationMinutes: duration,
    category,
    priority,
    icon: iconForCategory(category),
    order: dayTasks(ctx.tasks, date).length,
  };
  const day = [...dayTasks(ctx.tasks, date), newTask];
  const packed = packDay(
    day,
    date,
    preferred || (tomorrow ? ctx.peakStart : ctx.peakStart),
    ctx.sleep
  );
  return {
    reply: `Added “${newTask.title}” (${formatDuration(duration)}, ${priority}) to ${tomorrow ? 'tomorrow' : 'today'} and fitted it in.`,
    changes: [
      change('Task added', `${newTask.title} · ${formatDuration(duration)} · ${category}`),
    ],
    tasks: replaceDay(ctx.tasks, date, packed),
  };
}

function updateSleep(ctx: CoachContext, text: string): CoachResult {
  const next = { ...ctx.sleep };
  const bedMatch = text.match(
    /(?:bed(?:time)?|sleep)\s*(?:at|=|:)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );
  const wakeMatch = text.match(
    /(?:wake|get up)\s*(?:at|=|:|up)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );
  if (bedMatch) {
    const n = normalizeTimeInput(bedMatch[1]);
    if (n) next.bedtime = n;
  } else if (/bed|sleep/.test(text)) {
    if (/\b11\b/.test(text)) next.bedtime = '23:00';
    if (/\b10\b/.test(text)) next.bedtime = '22:00';
    if (/\b12\b|midnight/.test(text)) next.bedtime = '0:00';
  }
  if (wakeMatch) {
    const n = normalizeTimeInput(wakeMatch[1]);
    if (n) next.wakeTime = n;
  } else if (/wake/.test(text)) {
    if (/early|6/.test(text)) next.wakeTime = '6:00';
    if (/\b7\b/.test(text)) next.wakeTime = '7:00';
    if (/\b8\b/.test(text)) next.wakeTime = '8:00';
    if (/\b9\b/.test(text)) next.wakeTime = '9:00';
  }
  return {
    reply: `Updated sleep window → wake ${next.wakeTime} / bed ${next.bedtime}. Ask me to re-optimize today around it.`,
    changes: [
      change('Sleep updated', `Wake ${next.wakeTime} · Bed ${next.bedtime}`),
    ],
    sleep: next,
  };
}

function prioritizeWork(ctx: CoachContext): CoachResult {
  const updated = ctx.tasks.map((task) => {
    if (task.date !== ctx.selectedDate) return task;
    if (task.category === 'work' || task.category === 'study') {
      return { ...task, priority: 'high' as Priority };
    }
    if (task.category === 'life') {
      return { ...task, priority: 'low' as Priority };
    }
    return task;
  });
  const packed = packDay(
    dayTasks(updated, ctx.selectedDate),
    ctx.selectedDate,
    ctx.peakStart,
    ctx.sleep
  );
  return {
    reply: 'Marked work/study as HIGH and life admin as LOW, then re-packed around peak.',
    changes: [change('Work prioritized', 'Work/study ↑ · life ↓')],
    tasks: replaceDay(updated, ctx.selectedDate, packed),
  };
}

function planStarterDay(ctx: CoachContext): CoachResult {
  if (dayTasks(ctx.tasks, ctx.selectedDate).length >= 3) {
    return {
      reply: 'You already have a day planned. Say “review my day” or pick an action card.',
      changes: [],
    };
  }
  const seeds: Task[] = [
    {
      id: `seed-${Date.now()}-1`,
      title: 'Deep focus block',
      date: ctx.selectedDate,
      start: ctx.peakStart,
      end: addMinutesToTime(ctx.peakStart, 90),
      durationMinutes: 90,
      category: 'work',
      priority: 'high',
      icon: 'code',
      order: 0,
    },
    {
      id: `seed-${Date.now()}-2`,
      title: 'Movement',
      date: ctx.selectedDate,
      start: addMinutesToTime(ctx.peakStart, 100),
      end: addMinutesToTime(ctx.peakStart, 130),
      durationMinutes: 30,
      category: 'health',
      priority: 'medium',
      icon: 'run',
      order: 1,
    },
    {
      id: `seed-${Date.now()}-3`,
      title: 'Admin batch',
      date: ctx.selectedDate,
      start: addMinutesToTime(ctx.peakStart, 140),
      end: addMinutesToTime(ctx.peakStart, 185),
      durationMinutes: 45,
      category: 'life',
      priority: 'low',
      icon: 'mail',
      order: 2,
    },
  ];
  const packed = packDay(
    [...dayTasks(ctx.tasks, ctx.selectedDate), ...seeds],
    ctx.selectedDate,
    ctx.peakStart,
    ctx.sleep
  );
  return {
    reply: 'Built a starter day: deep focus → movement → admin batch. Tweak titles or ask me to protect peak.',
    changes: [change('Starter day', 'Focus + health + admin seeded')],
    tasks: replaceDay(ctx.tasks, ctx.selectedDate, packed),
  };
}

function helpReply(ctx: CoachContext, analysis: DayAnalysis): CoachResult {
  return {
    reply: [
      'I can reshape your schedule — not just chat.',
      'Examples:',
      '• “review my day” / “what’s wrong with today?”',
      '• “protect peak” · “move overflow” · “insert 15m break”',
      '• “split React Architecture” · “clear evening after 6”',
      '• “make Calculus high” · “delete Email Admin”',
      '• “add 45m gym at 5pm” · “set bedtime 11pm”',
      '• “batch admin” · “compress gaps” · “health earlier”',
      `Right now: ${analysis.summaryLine}`,
    ].join('\n'),
    changes: [change('Coach help', 'Listed capabilities')],
  };
}

/**
 * Natural-language coach: inspects the day, mutates schedule when asked,
 * and otherwise returns diagnosis + next steps (never blind no-ops).
 */
export function runCoach(raw: string, ctx: CoachContext): CoachResult {
  const text = raw.toLowerCase().trim();
  const analysis = analyzeDay(ctx);

  if (!text) {
    return helpReply(ctx, analysis);
  }

  if (
    /help|what can you|capabilities|commands|how do you|what do you do/.test(
      text
    )
  ) {
    return helpReply(ctx, analysis);
  }

  if (
    /review|analy[sz]e|how('?s| is) my day|what('?s| is) wrong|diagnose|status|overview|inspect/.test(
      text
    )
  ) {
    return reviewReply(ctx, analysis);
  }

  if (/plan (my |a )?day|starter day|empty day|build (me )?a day/.test(text)) {
    return planStarterDay(ctx);
  }

  if (/bedtime|sleep|wake|get up/.test(text) && !/oversleep/.test(text)) {
    return updateSleep(ctx, text);
  }

  if (/protect peak|peak window|deep work first|front[- ]?load/.test(text)) {
    return protectPeak(ctx);
  }

  if (/insert break|recovery|reset|add (a )?break/.test(text)) {
    return insertBreak(ctx, text);
  }

  if (/^split\b|\bsplit (longest|long|task|block)/.test(text) || /\bsplit .+/i.test(raw)) {
    return splitTask(ctx, text);
  }

  if (/clear evening|after \d|evening light|free (my )?evening|free afternoon/.test(text)) {
    return clearEvening(ctx, text);
  }

  if (
    /boost|raise priority|make .+ high|set .+ (to )?(high|low|medium)|priorit[yi]ze .+/.test(
      text
    )
  ) {
    return boostPriority(ctx, text);
  }

  if (/balance|mix categories|variety|alternate/.test(text)) {
    return balanceCategories(ctx);
  }

  if (/batch admin|batch email|group admin|admin batch/.test(text)) {
    return batchAdmin(ctx);
  }

  if (/compress|tighten|close gaps|pack tight/.test(text)) {
    return compressGaps(ctx);
  }

  if (/health earlier|morning (workout|movement|run|gym)|move (health|gym|workout)/.test(text)) {
    return healthEarlier(ctx);
  }

  if (/defer low|postpone low|move low|all low .+ tomorrow/.test(text)) {
    return deferLows(ctx);
  }

  if (/shorten|trim|cut .+ (down|shorter)/.test(text)) {
    return shortenLongest(ctx, text);
  }

  if (/^(delete|remove|cancel)\b/.test(text)) {
    return removeTask(ctx, text);
  }

  if (/prioritize work|focus on work|work first/.test(text)) {
    return prioritizeWork(ctx);
  }

  if (
    /low priority|tomorrow|overflow|too much|optimize|re-?pack|repack|fix my day/.test(
      text
    )
  ) {
    return optimizeDay(ctx);
  }

  if (/^(add|schedule|create|new)\b/.test(text) || /\badd \d/.test(text)) {
    return addTask(ctx, raw, text);
  }

  // Smart fallback: diagnose instead of silently optimizing
  const warn = analysis.insights.filter((i) => i.severity === 'warn');
  const next = analysis.suggestions.filter((s) => s.id !== 'review').slice(0, 3);
  return {
    reply: [
      `I heard “${raw.trim()}” — here’s what stands out:`,
      ...(warn.length
        ? warn.map((i) => `• ${i.text}`)
        : [`• ${analysis.summaryLine}`]),
      next.length
        ? `Suggested moves: ${next.map((s) => s.title).join(' · ')}. Tap a card or say e.g. “${next[0].prompt}”.`
        : 'Say “help” to see everything I can change.',
    ].join('\n'),
    changes: [change('Coach listened', 'Shared diagnosis + suggestions')],
  };
}
