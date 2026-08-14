import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, ViewStyle } from 'react-native';

import { useTheme, useThemedStyles } from '@/constants/theme';

type Props = {
  /** Parent screen to return to (used instead of raw history when unsafe) */
  fallbackHref?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

const UNSAFE_BACK_PATHS = [
  '/login',
  '/onboarding',
  'login',
  'onboarding',
  'accounts.google',
  'oauth',
];

function isUnsafePath(path: string | null | undefined) {
  if (!path) return true;
  const lower = path.toLowerCase();
  return UNSAFE_BACK_PATHS.some((part) => lower.includes(part));
}

/**
 * Back control that never pops into login/OAuth history.
 * After Google Connect, browser history often includes auth pages — router.back()
 * would drop users on login. We always return to the explicit parent route.
 */
export function ScreenBackButton({
  fallbackHref = '/(tabs)',
  accessibilityLabel = 'Back',
  style,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    btn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.line,
      marginBottom: 4,
    },
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        // Always go to the parent screen. Do not use router.back() — after
        // calendar OAuth redirects, history can point at login / Google auth.
        if (isUnsafePath(pathname) || pathname === fallbackHref) {
          router.replace(fallbackHref as any);
          return;
        }
        router.replace(fallbackHref as any);
      }}
      style={[styles.btn, style]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.ink} />
    </Pressable>
  );
}
