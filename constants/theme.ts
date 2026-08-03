export const colors = {
  bg: '#F4F0E6',
  bgElevated: '#FFFCF5',
  ink: '#1A1814',
  inkSoft: '#5A5348',
  inkMuted: '#8B8275',
  line: 'rgba(26, 24, 20, 0.10)',
  lineStrong: 'rgba(26, 24, 20, 0.18)',
  white: '#FFFFFF',
  black: '#12100E',

  // Default category accents (also seeded in AppContext)
  work: '#5B4FE8',
  workSoft: '#DDD8FF',
  study: '#1F7FBF',
  studySoft: '#CDE8FA',
  health: '#2F9A5B',
  healthSoft: '#CDEFD8',
  life: '#D97706',
  lifeSoft: '#FFE2B8',

  // Priority
  priorityHigh: '#E11D48',
  priorityHighSoft: '#FFE1E8',
  priorityMedium: '#D97706',
  priorityMediumSoft: '#FFE8C7',
  priorityLow: '#0F766E',
  priorityLowSoft: '#D5F5F0',

  alert: '#DC2626',
  alertSoft: '#FEE2E2',
  coach: '#2563EB',
  coachSoft: '#DBEAFE',
  energy: '#EA580C',
  calendar: '#7C3AED',
  calendarSoft: '#EDE9FE',
  today: '#0D9488',
  todaySoft: '#CCFBF1',
};

/** Fallback defaults — prefer useApp().getCategory() */
export const categoryMeta: Record<
  string,
  { label: string; color: string; soft: string }
> = {
  work: { label: 'WORK', color: colors.work, soft: colors.workSoft },
  study: { label: 'STUDY', color: colors.study, soft: colors.studySoft },
  health: { label: 'HEALTH', color: colors.health, soft: colors.healthSoft },
  life: { label: 'LIFE', color: colors.life, soft: colors.lifeSoft },
};

export const priorityMeta = {
  high: {
    label: 'HIGH',
    color: colors.priorityHigh,
    soft: colors.priorityHighSoft,
  },
  medium: {
    label: 'MED',
    color: colors.priorityMedium,
    soft: colors.priorityMediumSoft,
  },
  low: {
    label: 'LOW',
    color: colors.priorityLow,
    soft: colors.priorityLowSoft,
  },
} as const;

export type Category = string;
export type PriorityTone = keyof typeof priorityMeta;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fonts = {
  brand: 'Fraunces_600SemiBold',
  brandItalic: 'Fraunces_600SemiBold_Italic',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};
