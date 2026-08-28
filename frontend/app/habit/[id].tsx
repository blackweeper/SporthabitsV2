import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  deleteHabit,
  getHabits,
  Habit,
  HabitKind,
  HABIT_KIND_ICON,
  HABIT_KIND_LABEL,
  saveHabit,
  uid,
} from "@/src/utils/gym-storage";

const KINDS: { key: HabitKind; defaultTitle: string; defaultTarget: number; defaultUnit: string }[] = [
  { key: "water", defaultTitle: "Boire de l'eau", defaultTarget: 8, defaultUnit: "verres" },
  { key: "steps", defaultTitle: "Marche quotidienne", defaultTarget: 8000, defaultUnit: "pas" },
  { key: "nutrition", defaultTitle: "Nutrition respectée", defaultTarget: 1, defaultUnit: "" },
  { key: "mobility", defaultTitle: "Mobilité / étirements", defaultTarget: 10, defaultUnit: "min" },
  { key: "sleep", defaultTitle: "Sommeil", defaultTarget: 8, defaultUnit: "h" },
  { key: "meditation", defaultTitle: "Méditation", defaultTarget: 10, defaultUnit: "min" },
  { key: "reading", defaultTitle: "Lecture", defaultTarget: 30, defaultUnit: "min" },
  { key: "other", defaultTitle: "Autre", defaultTarget: 1, defaultUnit: "" },
];

export default function HabitEditorScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [habit, setHabit] = useState<Habit | null>(null);
  const { confirm, ConfirmModal } = useConfirmDialog();

  useEffect(() => {
    (async () => {
      if (isNew) {
        setHabit({
          id: uid(),
          title: "",
          // "other" by default: "water"/"steps"/"nutrition" habits are
          // hidden from the dashboard list (they'd duplicate the built-in
          // Eau/Calories/Pas cards), so a new habit shouldn't silently
          // inherit one of those kinds before the user picks on purpose.
          kind: "other",
          frequency: "daily",
          target: 1,
          unit: "",
          createdAt: new Date().toISOString(),
          includedInScore: true,
        });
      } else {
        const list = await getHabits();
        const h = list.find((x) => x.id === id);
        if (h) setHabit(h);
        else router.back();
      }
    })();
  }, [id, isNew, router]);

  if (!habit) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={styles.loading}>Chargement…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const set = <K extends keyof Habit>(k: K, v: Habit[K]) =>
    setHabit((h) => (h ? { ...h, [k]: v } : h));

  const save = async () => {
    if (!habit) return;
    if (!habit.title.trim()) {
      Alert.alert("Titre requis", "Nomme ton habitude.");
      return;
    }
    await saveHabit(habit);
    router.back();
  };

  const remove = async () => {
    if (!habit || isNew) return;
    const ok = await confirm({
      title: "Supprimer cette habitude ?",
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    await deleteHabit(habit.id);
    router.back();
  };

  const applyKind = (kind: HabitKind) => {
    const def = KINDS.find((k) => k.key === kind)!;
    setHabit((h) =>
      h
        ? {
            ...h,
            kind,
            title: h.title.trim() ? h.title : def.defaultTitle,
            target: def.defaultTarget,
            unit: def.defaultUnit,
          }
        : h,
    );
  };

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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="close-habit">
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{isNew ? "Nouvelle habitude" : "Habitude"}</Text>
        <Pressable
          onPress={save}
          hitSlop={16}
          testID="save-habit"
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.saveBtnText}>SAUVEGARDER</Text>
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
          <Text style={styles.miniLabel}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kindRow}
          >
            {KINDS.map((k) => {
              const active = habit.kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  testID={`habit-kind-${k.key}`}
                  style={[styles.kindChip, active && styles.kindChipActive]}
                  onPress={() => applyKind(k.key)}
                >
                  <Ionicons
                    name={HABIT_KIND_ICON[k.key]}
                    size={14}
                    color={active ? "#fff" : theme.colors.brand}
                  />
                  <Text style={[styles.kindLabel, active && { color: "#fff" }]}>
                    {HABIT_KIND_LABEL[k.key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.miniLabel}>Titre</Text>
          <TextInput
            testID="habit-title"
            style={styles.input}
            value={habit.title}
            onChangeText={(t) => set("title", t)}
            placeholder="Ex: Boire 2L d'eau"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Cible / jour</Text>
              <TextInput
                testID="habit-target"
                style={styles.input}
                value={habit.target == null ? "" : String(habit.target)}
                keyboardType="decimal-pad"
                onChangeText={(t) => {
                  if (t.trim() === "") return set("target", null);
                  const n = parseFloat(t.replace(",", "."));
                  if (!isNaN(n)) set("target", n);
                }}
                placeholder="8"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Unité</Text>
              <TextInput
                testID="habit-unit"
                style={styles.input}
                value={habit.unit || ""}
                onChangeText={(t) => set("unit", t)}
                placeholder="verres, min, pas…"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Compter dans le score du jour</Text>
              <Text style={styles.switchSub}>
                Cette habitude sera visible dans "À faire aujourd&apos;hui"
              </Text>
            </View>
            <Switch
              testID="habit-in-score"
              value={habit.includedInScore !== false}
              onValueChange={(v) => set("includedInScore", v)}
              trackColor={{ true: theme.colors.brand, false: theme.colors.surfaceTertiary }}
              thumbColor="#fff"
            />
          </View>

          {!isNew && (
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Ionicons name="trash" size={16} color={theme.colors.error} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      {ConfirmModal}
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
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
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  row: { flexDirection: "row", gap: spacing.md },
  kindRow: { gap: 6, paddingVertical: 6 },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  kindLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  switchTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  switchSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
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
}
