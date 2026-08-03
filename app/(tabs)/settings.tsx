import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';

const wakeOptions = ['5:30', '6:30', '7:00', '7:30', '8:00', '9:00', '10:00'];
const bedOptions = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '0:00', '1:00'];

export default function SettingsScreen() {
  const {
    sleep,
    setSleep,
    chronotype,
    setChronotype,
    optimizeSchedule,
    selectedDate,
  } = useApp();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.brand}>Kairos AI</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Personalize sleep and chronotype — schedule adapts around your capacity.
      </Text>

      <Text style={styles.section}>Chronotype</Text>
      <View style={styles.chipRow}>
        {(
          [
            ['early-bird', 'Early Bird'],
            ['morning', 'Morning'],
            ['mid-morning', 'Mid-Morning'],
            ['night-owl', 'Night Owl'],
          ] as const
        ).map(([id, label]) => {
          const selected = chronotype === id;
          return (
            <Pressable
              key={id}
              onPress={() => setChronotype(id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Wake time</Text>
      <View style={styles.chipRow}>
        {wakeOptions.map((time) => {
          const selected = sleep.wakeTime === time;
          return (
            <Pressable
              key={time}
              onPress={() => setSleep({ ...sleep, wakeTime: time })}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {time}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Bedtime</Text>
      <View style={styles.chipRow}>
        {bedOptions.map((time) => {
          const selected = sleep.bedtime === time;
          return (
            <Pressable
              key={time}
              onPress={() => setSleep({ ...sleep, bedtime: time })}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {time}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current sleep window</Text>
        <Text style={styles.cardBody}>
          Wake {sleep.wakeTime} · Bed {sleep.bedtime}
        </Text>
      </View>

      <PrimaryButton
        label="Re-pack selected day around sleep"
        onPress={() => optimizeSchedule(selectedDate)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 24 },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  chipTextSelected: { color: colors.white },
  card: {
    marginTop: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.lifeSoft,
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontFamily: fonts.semibold, color: colors.ink },
  cardBody: { fontFamily: fonts.body, color: colors.inkSoft },
});
