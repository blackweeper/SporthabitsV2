import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import SwipeableRow from "@/src/components/SwipeableRow";
import {
  deleteGoal,
  Goal,
  GoalCategory,
  GOAL_CATEGORY_ICON,
  GOAL_CATEGORY_LABEL,
  getGoals,
  getMeasurements,
  getPRs,
  getSessions,
  saveGoal,
  uid,
} from "@/src/utils/gym-storage";

const CATEGORIES: {
  key: GoalCategory;
  label: string;
  defaultUnit: string;
  placeholder: string;
}[] = [
  { key: "weight_pr", label: "Record poids", defaultUnit: "kg", placeholder: "100" },
  { key: "reps_pr", label: "Record reps", defaultUnit: "reps", placeholder: "20" },
  { key: "run_distance", label: "Course", defaultUnit: "km", placeholder: "10" },
  { key: "body_weight", label: "Poids corporel", defaultUnit: "kg", placeholder: "75" },
  { key: "body_fat", label: "Masse grasse", defaultUnit: "%", placeholder: "12" },
  { key: "measurement", label: "Mesure", defaultUnit: "cm", placeholder: "42" },
  { key: "sessions_count", label: "Séances", defaultUnit: "séances", placeholder: "100" },
  { key: "streak", label: "Streak", defaultUnit: "jours", placeholder: "30" },
  { key: "other", label: "Autre", defaultUnit: "", placeholder: "..." },
];

export default function GoalsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [ctxCurrentValues, setCtxCurrentValues] = useState<Record<string, number>>({});
  const { confirm, ConfirmModal } = useConfirmDialog();

  const confirmAndDelete = async (goal: Goal) => {
    const ok = await confirm({
      title: "Supprimer cet objectif ?",
      message: `"${goal.title || GOAL_CATEGORY_LABEL[goal.category]}" — cette action est définitive.`,
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    await deleteGoal(goal.id);
    setEditing(null);
    load();
  };

  const load = useCallback(async () => {
    const g = await getGoals();
    setGoals(g);
    // compute derived "current values" per goal category
    const sessions = await getSessions();
    const prs = await getPRs();
    const measurements = await getMeasurements();
    const map: Record<string, number> = {};
    for (const goal of g) {
      map[goal.id] = computeCurrentValue(goal, { sessions, prs, measurements });
    }
    setCtxCurrentValues(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
        <Pressable
          testID="close-goals"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Mes objectifs</Text>
        <Pressable
          testID="new-goal"
          onPress={() =>
            setEditing({
              id: uid(),
              title: "",
              category: "weight_pr",
              startValue: 0,
              targetValue: 0,
              unit: "kg",
              createdAt: new Date().toISOString(),
            })
          }
          hitSlop={12}
        >
          <Ionicons name="add-circle" size={22} color={theme.colors.brand} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {goals.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flag" size={40} color={theme.colors.brand} />
            <Text style={styles.emptyTitle}>Aucun objectif</Text>
            <Text style={styles.emptyText}>
              Fixe-toi une cible : 20 tractions, 10 km, 12% de masse grasse, 100 séances…
            </Text>
            <Pressable
              testID="empty-new-goal"
              style={styles.ctaBtn}
              onPress={() =>
                setEditing({
                  id: uid(),
                  title: "",
                  category: "weight_pr",
                  startValue: 0,
                  targetValue: 0,
                  unit: "kg",
                  createdAt: new Date().toISOString(),
                })
              }
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.ctaBtnText}>CRÉER UN OBJECTIF</Text>
            </Pressable>
          </View>
        ) : (
          goals.map((g) => {
            const current = ctxCurrentValues[g.id] ?? g.startValue;
            const total = Math.max(0.0001, g.targetValue - g.startValue);
            const raw = (current - g.startValue) / total;
            const pct = Math.max(0, Math.min(1, raw));
            const done = pct >= 1;
            return (
              <SwipeableRow
                key={g.id}
                testID={`goal-${g.id}`}
                onDelete={() => confirmAndDelete(g)}
                onEdit={() => setEditing(g)}
              >
              <Pressable
                testID={`goal-${g.id}`}
                style={[styles.goalCard, done && styles.goalCardDone]}
                onPress={() => setEditing(g)}
              >
                <View style={styles.goalHead}>
                  <View style={styles.goalIcon}>
                    <Ionicons
                      name={GOAL_CATEGORY_ICON[g.category]}
                      size={18}
                      color={done ? theme.colors.success : theme.colors.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle} numberOfLines={1}>
                      {g.title || GOAL_CATEGORY_LABEL[g.category]}
                    </Text>
                    <Text style={styles.goalCat}>
                      {GOAL_CATEGORY_LABEL[g.category]}
                    </Text>
                  </View>
                  {done && (
                    <View style={styles.doneTag}>
                      <Ionicons name="trophy" size={11} color="#fff" />
                      <Text style={styles.doneTagText}>ATTEINT</Text>
                    </View>
                  )}
                </View>
                <View style={styles.goalValues}>
                  <Text style={styles.goalCurrent}>
                    {current.toFixed(1)} {g.unit}
                  </Text>
                  <Text style={styles.goalTarget}>
                    / {g.targetValue.toFixed(1)} {g.unit}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct * 100}%`,
                        backgroundColor: done ? theme.colors.success : theme.colors.brand,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {Math.round(pct * 100)}% · démarré à {g.startValue} {g.unit}
                </Text>
              </Pressable>
              </SwipeableRow>
            );
          })
        )}
      </ScrollView>

      <GoalEditorModal
        goal={editing}
        onClose={() => setEditing(null)}
        onSave={async (g) => {
          if (!g.title.trim()) {
            Alert.alert("Titre requis", "Donne un nom à ton objectif.");
            return;
          }
          if (g.targetValue === g.startValue) {
            Alert.alert("Valeur invalide", "La cible doit différer de la valeur de départ.");
            return;
          }
          await saveGoal(g);
          setEditing(null);
          load();
        }}
        onDelete={(id) => {
          const g = goals.find((x) => x.id === id) ?? editing;
          if (g) confirmAndDelete(g);
        }}
      />
      {ConfirmModal}
      </SafeAreaView>
    </View>
  );
}

function GoalEditorModal({
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal | null;
  onClose: () => void;
  onSave: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const [draft, setDraft] = useState<Goal | null>(null);

  useState(() => {
    if (goal) setDraft(goal);
  });
  // Reset when goal changes
  if (goal && draft?.id !== goal.id) setDraft(goal);
  if (!goal || !draft) return null;

  const catDef = CATEGORIES.find((c) => c.key === draft.category)!;

  return (
    <Modal
      visible={!!goal}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[styles.sheet, theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {goal.title ? "Modifier l'objectif" : "Nouvel objectif"}
            </Text>

            <Text style={styles.miniLabel}>Titre</Text>
            <TextInput
              testID="goal-title"
              style={styles.input}
              value={draft.title}
              onChangeText={(t) => setDraft({ ...draft, title: t })}
              placeholder="Ex: Faire 20 tractions"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
            />

            <Text style={styles.miniLabel}>Catégorie</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 6 }}
            >
              {CATEGORIES.map((c) => {
                const active = c.key === draft.category;
                return (
                  <Pressable
                    key={c.key}
                    testID={`goal-cat-${c.key}`}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() =>
                      setDraft({
                        ...draft,
                        category: c.key,
                        unit: c.defaultUnit,
                      })
                    }
                  >
                    <Ionicons
                      name={GOAL_CATEGORY_ICON[c.key]}
                      size={12}
                      color={active ? "#fff" : theme.colors.brand}
                    />
                    <Text
                      style={[
                        styles.catChipText,
                        active && { color: "#fff" },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>Départ</Text>
                <TextInput
                  testID="goal-start"
                  style={styles.input}
                  value={String(draft.startValue)}
                  keyboardType="decimal-pad"
                  onChangeText={(t) =>
                    setDraft({
                      ...draft,
                      startValue: parseFloat(t.replace(",", ".")) || 0,
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>Cible</Text>
                <TextInput
                  testID="goal-target"
                  style={styles.input}
                  value={String(draft.targetValue)}
                  keyboardType="decimal-pad"
                  placeholder={catDef.placeholder}
                  placeholderTextColor={theme.colors.onSurfaceTertiary}
                  onChangeText={(t) =>
                    setDraft({
                      ...draft,
                      targetValue: parseFloat(t.replace(",", ".")) || 0,
                    })
                  }
                />
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.miniLabel}>Unité</Text>
                <TextInput
                  testID="goal-unit"
                  style={styles.input}
                  value={draft.unit}
                  onChangeText={(t) => setDraft({ ...draft, unit: t })}
                />
              </View>
            </View>

            <Text style={styles.hint}>
              💡 La progression est calculée automatiquement selon la catégorie
              (records, séances, mesures…).
            </Text>

            <View style={styles.actionsRow}>
              {goal.title ? (
                <Pressable
                  testID="goal-delete"
                  style={styles.deleteBtn}
                  onPress={() => onDelete(goal.id)}
                >
                  <Ionicons name="trash" size={16} color={theme.colors.error} />
                  <Text style={styles.deleteBtnText}>Supprimer</Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <Pressable
                testID="goal-save"
                style={styles.saveBtn}
                onPress={() => onSave(draft)}
              >
                <Text style={styles.saveBtnText}>ENREGISTRER</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </GlassCard>
      </View>
    </Modal>
  );
}

/** Computes derived progress against user data when applicable. */
function computeCurrentValue(
  goal: Goal,
  ctx: {
    sessions: any[];
    prs: any[];
    measurements: any[];
  },
): number {
  switch (goal.category) {
    case "sessions_count":
      return ctx.sessions.length;
    case "streak": {
      // best streak
      const days = Array.from(
        new Set(
          ctx.sessions.map((s) =>
            new Date(s.startedAt).toISOString().slice(0, 10),
          ),
        ),
      ).sort();
      if (days.length === 0) return 0;
      let best = 1;
      let cur = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const now = new Date(days[i]);
        const diff = Math.round((now.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
          cur++;
          if (cur > best) best = cur;
        } else cur = 1;
      }
      return best;
    }
    case "weight_pr": {
      // best PR weight
      const w = ctx.prs
        .filter((p) => (p.type ?? "weight") === "weight")
        .map((p) => p.weight_kg ?? 0);
      return w.length ? Math.max(...w) : goal.startValue;
    }
    case "reps_pr": {
      const r = ctx.prs
        .filter((p) => (p.type ?? "weight") === "reps")
        .map((p) => p.reps ?? 0);
      return r.length ? Math.max(...r) : goal.startValue;
    }
    case "run_distance": {
      // longest run distance (km)
      const d = ctx.prs
        .filter((p) => p.type === "run")
        .map((p) => (p.distance_m ?? 0) / 1000);
      return d.length ? Math.max(...d) : goal.startValue;
    }
    case "body_weight": {
      const last = ctx.measurements.find((m) => m.weight_kg != null);
      return last?.weight_kg ?? goal.startValue;
    }
    case "body_fat": {
      const last = ctx.measurements.find((m) => m.body_fat_pct != null);
      return last?.body_fat_pct ?? goal.startValue;
    }
    case "measurement":
    case "other":
    default:
      return goal.startValue;
  }
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ctaBtn: {
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ctaBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  goalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  goalCardDone: {
    borderColor: colors.success,
    backgroundColor: "#0F2F1A",
  },
  goalHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  goalCat: { color: colors.onSurfaceTertiary, fontSize: 11 },
  doneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  doneTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  goalValues: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  goalCurrent: { color: colors.brand, fontSize: 24, fontWeight: "800" },
  goalTarget: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  progressLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 12,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
  },
  row: { flexDirection: "row", gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  catChipText: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  hint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteBtnText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    flex: 1,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  });
}
