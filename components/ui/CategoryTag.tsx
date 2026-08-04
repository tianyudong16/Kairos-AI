import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { fonts, radii } from '@/constants/theme';

export function CategoryTag({ category }: { category: string }) {
  const { getCategory } = useApp();
  const meta = getCategory(category);
  return (
    <View style={[styles.tag, { backgroundColor: meta.color }]}>
      <Text style={styles.label}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
