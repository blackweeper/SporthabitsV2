import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import {
  DEFAULT_CALORIES_TARGET_KCAL,
  getProfile,
  getWellnessLog,
  patchWellnessLog,
  todayYYYYMMDD,
} from "@/src/utils/gym-storage";

const PRESETS: { label: string; kcal: number; icon: any }[] = [
  { label: "Petit-déjeuner", kcal: 400, icon: "sunny" },
  { label: "Déjeuner", kcal: 700, icon: "restaurant" },
  { label: "Dîner", kcal: 600, icon: "moon" },
  { label: "Collation", kcal: 200, icon: "cafe" },
  { label: "Fruit", kcal: 80, icon: "nutrition" },
  { label: "Boisson sucrée", kcal: 150, icon: "beer" },
];

export default function NewMealScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [current, setCurrent] = useState<number>(0);
  const [target, setTarget] = useState<number>(DEFAULT_CALORIES_TARGET_KCAL);
  const [custom, setCustom] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        setTarget(p.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL);
        const w = await getWellnessLog(todayYYYYMMDD());
        setCurrent(w?.calories_kcal ?? 0);
      })();
    }, []),
  );

  const add = async (kcal: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSaving(true);
    const next = Math.max(0, current + kcal);
    await patchWellnessLog(todayYYYYMMDD(), { calories_kcal: next });
    setCurrent(next);
    setSaving(false);
  };

  const submitCustom = async () => {
    const n = parseInt(custom.replace(/[^0-9]/g, ""), 10);
    if (isNaN(n) || n <= 0) return;
    await add(n);
    setCustom("");
  };

  const pct = Math.min(1, target ? current / target : 0);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            testID="close-meal"
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Ajouter un repas</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>
                  APPORT DU JOUR
                </Text>
                <Text style={styles.summaryValue}>{current} kcal</Text>
                <Text style={styles.summarySub}>
                  Cible {target} kcal · {Math.round(pct * 100)}%
                </Text>
              </View>
              <Ionicons name="nutrition" size={40} color={theme.colors.brand} />
            </View>
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${pct * 100}%` }]} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ajout rapide</Text>
          <View style={styles.presetsGrid}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.label}
                testID={`preset-${p.label}`}
                style={styles.preset}
                onPress={() => add(p.kcal)}
                disabled={saving}
              >
                <View style={styles.presetIcon}>
                  <Ionicons name={p.icon} size={16} color={theme.colors.brand} />
                </View>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetKcal}>+{p.kcal} kcal</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Autre montant</Text>
          <View style={styles.customRow}>
            <TextInput
              testID="custom-kcal-input"
              style={styles.input}
              value={custom}
              onChangeText={setCustom}
              keyboardType="number-pad"
              placeholder="Ex : 350"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
            />
            <Text style={styles.inputSuffix}>kcal</Text>
            <Pressable
              onPress={submitCustom}
              style={[
                styles.saveBtn,
                (!custom || saving) && { opacity: 0.5 },
              ]}
              disabled={!custom || saving}
              testID="save-meal"
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Ajouter</Text>
            </Pressable>
          </View>

          {current > 0 && (
            <Pressable
              testID="reset-day"
              style={styles.resetBtn}
              onPress={async () => {
                await patchWellnessLog(todayYYYYMMDD(), { calories_kcal: 0 });
                setCurrent(0);
              }}
            >
              <Ionicons name="refresh" size={14} color={theme.colors.error} />
              <Text style={styles.resetBtnText}>
                Réinitialiser l&apos;apport du jour
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: colors.onSurface,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  summarySub: {
    color: colors.brandSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  bar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    borderRadius: 3,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  preset: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    alignItems: "flex-start",
  },
  presetIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  presetLabel: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  presetKcal: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 11,
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  inputSuffix: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "700",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.5,
    fontSize: 12,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    marginTop: 8,
  },
  resetBtnText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: 12,
  },
  });
}
