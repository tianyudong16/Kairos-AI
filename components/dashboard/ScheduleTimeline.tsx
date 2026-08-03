import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

type Props = {
  tasks: Task[];
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function ScheduleTimeline({ tasks, onMoveUp, onMoveDown, onDelete }: Props) {
  return (
    <View style={styles.wrap}>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>Tap + to add tasks with AI or manually.</Text>
        </View>
      ) : null}
      {tasks.map((task, index) => {
        const meta = categoryMeta[task.category];
        return (
          <Animated.View
            key={task.id}
            entering={FadeInDown.delay(index * 40).springify()}
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
                  {task.start} – {task.end} · {task.priority.toUpperCase()}
                </Text>
                {(onMoveUp || onMoveDown || onDelete) && (
                  <View style={styles.actions}>
                    {onMoveUp ? (
                      <Pressable onPress={() => onMoveUp(task.id)} style={styles.actionBtn}>
                        <Ionicons name="arrow-up" size={16} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {onMoveDown ? (
                      <Pressable onPress={() => onMoveDown(task.id)} style={styles.actionBtn}>
                        <Ionicons name="arrow-down" size={16} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {onDelete ? (
                      <Pressable onPress={() => onDelete(task.id)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.alert} />
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  empty: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    padding: 16,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 13,
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
  accent: { width: 5 },
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
    flex: 1,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginLeft: 26,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginLeft: 26,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
