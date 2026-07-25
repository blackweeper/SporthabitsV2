import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing } from "@/src/theme";
import {
  deleteMeasurement,
  getMeasurement,
  Measurement,
  saveMeasurement,
  uid,
} from "@/src/utils/gym-storage";

export default function MeasurementEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [m, setM] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (isNew) {
        setM({
          id: uid(),
          date: new Date().toISOString(),
          weight_kg: null,
          waist_cm: null,
          thigh_cm: null,
          chest_cm: null,
          photoBase64: null,
          notes: null,
        });
      } else {
        setM(await getMeasurement(id!));
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = <K extends keyof Measurement>(k: K, v: Measurement[K]) => {
    if (!m) return;
    setM({ ...m, [k]: v });
  };

  async function pickPhoto(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.5,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.5,
          base64: true,
        });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if (asset.base64) set("photoBase64", asset.base64);
  }

  const save = async () => {
    if (!m) return;
    await saveMeasurement(m);
    router.back();
  };

  const remove = async () => {
    if (!m || isNew) return;
    const doDelete = async () => {
      await deleteMeasurement(m.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Supprimer cette mesure ?")) doDelete();
      return;
    }
    Alert.alert("Supprimer cette mesure ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: doDelete },
    ]);
  };

  if (loading || !m) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-measurement"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>
          {isNew ? "Nouvelle mesure" : "Modifier mesure"}
        </Text>
        <Pressable testID="save-measurement" onPress={save} hitSlop={12}>
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateCard}>
            <Ionicons name="calendar" size={16} color={colors.brand} />
            <Text style={styles.dateText}>{formatDate(m.date)}</Text>
            <Pressable
              testID="today-btn"
              onPress={() => set("date", new Date().toISOString())}
            >
              <Text style={styles.todayText}>AUJOURD&apos;HUI</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            <Field
              label="Poids (kg)"
              value={m.weight_kg}
              onChange={(v) => set("weight_kg", v)}
              testID="m-weight"
              icon="body"
            />
            <Field
              label="Tour de taille (cm)"
              value={m.waist_cm}
              onChange={(v) => set("waist_cm", v)}
              testID="m-waist"
              icon="resize"
            />
            <Field
              label="Tour de cuisse (cm)"
              value={m.thigh_cm}
              onChange={(v) => set("thigh_cm", v)}
              testID="m-thigh"
              icon="footsteps"
            />
            <Field
              label="Tour de poitrine (cm)"
              value={m.chest_cm}
              onChange={(v) => set("chest_cm", v)}
              testID="m-chest"
              icon="man"
            />
          </View>

          <Text style={styles.label}>Photo (comparaison)</Text>
          {m.photoBase64 ? (
            <View style={styles.photoBox}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${m.photoBase64}` }}
                style={styles.photoLarge}
              />
              <Pressable
                testID="remove-photo"
                style={styles.removePhoto}
                onPress={() => set("photoBase64", null)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <Pressable
                testID="photo-camera"
                style={styles.photoBtn}
                onPress={() => pickPhoto(true)}
              >
                <Ionicons name="camera" size={18} color={colors.brand} />
                <Text style={styles.photoBtnText}>PRENDRE</Text>
              </Pressable>
              <Pressable
                testID="photo-gallery"
                style={styles.photoBtn}
                onPress={() => pickPhoto(false)}
              >
                <Ionicons name="images" size={18} color={colors.brand} />
                <Text style={styles.photoBtnText}>GALERIE</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            testID="m-notes"
            style={styles.notesInput}
            value={m.notes || ""}
            onChangeText={(t) => set("notes", t.trim() ? t : null)}
            placeholder="Ex: Après vacances, prise de masse…"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />

          {!isNew && (
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={styles.deleteText}>Supprimer cette mesure</Text>
            </Pressable>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  testID,
  icon,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  testID?: string;
  icon: any;
}) {
  return (
    <View style={styles.fieldBox}>
      <View style={styles.fieldTop}>
        <Ionicons name={icon} size={12} color={colors.brand} />
        <Text style={styles.miniLabel}>{label}</Text>
      </View>
      <TextInput
        testID={testID}
        style={styles.input}
        value={value == null ? "" : String(value)}
        onChangeText={(t) => {
          if (t.trim() === "") return onChange(null);
          const n = parseFloat(t.replace(",", "."));
          if (!isNaN(n)) onChange(n);
        }}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.onSurfaceTertiary}
      />
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    color: colors.onSurface,
    fontWeight: "600",
    flex: 1,
    textTransform: "capitalize",
  },
  todayText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  grid: { gap: spacing.md },
  fieldBox: { gap: 6 },
  fieldTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    fontWeight: "600",
  },
  photoActions: { flexDirection: "row", gap: spacing.md },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  photoBtnText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.5 },
  photoBox: { position: "relative" },
  photoLarge: {
    width: "100%",
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  removePhoto: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: "top",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  deleteText: { color: colors.error, fontWeight: "700" },
});
