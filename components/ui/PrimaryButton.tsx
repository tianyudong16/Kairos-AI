import { Platform, Pressable, Text, ViewStyle } from 'react-native';

import { fonts, radii, useThemedStyles } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  style,
}: Props) {
  const styles = useThemedStyles((colors) => ({
    base: {
      minHeight: 54,
      borderRadius: radii.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 22,
      ...Platform.select({
        web: { cursor: 'pointer' } as object,
        default: {},
      }),
    },
    primary: {
      backgroundColor: colors.today,
    },
    secondary: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1.5,
      borderColor: colors.work,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    label: {
      fontFamily: fonts.semibold,
      fontSize: 16,
      letterSpacing: 0.2,
    },
    primaryLabel: {
      color: colors.white,
    },
    secondaryLabel: {
      color: colors.ink,
    },
  }));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
