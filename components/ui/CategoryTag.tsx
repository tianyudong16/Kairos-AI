import { Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { fonts, radii, useThemedStyles } from '@/constants/theme';

export function CategoryTag({ category }: { category: string }) {
  const { getCategory } = useApp();
  const meta = getCategory(category);
  const styles = useThemedStyles((colors) => ({
    tag: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    label: {
      color: colors.white,
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.6,
    },
  }));

  return (
    <View style={[styles.tag, { backgroundColor: meta.color }]}>
      <Text style={styles.label}>{meta.label}</Text>
    </View>
  );
}
