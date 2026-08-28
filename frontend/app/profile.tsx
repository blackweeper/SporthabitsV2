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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";

/** Chip de sélection actif (Sexe/Objectif/Niveau) — "Active Glass" sous
 * Sunset (fond translucide + bordure + lueur) au lieu d'un pavé plein. */
function activeSelectStyle(theme: Theme, active: boolean) {
  if (!active) return { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border };
  if (theme.card.mode !== "glass") return { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand };
  return [
    { backgroundColor: withAlpha(theme.colors.brand, 20), borderColor: withAlpha(theme.colors.brand, 50) },
    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.28, radius: 6, elevation: 2 }),
  ];
}
function activeSelectColor(theme: Theme, active: boolean) {
  if (!active) return theme.colors.onSurfaceTertiary;
  return theme.card.mode === "glass" ? theme.colors.brand : "#fff";
}
import { cropImage } from "@/src/utils/imageCropper";
import {
  getProfile,
  saveProfile,
  Sex,
  UserProfile,
} from "@/src/utils/gym-storage";
import { GOAL_LABEL, LEVEL_LABEL, ProgramGoal, ProgramLevel } from "@/src/data/programs";

const SEXES: { key: Sex; label: string; icon: any }[] = [
  { key: "homme", label: "Homme", icon: "male" },
  { key: "femme", label: "Femme", icon: "female" },
  { key: "autre", label: "Autre", icon: "person" },
];

const GOALS: { key: ProgramGoal; icon: any }[] = [
  { key: "perte_de_poids", icon: "flame" },
  { key: "prise_de_masse", icon: "barbell" },
  { key: "force", icon: "fitness" },
  { key: "forme_generale", icon: "heart" },
  { key: "mobilite", icon: "body" },
];

const LEVELS: { key: ProgramLevel }[] = [
  { key: "debutant" },
  { key: "intermediaire" },
  { key: "avance" },
];

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    name: null,
    weight_kg: null,
    height_cm: null,
    sex: null,
    age: null,
    photoBase64: null,
    experienceLevel: null,
    primaryGoal: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  async function pickPhoto(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission requise",
        fromCamera
          ? "Autorise l'accès à la caméra."
          : "Autorise l'accès aux photos.",
      );
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
    try {
      const cropped = await cropImage(res.assets[0].uri, {
        aspectRatio: 1,
        outputWidth: 480,
        jpegQuality: 0.8,
        title: "Cadrer ta photo de profil",
      });
      if (!cropped) return;
      set("photoBase64", cropped.base64);
    } catch {
      Alert.alert("Erreur", "Impossible de traiter cette image.");
    }
  }

  const save = async () => {
    await saveProfile(profile);
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView
          style={[
            styles.container,
            theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.loading, { color: theme.colors.onSurfaceTertiary }]}>Chargement…</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          testID="close-profile"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Mon profil</Text>
        <Pressable
          testID="save-profile"
          onPress={save}
          hitSlop={16}
          style={({ pressed }) => [
            styles.saveBtn,
            { borderRadius: theme.radius.pill },
            activeSelectStyle(theme, true),
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons name="checkmark" size={14} color={activeSelectColor(theme, true)} />
          <Text style={[styles.saveBtnText, { color: activeSelectColor(theme, true) }]}>SAUVEGARDER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar block */}
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.brand },
              ]}
            >
              {profile.photoBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }}
                  style={styles.avatarImg}
                />
              ) : (
                <Ionicons name="person" size={56} color={theme.colors.onSurfaceTertiary} />
              )}
            </View>
            <View style={styles.avatarActions}>
              <Pressable
                testID="avatar-camera"
                style={[styles.avatarBtn, { borderColor: theme.colors.brand, backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={() => pickPhoto(true)}
              >
                <Ionicons name="camera" size={16} color={theme.colors.brand} />
                <Text style={[styles.avatarBtnText, { color: theme.colors.brand }]}>Caméra</Text>
              </Pressable>
              <Pressable
                testID="avatar-gallery"
                style={[styles.avatarBtn, { borderColor: theme.colors.brand, backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={() => pickPhoto(false)}
              >
                <Ionicons name="images" size={16} color={theme.colors.brand} />
                <Text style={[styles.avatarBtnText, { color: theme.colors.brand }]}>Galerie</Text>
              </Pressable>
              {profile.photoBase64 ? (
                <Pressable
                  testID="avatar-clear"
                  style={[styles.avatarBtnDanger, { borderColor: theme.colors.error, backgroundColor: theme.colors.surfaceSecondary }]}
                  onPress={() => set("photoBase64", null)}
                >
                  <Ionicons name="trash" size={16} color={theme.colors.error} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.introCard,
              { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="body" size={22} color={theme.colors.brand} />
            <Text style={[styles.introText, { color: theme.colors.onSurfaceSecondary }]}>
              Ces infos affinent le calcul des calories brûlées et servent au suivi de progression (IMC, masse grasse).
            </Text>
          </View>

          <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>Prénom</Text>
          <TextInput
            testID="input-name"
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: theme.radius.md,
                color: theme.colors.onSurface,
                borderColor: theme.colors.border,
              },
            ]}
            value={profile.name ?? ""}
            onChangeText={(t) => set("name", t.trim() ? t : null)}
            placeholder="Ex: Alex"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />

          <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>Sexe</Text>
          <View style={styles.sexRow}>
            {SEXES.map((s) => {
              const active = profile.sex === s.key;
              return (
                <Pressable
                  key={s.key}
                  testID={`sex-${s.key}`}
                  style={[styles.sexBtn, { borderRadius: theme.radius.md }, activeSelectStyle(theme, active)]}
                  onPress={() => set("sex", s.key)}
                >
                  <Ionicons name={s.icon} size={20} color={activeSelectColor(theme, active)} />
                  <Text style={[styles.sexLabel, { color: activeSelectColor(theme, active) }]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>Objectif principal</Text>
          <Text style={[styles.sectionHelp, { color: theme.colors.onSurfaceTertiary }]}>
            Sert à te recommander les programmes prédéfinis les plus pertinents — n&apos;exclut jamais les autres.
          </Text>
          <View style={styles.goalRow}>
            {GOALS.map((g) => {
              const active = profile.primaryGoal === g.key;
              return (
                <Pressable
                  key={g.key}
                  testID={`goal-${g.key}`}
                  style={[styles.goalChip, { borderRadius: theme.radius.pill }, activeSelectStyle(theme, active)]}
                  onPress={() => set("primaryGoal", active ? null : g.key)}
                >
                  <Ionicons name={g.icon} size={14} color={activeSelectColor(theme, active)} />
                  <Text style={[styles.goalChipText, { color: activeSelectColor(theme, active) }]}>
                    {GOAL_LABEL[g.key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>Niveau d&apos;expérience</Text>
          <View style={styles.sexRow}>
            {LEVELS.map((l) => {
              const active = profile.experienceLevel === l.key;
              return (
                <Pressable
                  key={l.key}
                  testID={`level-${l.key}`}
                  style={[styles.sexBtn, { borderRadius: theme.radius.md }, activeSelectStyle(theme, active)]}
                  onPress={() => set("experienceLevel", active ? null : l.key)}
                >
                  <Text style={[styles.sexLabel, { color: activeSelectColor(theme, active) }]}>
                    {LEVEL_LABEL[l.key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.fieldRow}>
            <FieldBox
              label="Poids (kg)"
              value={profile.weight_kg}
              onChange={(v) => set("weight_kg", v)}
              placeholder="70"
              testID="input-weight"
            />
            <FieldBox
              label="Taille (cm)"
              value={profile.height_cm}
              onChange={(v) => set("height_cm", v)}
              placeholder="175"
              testID="input-height"
            />
          </View>
          <View style={styles.fieldRow}>
            <FieldBox
              label="Âge"
              value={profile.age}
              onChange={(v) => set("age", v)}
              placeholder="30"
              testID="input-age"
            />
            <View style={{ flex: 1 }} />
          </View>

          {profile.weight_kg && profile.height_cm ? (
            <View style={[styles.bmiCard, { backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.md }]}>
              <Text style={[styles.bmiLabel, { color: theme.colors.brandSecondary }]}>INDICE DE MASSE CORPORELLE</Text>
              <Text style={[styles.bmiVal, { color: theme.colors.onSurface }]}>
                {computeBMI(profile.weight_kg, profile.height_cm).toFixed(1)}
              </Text>
              <Text style={[styles.bmiHint, { color: theme.colors.brandSecondary }]}>
                {bmiCategory(
                  computeBMI(profile.weight_kg, profile.height_cm),
                )}
              </Text>
            </View>
          ) : null}

          {/* Wellness daily targets */}
          <Text style={[styles.sectionHeader, { color: theme.colors.onSurface }]}>Objectifs quotidiens bien-être</Text>
          <Text style={[styles.sectionHelp, { color: theme.colors.onSurfaceTertiary }]}>
            Utilisés dans le score IRONFLOW & les widgets du dashboard.
          </Text>

          <View style={styles.fieldRow}>
            <FieldBox
              label="Eau (ml)"
              value={profile.water_target_ml ?? null}
              onChange={(v) => set("water_target_ml", v)}
              placeholder="2000"
              testID="input-water-target"
            />
            <FieldBox
              label="Calories (kcal)"
              value={profile.calories_target_kcal ?? null}
              onChange={(v) => set("calories_target_kcal", v)}
              placeholder="2000"
              testID="input-calories-target"
            />
          </View>
          <View style={styles.fieldRow}>
            <FieldBox
              label="Pas / jour"
              value={profile.steps_target ?? null}
              onChange={(v) => set("steps_target", v)}
              placeholder="10000"
              testID="input-steps-target"
            />
            <View style={{ flex: 1 }} />
          </View>

          {/* Quick shortcuts */}
          {/* Shortcuts moved to Profil tab (list). This screen focuses on personal settings. */}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function FieldBox({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.fieldBox}>
      <Text style={[styles.miniLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: theme.radius.md,
            color: theme.colors.onSurface,
            borderColor: theme.colors.border,
          },
        ]}
        value={value == null ? "" : String(value)}
        onChangeText={(t) => {
          if (t.trim() === "") return onChange(null);
          const n = parseFloat(t.replace(",", "."));
          if (!isNaN(n)) onChange(n);
        }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceTertiary}
      />
    </View>
  );
}

function computeBMI(weight: number, height_cm: number) {
  const m = height_cm / 100;
  return weight / (m * m);
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return "Maigreur";
  if (bmi < 25) return "Corpulence normale";
  if (bmi < 30) return "Surpoids";
  if (bmi < 35) return "Obésité modérée";
  return "Obésité sévère";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 120, height: 120, borderRadius: 60 },
  avatarActions: { flexDirection: "row", gap: spacing.sm },
  avatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  avatarBtnDanger: {
    padding: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtnText: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  introCard: {
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  goalChipText: {
    fontWeight: "700",
    fontSize: 12,
  },
  sexRow: { flexDirection: "row", gap: spacing.sm },
  sexBtn: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  sexLabel: {
    fontWeight: "700",
    fontSize: 12,
  },
  fieldRow: { flexDirection: "row", gap: spacing.md },
  fieldBox: { flex: 1 },
  miniLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    padding: spacing.md,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  bmiCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  bmiLabel: {
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "800",
  },
  bmiVal: { fontSize: 36, fontWeight: "800" },
  bmiHint: { fontSize: 12, fontWeight: "600" },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
  },
  sectionHelp: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
});
