import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CategoryEditModal } from '@/components/ui/CategoryEditModal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { colors, fonts, radii } from '@/constants/theme';
import { normalizeTimeInput } from '@/lib/schedule';

const wakeOptions = ['5:30', '6:30', '7:00', '7:30', '8:00', '9:00', '10:00'];
const bedOptions = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '0:00', '1:00'];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    sleep,
    setSleep,
    chronotype,
    setChronotype,
    optimizeSchedule,
    selectedDate,
    categories,
    user,
  } = useApp();

  const wakeIsPreset = useMemo(
    () => wakeOptions.includes(sleep.wakeTime),
    [sleep.wakeTime]
  );
  const bedIsPreset = useMemo(
    () => bedOptions.includes(sleep.bedtime),
    [sleep.bedtime]
  );

  const [customWake, setCustomWake] = useState(!wakeIsPreset);
  const [customBed, setCustomBed] = useState(!bedIsPreset);
  const [wakeDraft, setWakeDraft] = useState(sleep.wakeTime);
  const [bedDraft, setBedDraft] = useState(sleep.bedtime);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [bedError, setBedError] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>Kairos AI</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Personalize sleep, chronotype, and categories — schedule adapts around your capacity.
      </Text>

      <Pressable onPress={() => router.push('/profile')} style={styles.profileLink}>
        <View style={styles.profileIcon}>
          <Ionicons name="person-outline" size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name || 'Your profile'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'Open account'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>

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
          const selected = !customWake && sleep.wakeTime === time;
          return (
            <Pressable
              key={time}
              onPress={() => {
                setCustomWake(false);
                setWakeError(null);
                setWakeDraft(time);
                setSleep({ ...sleep, wakeTime: time });
              }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {time}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            setCustomWake(true);
            setWakeDraft(wakeIsPreset ? '' : sleep.wakeTime);
          }}
          style={[styles.chip, styles.otherChip, customWake && styles.otherChipSelected]}
        >
          <Text style={[styles.chipText, customWake && styles.otherTextSelected]}>
            Other
          </Text>
        </Pressable>
      </View>
      {customWake ? (
        <View style={styles.customBox}>
          <TextInput
            value={wakeDraft}
            onChangeText={(value) => {
              setWakeDraft(value);
              const normalized = normalizeTimeInput(value);
              if (!normalized) {
                setWakeError('Use 7:30, 7:30am, or 19:00');
                return;
              }
              setWakeError(null);
              setSleep({ ...sleep, wakeTime: normalized });
            }}
            placeholder="e.g. 6:45am"
            placeholderTextColor={colors.inkMuted}
            style={styles.customInput}
            autoCapitalize="none"
          />
          {wakeError ? <Text style={styles.error}>{wakeError}</Text> : null}
        </View>
      ) : null}

      <Text style={styles.section}>Bedtime</Text>
      <View style={styles.chipRow}>
        {bedOptions.map((time) => {
          const selected = !customBed && sleep.bedtime === time;
          return (
            <Pressable
              key={time}
              onPress={() => {
                setCustomBed(false);
                setBedError(null);
                setBedDraft(time);
                setSleep({ ...sleep, bedtime: time });
              }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {time}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            setCustomBed(true);
            setBedDraft(bedIsPreset ? '' : sleep.bedtime);
          }}
          style={[styles.chip, styles.otherChip, customBed && styles.otherChipSelected]}
        >
          <Text style={[styles.chipText, customBed && styles.otherTextSelected]}>
            Other
          </Text>
        </Pressable>
      </View>
      {customBed ? (
        <View style={styles.customBox}>
          <TextInput
            value={bedDraft}
            onChangeText={(value) => {
              setBedDraft(value);
              const normalized = normalizeTimeInput(value);
              if (!normalized) {
                setBedError('Use 11pm, 23:00, or 0:30');
                return;
              }
              setBedError(null);
              setSleep({ ...sleep, bedtime: normalized });
            }}
            placeholder="e.g. 11:15pm"
            placeholderTextColor={colors.inkMuted}
            style={styles.customInput}
            autoCapitalize="none"
          />
          {bedError ? <Text style={styles.error}>{bedError}</Text> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current sleep window</Text>
        <Text style={styles.cardBody}>
          Wake {sleep.wakeTime} · Bed {sleep.bedtime}
        </Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={[styles.section, styles.sectionInline]}>Categories</Text>
        <Pressable
          onPress={() => {
            setEditingCategoryId(null);
            setCategoryModalOpen(true);
          }}
        >
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>
      <Text style={styles.catHint}>
        Add custom categories or change colors. Tap a chip to edit it.
      </Text>
      <View style={styles.chipRow}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setEditingCategoryId(cat.id);
              setCategoryModalOpen(true);
            }}
            style={[
              styles.catChip,
              { backgroundColor: cat.soft, borderColor: cat.color },
            ]}
          >
            <View style={[styles.catDot, { backgroundColor: cat.color }]} />
            <Text style={[styles.catChipText, { color: cat.color }]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setEditingCategoryId(null);
            setCategoryModalOpen(true);
          }}
          style={styles.addCatChip}
        >
          <Text style={styles.addCatText}>+ Add</Text>
        </Pressable>
      </View>

      <PrimaryButton
        label="Re-pack selected day around sleep"
        onPress={() => optimizeSchedule(selectedDate)}
      />

      <CategoryEditModal
        visible={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategoryId(null);
        }}
        initialCategoryId={editingCategoryId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 24 },
  brand: { fontFamily: fonts.brandItalic, fontSize: 24, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgElevated,
    padding: 12,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontFamily: fonts.semibold, color: colors.ink },
  profileEmail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionInline: {
    marginTop: 0,
  },
  editLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.energy,
  },
  catHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  addCatChip: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  addCatText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkSoft,
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
  otherChip: {
    borderStyle: 'dashed',
    borderColor: colors.energy,
    backgroundColor: colors.lifeSoft,
  },
  otherChipSelected: {
    backgroundColor: colors.energy,
    borderStyle: 'solid',
    borderColor: colors.energy,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  chipTextSelected: { color: colors.white },
  otherTextSelected: { color: colors.white, fontFamily: fonts.semibold },
  customBox: { gap: 6 },
  customInput: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.energy,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.alert },
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
