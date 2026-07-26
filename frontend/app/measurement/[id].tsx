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
import * as ImageManipulator from "expo-image-manipulator";
import { colors, radius, spacing } from "@/src/theme";
import {
  deleteMeasurement,
  estimateBodyFatNavy,
  getMeasurement,
  getProfile,
  Measurement,
  saveMeasurement,
  Sex,
  uid,
} from "@/src/utils/gym-storage";

type FieldDef = {
  key: keyof Measurement;
  label: string;
  icon: any;
  hint?: string;
};

const CORE_FIELDS: FieldDef[] = [
  { key: "weight_kg", label: "Poids (kg)", icon: "body" },
  { key: "chest_cm", label: "Tour de poitrine (cm)", icon: "man" },
  { key: "waist_navel_cm", label: "Tour de taille · nombril (cm)", icon: "resize", hint: "Au niveau du nombril, utile pour le calcul de masse grasse" },
  { key: "hips_cm", label: "Tour de hanches (cm)", icon: "ellipse" },
  { key: "thigh_cm", label: "Tour de cuisse (cm)", icon: "footsteps" },
  { key: "calf_cm", label: "Tour de mollet (cm)", icon: "walk" },
  { key: "arm_cm", label: "Tour de bras (cm)", icon: "barbell" },
  { key: "forearm_cm", label: "Tour d'avant-bras (cm)", icon: "hand-left" },
  { key: "neck_cm", label: "Tour de cou (cm)", icon: "shirt" },
];

export default function MeasurementEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [m, setM] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSex, setProfileSex] = useState<Sex | null>(null);
  const [profileHeight, setProfileHeight] = useState<number | null>(null);
  const [bfMode, setBfMode] = useState<"manual" | "estimated">("estimated");

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfileSex(p.sex);
      setProfileHeight(p.height_cm);
      if (isNew) {
        setM({
          id: uid(),
          date: new Date().toISOString(),
          weight_kg: null,
          waist_cm: null,
          thigh_cm: null,
          chest_cm: null,
          neck_cm: null,
          hips_cm: null,
          arm_cm: null,
          forearm_cm: null,
          calf_cm: null,
          waist_navel_cm: null,
          body_fat_pct: null,
          photoBase64: null,
          notes: null,
        });
      } else {
        const loaded = await getMeasurement(id!);
        setM(loaded);
        // Prefer manual entry when a value is stored explicitly
        if (loaded?.body_fat_pct != null) setBfMode("manual");
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
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 900 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      if (manipulated.base64) set("photoBase64", manipulated.base64);
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible de traiter cette image. Essaie une autre photo.",
      );
    }
  }

  const save = async () => {
    if (!m) return;
    // If in estimated mode, compute BF% before saving
    let toSave = { ...m };
    if (bfMode === "estimated") {
      const bf = estimateBodyFatNavy({
        sex: profileSex,
        height_cm: profileHeight,
        waist_cm: m.waist_navel_cm ?? m.waist_cm,
        neck_cm: m.neck_cm,
        hips_cm: m.hips_cm,
      });
      toSave.body_fat_pct = bf;
    }
    await saveMeasurement(toSave);
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

  const estimatedBF = estimateBodyFatNavy({
    sex: profileSex,
    height_cm: profileHeight,
    waist_cm: m.waist_navel_cm ?? m.waist_cm,
    neck_cm: m.neck_cm,
    hips_cm: m.hips_cm,
  });

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

          <Text style={styles.label}>Mesures corporelles</Text>
          <View style={styles.grid}>
            {CORE_FIELDS.map((f) => (
              <Field
                key={f.key as string}
                label={f.label}
                value={m[f.key] as number | null}
                onChange={(v) => set(f.key, v as any)}
                testID={`m-${f.key as string}`}
                icon={f.icon}
                hint={f.hint}
              />
            ))}
          </View>

          {/* Body fat card */}
          <View style={styles.bfCard}>
            <View style={styles.bfHeader}>
              <Ionicons name="pulse" size={16} color={colors.brand} />
              <Text style={styles.bfTitle}>Pourcentage de masse grasse</Text>
            </View>

            <View style={styles.bfSegment}>
              <Pressable
                testID="bf-estimated"
                style={[
                  styles.bfSegBtn,
                  bfMode === "estimated" && styles.bfSegBtnActive,
                ]}
                onPress={() => setBfMode("estimated")}
              >
                <Text
                  style={[
                    styles.bfSegText,
                    bfMode === "estimated" && { color: "#fff" },
                  ]}
                >
                  ESTIMATION AUTO
                </Text>
              </Pressable>
              <Pressable
                testID="bf-manual"
                style={[
                  styles.bfSegBtn,
                  bfMode === "manual" && styles.bfSegBtnActive,
                ]}
                onPress={() => setBfMode("manual")}
              >
                <Text
                  style={[
                    styles.bfSegText,
                    bfMode === "manual" && { color: "#fff" },
                  ]}
                >
                  SAISIE MANUELLE
                </Text>
              </Pressable>
            </View>

            {bfMode === "estimated" ? (
              <>
                {estimatedBF != null ? (
                  <View style={styles.bfResultBox}>
                    <Text style={styles.bfBig}>{estimatedBF.toFixed(1)}%</Text>
                    <Text style={styles.bfHint}>
                      Méthode Navy · basée sur ton profil ({profileSex ?? "?"})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.bfMissing}>
                    <Text style={styles.bfMissingText}>
                      Pour l&apos;estimation auto, renseigne dans ton profil : sexe et taille.{"\n"}
                      Puis mesure : tour de cou, tour de taille (nombril)
                      {profileSex === "femme" ? " et tour de hanches." : "."}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View>
                <TextInput
                  testID="bf-manual-input"
                  style={styles.bfInput}
                  value={m.body_fat_pct == null ? "" : String(m.body_fat_pct)}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 18.5"
                  placeholderTextColor={colors.onSurfaceTertiary}
                  onChangeText={(t) => {
                    if (t.trim() === "") return set("body_fat_pct", null);
                    const n = parseFloat(t.replace(",", "."));
                    if (!isNaN(n)) set("body_fat_pct", n);
                  }}
                />
                <Text style={styles.bfInputHint}>
                  Depuis une balance connectée ou une pince à plis cutanés
                </Text>
              </View>
            )}
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
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  testID?: string;
  icon: any;
  hint?: string;
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
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
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
  grid: { gap: spacing.sm },
  fieldBox: { gap: 4 },
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
    fontSize: 15,
    fontWeight: "600",
  },
  fieldHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 2,
  },
  bfCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  bfHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  bfTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  bfSegment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  bfSegBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  bfSegBtnActive: { backgroundColor: colors.brand },
  bfSegText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  bfResultBox: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  bfBig: { color: "#fff", fontSize: 32, fontWeight: "800" },
  bfHint: { color: "#fff", opacity: 0.8, fontSize: 11 },
  bfMissing: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bfMissingText: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  bfInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  bfInputHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
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
