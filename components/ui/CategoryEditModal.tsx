import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { fonts, radii, useTheme, useThemedStyles } from '@/constants/theme';
import { CATEGORY_COLOR_PRESETS, CategoryDef } from '@/lib/schedule';

type Mode = 'list' | 'edit' | 'create';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** When opening directly to edit a category */
  initialCategoryId?: string | null;
  onSelectCategory?: (id: string) => void;
};

export function CategoryEditModal({
  visible,
  onClose,
  initialCategoryId = null,
  onSelectCategory,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(18, 16, 14, 0.45)',
      justifyContent: 'center' as const,
      padding: 20,
    },
    sheet: {
      maxHeight: '85%',
      borderRadius: radii.xl,
      backgroundColor: c.bgElevated,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: c.lineStrong,
      ...Platform.select({
        web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' },
        default: {
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
      }),
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: c.ink,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.line,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.inkMuted,
      lineHeight: 18,
    },
    list: { maxHeight: 320 },
    listContent: { gap: 8, paddingBottom: 4 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      borderRadius: radii.md,
      borderWidth: 1.5,
      padding: 12,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    rowLabel: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: c.ink,
    },
    rowHint: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: c.inkMuted,
    },
    useBtn: {
      borderRadius: radii.pill,
      backgroundColor: c.ink,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    useText: {
      color: c.white,
      fontFamily: fonts.semibold,
      fontSize: 11,
    },
    fieldLabel: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.inkSoft,
    },
    input: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.bg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.body,
      fontSize: 15,
      color: c.ink,
    },
    palette: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
    },
    colorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: c.ink,
    },
    preview: {
      borderRadius: radii.md,
      borderWidth: 1.5,
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    previewPill: {
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    previewPillText: {
      color: c.white,
      fontFamily: fonts.bold,
      fontSize: 12,
      letterSpacing: 0.5,
    },
    previewHint: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.inkMuted,
    },
    error: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.alert,
    },
    actions: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: c.ink,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondaryText: {
      fontFamily: fonts.semibold,
      color: c.ink,
    },
    primaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.pill,
      backgroundColor: c.black,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primaryBtnFull: {
      minHeight: 48,
      borderRadius: radii.pill,
      backgroundColor: c.black,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 6,
    },
    primaryText: {
      fontFamily: fonts.semibold,
      color: c.white,
    },
    deleteBtn: {
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    deleteText: {
      fontFamily: fonts.semibold,
      color: c.alert,
      fontSize: 13,
    },
  }));
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(CATEGORY_COLOR_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialCategoryId) {
      const cat = categories.find((c) => c.id === initialCategoryId);
      if (cat) {
        setMode('edit');
        setEditingId(cat.id);
        setLabel(cat.label);
        setColor(cat.color);
        setError(null);
        return;
      }
    }
    setMode('list');
    setEditingId(null);
    setLabel('');
    setColor(CATEGORY_COLOR_PRESETS[0]);
    setError(null);
    // Intentionally omit `categories` — avoid resetting the form after create/save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCategoryId]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setLabel('');
    setColor(CATEGORY_COLOR_PRESETS[categories.length % CATEGORY_COLOR_PRESETS.length]);
    setError(null);
  };

  const openEdit = (cat: CategoryDef) => {
    setMode('edit');
    setEditingId(cat.id);
    setLabel(cat.label);
    setColor(cat.color);
    setError(null);
  };

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Give this category a name');
      return;
    }
    if (mode === 'create') {
      const created = addCategory({ label: trimmed, color });
      onSelectCategory?.(created.id);
      setMode('list');
      return;
    }
    if (mode === 'edit' && editingId) {
      updateCategory(editingId, { label: trimmed, color });
      setMode('list');
    }
  };

  const editing = editingId
    ? categories.find((c) => c.id === editingId)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'list'
                ? 'Categories'
                : mode === 'create'
                  ? 'New category'
                  : 'Edit category'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {mode === 'list' ? (
            <>
              <Text style={styles.subtitle}>
                Tap a category to edit its name or color. Add your own when you need more.
              </Text>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => openEdit(cat)}
                    style={[styles.row, { borderColor: cat.color, backgroundColor: cat.soft }]}
                  >
                    <View style={[styles.swatch, { backgroundColor: cat.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{cat.label}</Text>
                      <Text style={styles.rowHint}>
                        {cat.builtIn ? 'Built-in · tap to recolor' : 'Custom · tap to edit'}
                      </Text>
                    </View>
                    {onSelectCategory ? (
                      <Pressable
                        onPress={() => {
                          onSelectCategory(cat.id);
                          onClose();
                        }}
                        style={styles.useBtn}
                      >
                        <Text style={styles.useText}>Use</Text>
                      </Pressable>
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={openCreate} style={styles.primaryBtnFull}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.primaryText}>Add category</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Creative, Errands, Family"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                autoCapitalize="characters"
              />
              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.palette}>
                {CATEGORY_COLOR_PRESETS.map((preset) => {
                  const selected = color.toLowerCase() === preset.toLowerCase();
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setColor(preset)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: preset },
                        selected && styles.colorDotSelected,
                      ]}
                    />
                  );
                })}
              </View>
              <View style={[styles.preview, { backgroundColor: softFromPreview(color), borderColor: color }]}>
                <View style={[styles.previewPill, { backgroundColor: color }]}>
                  <Text style={styles.previewPillText}>
                    {(label.trim() || 'CATEGORY').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.previewHint}>Preview</Text>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => setMode('list')}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable onPress={save} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>
                    {mode === 'create' ? 'Create' : 'Save'}
                  </Text>
                </Pressable>
              </View>

              {mode === 'edit' && editing && !editing.builtIn ? (
                <Pressable
                  onPress={() => {
                    deleteCategory(editing.id);
                    setMode('list');
                  }}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>Delete category</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function softFromPreview(hex: string) {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '#F3F0E8';
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.round(c + (255 - c) * 0.82)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}
