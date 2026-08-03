export const colors = {
  bg: '#F2EFE6',
  bgElevated: '#FAF8F2',
  ink: '#1C1A17',
  inkSoft: '#5C574E',
  inkMuted: '#8A8478',
  line: 'rgba(28, 26, 23, 0.10)',
  lineStrong: 'rgba(28, 26, 23, 0.18)',
  white: '#FFFFFF',
  black: '#12100E',
  work: '#6B5CE0',
  workSoft: '#E8E4FF',
  study: '#4A8BC9',
  studySoft: '#DCECF8',
  health: '#4F9A6A',
  healthSoft: '#DCEFDF',
  life: '#C9873A',
  lifeSoft: '#F7E7C8',
  alert: '#D64545',
  alertSoft: '#FCE4E4',
  coach: '#2F6FED',
  coachSoft: '#E7F0FF',
  energy: '#E2A33A',
};

export const categoryMeta = {
  work: { label: 'WORK', color: colors.work, soft: colors.workSoft },
  study: { label: 'STUDY', color: colors.study, soft: colors.studySoft },
  health: { label: 'HEALTH', color: colors.health, soft: colors.healthSoft },
  life: { label: 'LIFE', color: colors.life, soft: colors.lifeSoft },
} as const;

export type Category = keyof typeof categoryMeta;

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
