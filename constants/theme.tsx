import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';

/** Productive cool palette — light blues & greens */
export const lightColors = {
  bg: '#EAF4F6',
  bgElevated: '#F7FBFC',
  ink: '#0C2A32',
  inkSoft: '#3D5F68',
  inkMuted: '#6A8A92',
  line: 'rgba(12, 42, 50, 0.10)',
  lineStrong: 'rgba(12, 42, 50, 0.18)',
  white: '#FFFFFF',
  black: '#062026',

  work: '#0284C7',
  workSoft: '#D6EEFB',
  study: '#2563EB',
  studySoft: '#DBE7FF',
  health: '#16A34A',
  healthSoft: '#D8F5E3',
  life: '#0D9488',
  lifeSoft: '#CCFBF1',

  priorityHigh: '#DC2626',
  priorityHighSoft: '#FEE2E2',
  priorityMedium: '#CA8A04',
  priorityMediumSoft: '#FEF3C7',
  priorityLow: '#0F766E',
  priorityLowSoft: '#CCFBF1',

  alert: '#DC2626',
  alertSoft: '#FEE2E2',
  coach: '#0284C7',
  coachSoft: '#E0F2FE',
  energy: '#14B8A6',
  calendar: '#0F766E',
  calendarSoft: '#CCFBF1',
  today: '#059669',
  todaySoft: '#D1FAE5',

  /** Filled selected/active control (chip, toggle, avatar) */
  selectedFill: '#0C2A32',
  /** Text/icon on selectedFill */
  onSelected: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  bg: '#07181E',
  bgElevated: '#0E2730',
  ink: '#E8F4F6',
  inkSoft: '#A9C8D0',
  inkMuted: '#6F919A',
  line: 'rgba(232, 244, 246, 0.10)',
  lineStrong: 'rgba(232, 244, 246, 0.18)',
  white: '#FFFFFF',
  black: '#020B0E',

  work: '#38BDF8',
  workSoft: '#0C3A4E',
  study: '#60A5FA',
  studySoft: '#0F2E55',
  health: '#4ADE80',
  healthSoft: '#0F3D24',
  life: '#2DD4BF',
  lifeSoft: '#0F3F3C',

  priorityHigh: '#F87171',
  priorityHighSoft: '#4A1A1A',
  priorityMedium: '#FBBF24',
  priorityMediumSoft: '#3F3210',
  priorityLow: '#2DD4BF',
  priorityLowSoft: '#0F3F3C',

  alert: '#F87171',
  alertSoft: '#4A1A1A',
  coach: '#38BDF8',
  coachSoft: '#0C3A4E',
  energy: '#2DD4BF',
  calendar: '#2DD4BF',
  calendarSoft: '#0F3F3C',
  today: '#34D399',
  todaySoft: '#0F3D2A',

  selectedFill: '#34D399',
  onSelected: '#020B0E',
};

export type ThemeColors = typeof lightColors;
export type ColorScheme = 'light' | 'dark';

/** @deprecated Prefer useTheme().colors — kept as light default for non-component modules */
export const colors = lightColors;

export const categoryMeta: Record<
  string,
  { label: string; color: string; soft: string }
> = {
  work: { label: 'WORK', color: lightColors.work, soft: lightColors.workSoft },
  study: { label: 'STUDY', color: lightColors.study, soft: lightColors.studySoft },
  health: { label: 'HEALTH', color: lightColors.health, soft: lightColors.healthSoft },
  life: { label: 'LIFE', color: lightColors.life, soft: lightColors.lifeSoft },
};

export const priorityMeta = {
  high: {
    label: 'HIGH',
    color: lightColors.priorityHigh,
    soft: lightColors.priorityHighSoft,
  },
  medium: {
    label: 'MED',
    color: lightColors.priorityMedium,
    soft: lightColors.priorityMediumSoft,
  },
  low: {
    label: 'LOW',
    color: lightColors.priorityLow,
    soft: lightColors.priorityLowSoft,
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

type ThemeContextValue = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const toggleColorScheme = useCallback(() => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      colors: colorScheme === 'dark' ? darkColors : lightColors,
      setColorScheme,
      toggleColorScheme,
      isDark: colorScheme === 'dark',
    }),
    [colorScheme, toggleColorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colorScheme: 'light' as ColorScheme,
      colors: lightColors,
      setColorScheme: () => undefined,
      toggleColorScheme: () => undefined,
      isDark: false,
    };
  }
  return ctx;
}

/** Build StyleSheet that updates when theme colors change */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (c: ThemeColors) => T
) {
  const { colors: themeColors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory is inline per render; themeColors drives updates
  return useMemo(() => StyleSheet.create(factory(themeColors)), [themeColors]);
}
