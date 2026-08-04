import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, priorityMeta, radii } from '@/constants/theme';
import type { Priority } from '@/context/AppContext';

const order: Priority[] = ['high', 'medium', 'low'];

export function PriorityTag({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange?: (next: Priority) => void;
}) {
  const meta = priorityMeta[priority];

  if (!onChange) {
    return (
      <View style={[styles.tag, { backgroundColor: meta.color }]}>
        <Text style={styles.label}>{meta.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {order.map((value) => {
        const active = value === priority;
        const tone = priorityMeta[value];
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Set priority ${value}`}
            onPress={() => onChange(value)}
            style={[
              styles.choice,
              {
                backgroundColor: active ? tone.color : tone.soft,
                borderColor: tone.color,
              },
            ]}
          >
            <Text style={[styles.choiceLabel, { color: active ? '#fff' : tone.color }]}>
              {tone.label}
            </Text>
          </Pressable>
        );
      })}
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
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choice: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  choiceLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
