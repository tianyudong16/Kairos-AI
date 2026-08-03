import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PriorityTag } from '@/components/ui/PriorityTag';
import type { Priority, Task } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

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
  onPriority?: (id: string, priority: Priority) => void;
};

export function ScheduleTimeline({
  tasks,
  onMoveUp,
  onMoveDown,
  onDelete,
  onPriority,
}: Props) {
  const { getCategory } = useApp();
  return (
    <View style={styles.wrap}>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>Tap + to add tasks with AI or manually.</Text>
        </View>
      ) : null}
      {tasks.map((task, index) => {
        const meta = getCategory(task.category);
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
            <View
              style={[
                styles.card,
                { backgroundColor: meta.soft, borderColor: meta.color },
              ]}
            >
              <View style={[styles.accent, { backgroundColor: meta.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Ionicons
                    name={iconMap[task.icon] as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={meta.color}
                  />
                  <Text style={styles.title}>{task.title}</Text>
                  <View style={[styles.catPill, { backgroundColor: meta.color }]}>
                    <Text style={styles.catText}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {task.start} – {task.end}
                </Text>
                {onPriority ? (
                  <PriorityTag
                    priority={task.priority}
                    onChange={(next) => onPriority(task.id, next)}
                  />
                ) : (
                  <PriorityTag priority={task.priority} />
                )}
                {(onMoveUp || onMoveDown || onDelete) && (
                  <View style={styles.actions}>
                    {onMoveUp ? (
                      <Pressable
                        accessibilityLabel="Move up"
                        onPress={() => onMoveUp(task.id)}
                        style={styles.actionBtn}
                      >
                        <Ionicons name="arrow-up" size={16} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {onMoveDown ? (
                      <Pressable
                        accessibilityLabel="Move down"
                        onPress={() => onMoveDown(task.id)}
                        style={styles.actionBtn}
                      >
                        <Ionicons name="arrow-down" size={16} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {onDelete ? (
                      <Pressable
                        accessibilityLabel="Delete"
                        onPress={() => onDelete(task.id)}
                        style={styles.actionBtn}
                      >
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
  emptyTitle: { fontFamily: fonts.semibold, color: colors.ink },
  emptyBody: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  timeCol: { width: 48, alignItems: 'center' },
  time: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  rail: { width: 3, flex: 1, borderRadius: 2, opacity: 0.7 },
  card: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 64,
    borderWidth: 1,
  },
  accent: { width: 6 },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  catPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
