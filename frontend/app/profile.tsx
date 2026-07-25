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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  getProfile,
  saveProfile,
  Sex,
  UserProfile,
} from "@/src/utils/gym-storage";

const SEXES: { key: Sex; label: string; icon: any }[] = [
  { key: "homme", label: "Homme", icon: "male" },
  { key: "femme", label: "Femme", icon: "female" },
  { key: "autre", label: "Autre", icon: "person" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    weight_kg: null,
    height_cm: null,
    sex: null,
    age: null,
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

  const save = async () => {
    await saveProfile(profile);
    router.back();
  };

  if (loading) {
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
          testID="close-profile"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Mon profil</Text>
        <Pressable testID="save-profile" onPress={save} hitSlop={12}>
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
        >
          <View style={styles.introCard}>
            <Ionicons name="body" size={22} color={colors.brand} />
            <Text style={styles.introText}>
              Ces infos affinent le calcul des calories brûlées et sont utilisées pour le suivi de progression.
            </Text>
          </View>

          <Text style={styles.label}>Sexe</Text>
          <View style={styles.sexRow}>
            {SEXES.map((s) => {
              const active = profile.sex === s.key;
              return (
                <Pressable
                  key={s.key}
                  testID={`sex-${s.key}`}
                  style={[styles.sexBtn, active && styles.sexBtnActive]}
                  onPress={() => set("sex", s.key)}
                >
                  <Ionicons
                    name={s.icon}
                    size={20}
                    color={active ? "#fff" : colors.onSurfaceTertiary}
                  />
                  <Text
                    style={[
                      styles.sexLabel,
                      active && { color: "#fff" },
                    ]}
                  >
                    {s.label}
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
            <View style={styles.bmiCard}>
              <Text style={styles.bmiLabel}>INDICE DE MASSE CORPORELLE</Text>
              <Text style={styles.bmiVal}>
                {computeBMI(profile.weight_kg, profile.height_cm).toFixed(1)}
              </Text>
              <Text style={styles.bmiHint}>
                {bmiCategory(
                  computeBMI(profile.weight_kg, profile.height_cm),
                )}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.miniLabel}>{label}</Text>
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
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceTertiary}
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  introCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introText: { color: colors.onSurfaceSecondary, flex: 1, fontSize: 13, lineHeight: 18 },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  sexRow: { flexDirection: "row", gap: spacing.sm },
  sexBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 6,
  },
  sexBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  sexLabel: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 12,
  },
  fieldRow: { flexDirection: "row", gap: spacing.md },
  fieldBox: { flex: 1 },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 6,
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
  bmiCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  bmiLabel: {
    color: colors.brandSecondary,
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "800",
  },
  bmiVal: { color: colors.onSurface, fontSize: 36, fontWeight: "800" },
  bmiHint: { color: colors.brandSecondary, fontSize: 12, fontWeight: "600" },
});
