import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PriorityTag } from '@/components/ui/PriorityTag';
import type { Priority, Task } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';

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
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: { gap: 12 },
    empty: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bgElevated,
      padding: 16,
      gap: 4,
    },
    emptyTitle: { fontFamily: fonts.semibold, color: c.ink },
    emptyBody: { fontFamily: fonts.body, color: c.inkMuted, fontSize: 13 },
    row: { flexDirection: 'row' as const, gap: 12, alignItems: 'stretch' as const },
    timeCol: { width: 48, alignItems: 'center' as const },
    time: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
      marginBottom: 6,
    },
    rail: { width: 3, flex: 1, borderRadius: 2, opacity: 0.7 },
    card: {
      flex: 1,
      borderRadius: radii.md,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
      minHeight: 64,
      borderWidth: 1,
    },
    accent: { width: 6 },
    cardBody: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center' as const,
      gap: 6,
    },
    titleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    title: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    catPill: {
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    catText: {
      color: c.white,
      fontFamily: fonts.bold,
      fontSize: 10,
      letterSpacing: 0.4,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.inkSoft,
    },
    actions: { flexDirection: 'row' as const, gap: 8, marginTop: 2 },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.line,
    },
  }));

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
