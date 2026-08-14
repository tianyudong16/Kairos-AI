import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ViewStyle } from 'react-native';

import { useTheme, useThemedStyles } from '@/constants/theme';

type Props = {
  /** Fallback when there is no navigation history */
  fallbackHref?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function ScreenBackButton({
  fallbackHref = '/(tabs)',
  accessibilityLabel = 'Back',
  style,
}: Props) {
  const router = useRouter();
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
        if (router.canGoBack()) {
          router.back();
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
