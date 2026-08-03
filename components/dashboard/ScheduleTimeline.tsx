import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Task } from '@/context/AppContext';
import { categoryMeta, colors, fonts, radii } from '@/constants/theme';

const iconMap = {
  run: 'walk-outline',
  code: 'logo-react',
  people: 'people-outline',
  food: 'restaurant-outline',
  mail: 'mail-outline',
  book: 'book-outline',
} as const;

export function ScheduleTimeline({ tasks }: { tasks: Task[] }) {
  return (
    <View style={styles.wrap}>
      {tasks.map((task, index) => {
        const meta = categoryMeta[task.category];
        return (
          <Animated.View
            key={task.id}
            entering={FadeInDown.delay(index * 60).springify()}
            style={styles.row}
          >
            <View style={styles.timeCol}>
              <Text style={styles.time}>{task.start}</Text>
              <View style={[styles.rail, { backgroundColor: meta.color }]} />
            </View>
            <View style={[styles.card, { backgroundColor: meta.soft }]}>
              <View style={[styles.accent, { backgroundColor: meta.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Ionicons
                    name={iconMap[task.icon] as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={meta.color}
                  />
                  <Text style={styles.title}>{task.title}</Text>
                </View>
                <Text style={styles.meta}>
                  {task.start} – {task.end}
                </Text>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  timeCol: {
    width: 48,
    alignItems: 'center',
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  rail: {
    width: 2,
    flex: 1,
    borderRadius: 2,
    opacity: 0.45,
  },
  card: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 64,
  },
  accent: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginLeft: 26,
  },
});
