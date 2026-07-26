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
import { colors, radius, spacing } from '@/src/theme';
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
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Photo de l&apos;exercice</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Photo actions */}
          <View style={styles.photoRow}>
            <Pressable
              testID="photo-camera-ex"
              style={styles.photoBtn}
              onPress={() => pickPhoto(true)}
            >
              <Ionicons name="camera" size={16} color={colors.brand} />
              <Text style={styles.photoBtnText}>Caméra</Text>
            </Pressable>
            <Pressable
              testID="photo-gallery-ex"
              style={styles.photoBtn}
              onPress={() => pickPhoto(false)}
            >
              <Ionicons name="images" size={16} color={colors.brand} />
              <Text style={styles.photoBtnText}>Galerie</Text>
            </Pressable>
            {(currentPhoto || currentIconKey) && (
              <Pressable
                testID="photo-clear-ex"
                style={styles.photoBtnDanger}
                onPress={() => {
                  onPick({ photoBase64: null, iconKey: null });
                  onClose();
                }}
              >
                <Ionicons name="trash" size={16} color={colors.error} />
                <Text style={[styles.photoBtnText, { color: colors.error }]}>
                  Retirer
                </Text>
              </Pressable>
            )}
          </View>

          {currentPhoto ? (
            <View style={styles.currentPhotoBox}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${currentPhoto}` }}
                style={styles.currentPhoto}
              />
              <Text style={styles.currentPhotoLabel}>Photo actuelle</Text>
            </View>
          ) : null}

          <Text style={styles.libLabel}>OU CHOISIR UNE ICÔNE</Text>

          <TextInput
            testID="icon-search"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher (pompes, squat, curl…)"
            placeholderTextColor={colors.onSurfaceTertiary}
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
                  style={[styles.catChip, active && styles.catChipActive]}
                >
                  <Text
                    style={[
                      styles.catText,
                      active && { color: '#fff' },
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
                  style={[styles.iconTile, active && styles.iconTileActive]}
                  onPress={() => {
                    onPick({ photoBase64: null, iconKey: icon.key });
                    onClose();
                  }}
                >
                  <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                  <Text style={styles.iconLabel} numberOfLines={1}>
                    {icon.label}
                  </Text>
                </Pressable>
              );
            })}
            {list.length === 0 && (
              <Text style={styles.noResults}>Aucune icône trouvée</Text>
            )}
          </ScrollView>
          {Platform.OS === 'ios' && <View style={{ height: 16 }} />}
        </View>
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
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: '800' },
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
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceTertiary,
  },
  photoBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    color: colors.brand,
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
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  currentPhotoLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  libLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
    marginBottom: 6,
  },
  search: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  catsRow: { gap: 6, paddingBottom: spacing.sm },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  catText: {
    color: colors.onSurfaceTertiary,
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
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  iconTileActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
  },
  iconEmoji: { fontSize: 28 },
  iconLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  noResults: {
    color: colors.onSurfaceTertiary,
    padding: spacing.lg,
    textAlign: 'center',
    width: '100%',
  },
});
