import { loadCloudAuthSession } from '@/lib/cloud-auth';

function readEnv(name: string) {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return (env[name] || '').trim();
}

function defaultCoachUrl() {
  return 'https://coachchat-terdg5ahya-uc.a.run.app';
}

export function getCoachChatUrl() {
  return readEnv('EXPO_PUBLIC_COACH_CHAT_URL') || defaultCoachUrl();
}

export function isCloudCoachConfigured() {
  return Boolean(getCoachChatUrl());
}

export type CoachLlmAction =
  | { type: 'optimize' }
  | { type: 'protect_peak' }
  | { type: 'insert_break' }
  | { type: 'split_longest' }
  | { type: 'clear_evening' }
  | { type: 'boost_priority'; taskTitle?: string }
  | { type: 'balance' }
  | { type: 'prioritize_work' }
  | {
      type: 'set_sleep';
      bedtime?: string;
      wakeTime?: string;
      needHours?: number;
      keep?: 'bed' | 'wake';
    }
  | {
      type: 'add_task';
      title: string;
      durationMinutes?: number;
      category?: string;
      priority?: 'high' | 'medium' | 'low';
      preferredStart?: string;
    }
  | {
      type: 'move_task';
      taskTitle: string;
      date?: string;
      start?: string;
    }
  | {
      type: 'set_priority';
      taskTitle: string;
      priority: 'high' | 'medium' | 'low';
    }
  | { type: 'delete_task'; taskTitle: string }
  | { type: 'none' };

export type CoachDayContext = {
  selectedDate: string;
  chronotype: string | null;
  peakStart: string;
  sleep: { bedtime: string; wakeTime: string };
  capacity: {
    focusHours: number;
    capacityHours: number;
    overflowHours: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    date: string;
    start: string;
    end: string;
    durationMinutes: number;
    category: string;
    priority: string;
  }>;
  recentMessages: Array<{ role: 'user' | 'ai'; text: string }>;
};

export type CoachChatResult = {
  reply: string;
  actions: CoachLlmAction[];
  source: 'llm' | 'fallback';
};

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `Request failed (${res.status})` };
  }
}

/** Call Kairos Cloud Function → OpenAI with the user's day context. */
export async function cloudCoachChat(input: {
  message: string;
  context: CoachDayContext;
}): Promise<CoachChatResult> {
  const session = loadCloudAuthSession();
  const res = await fetch(getCoachChatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: session?.token || '',
      message: input.message,
      context: input.context,
    }),
  });
  const json = (await readJson(res)) as {
    error?: string;
    reply?: string;
    actions?: CoachLlmAction[];
    source?: 'llm' | 'fallback';
  };
  if (!res.ok) {
    throw new Error(json.error || `Coach failed (${res.status})`);
  }
  if (!json.reply) {
    throw new Error('Coach returned an empty reply.');
  }
  return {
    reply: json.reply,
    actions: Array.isArray(json.actions) ? json.actions : [],
    source: json.source || 'llm',
  };
}
