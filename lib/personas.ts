/**
 * Persona + scenario research distilled for Kairos AI.
 * Source: Kairos wireframe site (purr-bunch-24702901.figma.site) and
 * product scenarios embedded in the prototype. Private Figma persona
 * boards were not reachable from this environment — these capture the
 * same JTBD the wireflows encode.
 */

export type PersonaId =
  | 'focused-builder'
  | 'exam-sprinter'
  | 'balanced-burnout'
  | 'night-shift-owl';

export type Persona = {
  id: PersonaId;
  name: string;
  role: string;
  chronotypeHint: string;
  goals: string[];
  pains: string[];
  needs: string[];
};

export type ScenarioPreset = {
  id: string;
  personaId: PersonaId;
  title: string;
  detail: string;
  prompt: string;
  coachPrompt?: string;
};

export const PERSONAS: Persona[] = [
  {
    id: 'focused-builder',
    name: 'Maya — Focused Builder',
    role: 'Product engineer / deep-work professional',
    chronotypeHint: 'morning',
    goals: [
      'Protect a long deep-work block in peak hours',
      'Keep meetings and admin from fragmenting focus',
      'Still fit movement and lunch without derailing the day',
    ],
    pains: [
      'Calendar fills with shallow work before coding starts',
      'Hard to say what “enough” focus time looks like',
      'Evening spills when the day wasn’t front-loaded',
    ],
    needs: [
      'Peak protection',
      'Priority-aware packing',
      'One-tap defer of low-value tasks',
    ],
  },
  {
    id: 'exam-sprinter',
    name: 'Jordan — Exam Sprinter',
    role: 'Student juggling classes, workouts, and exams',
    chronotypeHint: 'mid-morning',
    goals: [
      'Split long study blocks so retention sticks',
      'Schedule cardio without eating the study window',
      'See capacity before overloading an exam day',
    ],
    pains: [
      'Crams 3h+ study and burns out mid-afternoon',
      'Health goals get dropped when exams hit',
      'Doesn’t know what to move to tomorrow',
    ],
    needs: [
      'Split longest',
      'Insert recovery breaks',
      'Clear overflow to tomorrow',
    ],
  },
  {
    id: 'balanced-burnout',
    name: 'Sam — Balance Seeker',
    role: 'Knowledge worker watching burnout risk',
    chronotypeHint: 'morning',
    goals: [
      'Keep evenings lighter',
      'Mix categories so the day doesn’t feel monochrome',
      'Know when load exceeds capacity',
    ],
    pains: [
      'Everything marked urgent',
      'No recovery breaks',
      'Work piles after 5pm',
    ],
    needs: [
      'Clear evening',
      'Insert break',
      'Capacity warnings + coach review',
    ],
  },
  {
    id: 'night-shift-owl',
    name: 'Riley — Night Owl',
    role: 'Creative / late chronotype',
    chronotypeHint: 'night-owl',
    goals: [
      'Start deep work later without guilt',
      'Align sleep need (e.g. 8h) with a late wake',
      'Avoid fake “morning peak” packing',
    ],
    pains: [
      'Default 9–5 templates punish late energy',
      'Sleep changes don’t update the schedule',
      'Health blocks get stuck at dawn',
    ],
    needs: [
      'Chronotype-aware peak',
      'Sleep-need adjustments',
      'Health earlier relative to wake — not clock 6am',
    ],
  },
];

/** Quick-start brain dumps for Add Tasks — persona scenarios from the wireflow. */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'deep-work-day',
    personaId: 'focused-builder',
    title: 'Deep work day',
    detail: 'Maya · protect coding peak',
    prompt:
      'I need 2h to code React, 45min cardio before 5pm, and lunch at noon',
    coachPrompt: 'Protect peak window',
  },
  {
    id: 'exam-day',
    personaId: 'exam-sprinter',
    title: 'Exam sprint',
    detail: 'Jordan · study + workout',
    prompt:
      '3h exam study for calculus, 45m gym, 30m review flashcards, and dinner at 7pm',
    coachPrompt: 'Split longest task',
  },
  {
    id: 'light-evening',
    personaId: 'balanced-burnout',
    title: 'Light evening',
    detail: 'Sam · clear after 5',
    prompt:
      '90m deep work, 1h meetings, 45m email admin, 30m walk, and errands after 5pm',
    coachPrompt: 'Clear evening after 5',
  },
  {
    id: 'owl-creative',
    personaId: 'night-shift-owl',
    title: 'Night-owl creative',
    detail: 'Riley · late peak',
    prompt:
      '2h design critique at 11am, 90m creative writing, 45m stretch, and a late standup at 4pm',
    coachPrompt: 'I only need 8h of sleep',
  },
];

export function personaById(id: PersonaId) {
  return PERSONAS.find((p) => p.id === id) || PERSONAS[0];
}

export function tipForChronotype(chronotype: string | null) {
  switch (chronotype) {
    case 'early-bird':
      return 'Early peak — front-load deep work soon after wake, keep evenings light.';
    case 'night-owl':
      return 'Late peak — don’t force 8am deep work; protect late-morning focus instead.';
    case 'mid-morning':
      return 'Mid-morning peak — warm up with movement, then lock a focus block.';
    case 'morning':
    default:
      return 'Morning peak — schedule HIGH work first, batch admin after lunch.';
  }
}
