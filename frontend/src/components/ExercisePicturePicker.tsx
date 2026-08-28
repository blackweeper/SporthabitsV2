import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { spacing, withAlpha } from '@/src/theme';
import { useTheme } from '@/src/themes';
import GlassCard from '@/src/components/ui/GlassCard';
import { EXERCISE_ICONS } from '@/src/data/exercise-icons';

type Props = {
  visible: boolean;
  currentPhoto?: string | null;
  currentIconKey?: string | null;
  onClose: () => void;
  onPick: (payload: { photoBase64?: string | null; iconKey?: string | null }) => void;
};

const CATEGORIES: { key: any; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Jambes' },
  { key: 'core', label: 'Core' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'stretch', label: 'Étirement' },
  { key: 'other', label: 'Autre' },
];

export default function ExercisePicturePicker({
  visible,
  currentPhoto,
  currentIconKey,
  onClose,
  onPick,
}: Props) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === 'glass';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<any>('all');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_ICONS.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false;
      if (!q) return true;
      return (
        i.label.toLowerCase().includes(q) ||
        i.keywords.some((k) => k.includes(q))
      );
    });
  }, [query, cat]);

  async function pickPhoto(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission requise',
        fromCamera
          ? "Autorise l'accès à la caméra pour photographier l'exercice."
          : "Autorise l'accès aux photos pour choisir une image.",
      );
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.85,
        });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      const m = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 400 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      if (m.base64) {
        onPick({ photoBase64: m.base64, iconKey: null });
        onClose();
      }
    } catch {
      Alert.alert('Erreur', "Impossible de traiter cette image.");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[
            styles.sheet,
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Photo de l&apos;exercice</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.colors.onSurface} />
            </Pressable>
          </View>

          {/* Photo actions */}
          <View style={styles.photoRow}>
            <Pressable
              testID="photo-camera-ex"
              style={[
                styles.photoBtn,
                {
                  borderRadius: theme.radius.md,
                  borderColor: theme.colors.brand,
                  backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                },
              ]}
              onPress={() => pickPhoto(true)}
            >
              <Ionicons name="camera" size={16} color={theme.colors.brand} />
              <Text style={[styles.photoBtnText, { color: theme.colors.brand }]}>Caméra</Text>
            </Pressable>
            <Pressable
              testID="photo-gallery-ex"
              style={[
                styles.photoBtn,
                {
                  borderRadius: theme.radius.md,
                  borderColor: theme.colors.brand,
                  backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                },
              ]}
              onPress={() => pickPhoto(false)}
            >
              <Ionicons name="images" size={16} color={theme.colors.brand} />
              <Text style={[styles.photoBtnText, { color: theme.colors.brand }]}>Galerie</Text>
            </Pressable>
            {(currentPhoto || currentIconKey) && (
              <Pressable
                testID="photo-clear-ex"
                style={[
                  styles.photoBtnDanger,
                  { borderRadius: theme.radius.md, borderColor: theme.colors.error },
                ]}
                onPress={() => {
                  onPick({ photoBase64: null, iconKey: null });
                  onClose();
                }}
              >
                <Ionicons name="trash" size={16} color={theme.colors.error} />
                <Text style={[styles.photoBtnText, { color: theme.colors.error }]}>
                  Retirer
                </Text>
              </Pressable>
            )}
          </View>

          {currentPhoto ? (
            <View style={styles.currentPhotoBox}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${currentPhoto}` }}
                style={[styles.currentPhoto, { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceTertiary }]}
              />
              <Text style={[styles.currentPhotoLabel, { color: theme.colors.onSurfaceTertiary }]}>Photo actuelle</Text>
            </View>
          ) : null}

          <Text style={[styles.libLabel, { color: theme.colors.onSurfaceTertiary }]}>OU CHOISIR UNE ICÔNE</Text>

          <TextInput
            testID="icon-search"
            style={[
              styles.search,
              {
                borderRadius: theme.radius.md,
                backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                borderColor: theme.colors.border,
                color: theme.colors.onSurface,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher (pompes, squat, curl…)"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catsRow}
          >
            {CATEGORIES.map((c) => {
              const active = cat === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCat(c.key)}
                  style={[
                    styles.catChip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                      borderColor: theme.colors.border,
                    },
                    active &&
                      (isGlass
                        ? { backgroundColor: withAlpha(theme.colors.brand, 22), borderColor: withAlpha(theme.colors.brand, 50) }
                        : { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }),
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      { color: theme.colors.onSurfaceTertiary },
                      active && { color: isGlass ? theme.colors.brand : '#fff' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={{ maxHeight: 300 }}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {list.map((icon) => {
              const active = currentIconKey === icon.key;
              return (
                <Pressable
                  key={icon.key}
                  testID={`icon-${icon.key}`}
                  style={[
                    styles.iconTile,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                      borderColor: theme.colors.border,
                    },
                    active &&
                      (isGlass
                        ? { backgroundColor: withAlpha(theme.colors.brand, 16), borderColor: withAlpha(theme.colors.brand, 55) }
                        : { backgroundColor: theme.colors.brandTertiary, borderColor: theme.colors.brand }),
                  ]}
                  onPress={() => {
                    onPick({ photoBase64: null, iconKey: icon.key });
                    onClose();
                  }}
                >
                  <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                  <Text style={[styles.iconLabel, { color: theme.colors.onSurfaceSecondary }]} numberOfLines={1}>
                    {icon.label}
                  </Text>
                </Pressable>
              );
            })}
            {list.length === 0 && (
              <Text style={[styles.noResults, { color: theme.colors.onSurfaceTertiary }]}>Aucune icône trouvée</Text>
            )}
          </ScrollView>
          {Platform.OS === 'ios' && <View style={{ height: 16 }} />}
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 17, fontWeight: '800' },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  photoBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  currentPhotoBox: {
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  currentPhoto: {
    width: 120,
    height: 120,
  },
  currentPhotoLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  libLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
    marginBottom: 6,
  },
  search: {
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  catsRow: { gap: 6, paddingBottom: spacing.sm },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  catText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: spacing.md,
  },
  iconTile: {
    width: 74,
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconEmoji: { fontSize: 28 },
  iconLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  noResults: {
    padding: spacing.lg,
    textAlign: 'center',
    width: '100%',
  },
});
