import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { fonts, useThemedStyles } from '@/constants/theme';

export default function NotFoundScreen() {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 20,
      backgroundColor: c.bg,
    },
    title: {
      fontSize: 20,
      fontFamily: fonts.bold,
      color: c.ink,
    },
    link: {
      marginTop: 16,
      paddingVertical: 12,
    },
    linkText: {
      fontSize: 15,
      fontFamily: fonts.medium,
      color: c.coach,
    },
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn’t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}
