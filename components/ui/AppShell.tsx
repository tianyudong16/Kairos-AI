import { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, useThemedStyles } from '@/constants/theme';

type Props = {
  children: ReactNode;
  withTabBarPadding?: boolean;
  footer?: ReactNode;
};

export function AppShell({
  children,
  withTabBarPadding = false,
  footer,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 820;
  const styles = useThemedStyles((colors) => ({
    mobileRoot: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    desktopRoot: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.bgElevated,
      padding: 24,
      overflow: 'hidden' as const,
    },
    desktopAccentA: {
      position: 'absolute' as const,
      width: 420,
      height: 420,
      borderRadius: 210,
      backgroundColor: `${colors.coach}20`,
      top: -80,
      left: -60,
    },
    desktopAccentB: {
      position: 'absolute' as const,
      width: 380,
      height: 380,
      borderRadius: 190,
      backgroundColor: `${colors.energy}24`,
      bottom: -100,
      right: -40,
    },
    desktopFrame: {
      width: 420,
      maxWidth: '100%' as const,
      height: '100%' as const,
      maxHeight: 860,
      borderRadius: 36,
      overflow: 'hidden' as const,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      ...Platform.select({
        web: {
          boxShadow: '0 16px 40px rgba(6, 32, 38, 0.16)',
        },
        default: {
          shadowColor: colors.black,
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
        },
      }),
    },
    phone: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
    },
    phoneWide: {
      borderRadius: radii.xl,
    },
    body: {
      flex: 1,
    },
  }));

  const content = (
    <View
      style={[
        styles.phone,
        isWide && styles.phoneWide,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: footer
            ? 0
            : withTabBarPadding
              ? Math.max(insets.bottom, 12) + 88
              : Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.body}>{children}</View>
      {footer}
    </View>
  );

  if (!isWide) {
    return <View style={styles.mobileRoot}>{content}</View>;
  }

  return (
    <View style={styles.desktopRoot}>
      <View style={styles.desktopAccentA} />
      <View style={styles.desktopAccentB} />
      <View style={styles.desktopFrame}>{content}</View>
    </View>
  );
}
