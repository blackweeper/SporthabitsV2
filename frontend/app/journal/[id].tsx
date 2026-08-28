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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import {
  CardioActivity,
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABEL,
  getSession,
  getWellnessLog,
  MealLogEntry,
  MealPreset,
  patchWellnessLog,
  saveSession,
  uid,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import BodyPainMap from "@/src/components/BodyPainMap";
import { getNutritionSuggestions } from "@/src/data/workout-nutrition";

const ACTIVITIES: CardioActivity[] = [
  "course",
  "velo",
  "rameur",
  "skierg",
  "assault_bike",
  "natation",
  "corde",
  "autre",
];

export default function JournalScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [manualFor, setManualFor] = useState<"before" | "after" | null>(null);
  const [manualLabel, setManualLabel] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  useEffect(() => {
    (async () => {
      const s = await getSession(id!);
      setSession(s);
    })();
  }, [id]);

  const save = async () => {
    if (!session) return;
    await saveSession(session);
    router.back();
  };

  const patchJournal = (patch: Partial<NonNullable<WorkoutSession["journal"]>>) => {
    if (!session) return;
    setSession({
      ...session,
      journal: { ...(session.journal ?? {}), ...patch },
    });
  };

  const patchCardio = (patch: Partial<NonNullable<WorkoutSession["cardio_metrics"]>>) => {
    if (!session) return;
    setSession({
      ...session,
      cardio_metrics: { ...(session.cardio_metrics ?? {}), ...patch },
    });
  };

  // Meal actions save immediately (session + WellnessLog) instead of waiting
  // for the main SAUVER button — a single tap should be enough, matching the
  // rest of the app's "one gesture = done" quick actions.
  const bumpWellnessCalories = async (delta: number) => {
    if (!session) return;
    const date = session.startedAt.slice(0, 10);
    const cur = await getWellnessLog(date);
    await patchWellnessLog(date, {
      calories_kcal: Math.max(0, (cur?.calories_kcal ?? 0) + delta),
    });
  };

  const commitMealLog = async (nextMealLog: MealLogEntry[]) => {
    if (!session) return;
    const updated: WorkoutSession = {
      ...session,
      journal: { ...(session.journal ?? {}), mealLog: nextMealLog },
    };
    setSession(updated);
    await saveSession(updated);
  };

  const toggleSuggestion = async (timing: "before" | "after", suggestion: MealPreset) => {
    if (!session) return;
    Haptics.selectionAsync().catch(() => {});
    const mealLog = session.journal?.mealLog ?? [];
    const existing = mealLog.find(
      (m) => m.timing === timing && m.label === suggestion.label && m.source === "suggestion",
    );
    if (existing) {
      await bumpWellnessCalories(-existing.kcal);
      await commitMealLog(mealLog.filter((m) => m.id !== existing.id));
    } else {
      await bumpWellnessCalories(suggestion.kcal);
      await commitMealLog([
        ...mealLog,
        {
          id: uid(),
          timing,
          emoji: suggestion.emoji ?? "🍽️",
          label: suggestion.label,
          kcal: suggestion.kcal,
          source: "suggestion",
        },
      ]);
    }
  };

  const removeMealEntry = async (entry: MealLogEntry) => {
    if (!session) return;
    Haptics.selectionAsync().catch(() => {});
    await bumpWellnessCalories(-entry.kcal);
    await commitMealLog((session.journal?.mealLog ?? []).filter((m) => m.id !== entry.id));
  };

  const submitManualMeal = async () => {
    if (!session || !manualFor) return;
    const kcal = parseInt(manualKcal.replace(/[^0-9]/g, ""), 10);
    if (!manualLabel.trim() || !kcal) return;
    await bumpWellnessCalories(kcal);
    await commitMealLog([
      ...(session.journal?.mealLog ?? []),
      {
        id: uid(),
        timing: manualFor,
        emoji: "✏️",
        label: manualLabel.trim(),
        kcal,
        source: "manual",
      },
    ]);
    setManualFor(null);
    setManualLabel("");
    setManualKcal("");
  };

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={styles.loading}>Chargement…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const j = session.journal ?? {};
  const cm = session.cardio_metrics ?? {};
  const showCardio = ["cardio", "mixte", "hiit"].includes(session.planType);

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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Journal & cardio</Text>
        <Pressable testID="save-journal" onPress={save} hitSlop={12}>
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
          {showCardio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type d&apos;activité cardio</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actRow}
              >
                {ACTIVITIES.map((a) => {
                  const active = session.cardio_activity === a;
                  return (
                    <Pressable
                      key={a}
                      testID={`act-${a}`}
                      style={[styles.actChip, active && styles.actChipActive]}
                      onPress={() =>
                        setSession({
                          ...session,
                          cardio_activity: active ? null : a,
                        })
                      }
                    >
                      <Text style={styles.actEmoji}>
                        {CARDIO_ACTIVITY_EMOJI[a]}
                      </Text>
                      <Text
                        style={[
                          styles.actLabel,
                          active && { color: "#fff" },
                        ]}
                      >
                        {CARDIO_ACTIVITY_LABEL[a]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.subTitle}>Métriques (optionnel)</Text>
              <View style={styles.grid2}>
                <NumField
                  label="Distance (m)"
                  value={cm.distance_m}
                  onChange={(v) => patchCardio({ distance_m: v })}
                />
                <NumField
                  label="FC moyenne"
                  value={cm.avg_hr}
                  onChange={(v) => patchCardio({ avg_hr: v })}
                />
                <NumField
                  label="FC max"
                  value={cm.max_hr}
                  onChange={(v) => patchCardio({ max_hr: v })}
                />
                <NumField
                  label="Dénivelé (m)"
                  value={cm.elevation_m}
                  onChange={(v) => patchCardio({ elevation_m: v })}
                />
                <NumField
                  label="Cadence"
                  value={cm.cadence}
                  onChange={(v) => patchCardio({ cadence: v })}
                />
                <NumField
                  label="VO₂ Max"
                  value={cm.vo2max}
                  onChange={(v) => patchCardio({ vo2max: v })}
                />
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ressenti (post-séance)</Text>

            <Rating
              label="Humeur"
              icon="happy"
              value={j.mood ?? null}
              onChange={(v) => patchJournal({ mood: v })}
            />
            <Rating
              label="Énergie"
              icon="battery-charging"
              value={j.energy ?? null}
              onChange={(v) => patchJournal({ energy: v })}
            />
            <Rating
              label="Motivation"
              icon="flame"
              value={j.motivation ?? null}
              onChange={(v) => patchJournal({ motivation: v })}
            />

            <BodyPainMap
              value={j.pain_zones ?? []}
              onChange={(zones) => patchJournal({ pain_zones: zones })}
              testID="journal-pain-map"
            />

            <Text style={styles.sectionTitle}>Alimentation</Text>
            <MealSection
              timing="before"
              title="Avant la séance"
              suggestions={getNutritionSuggestions(session, "before")}
              entries={(j.mealLog ?? []).filter((m) => m.timing === "before")}
              onToggleSuggestion={(s) => toggleSuggestion("before", s)}
              onRemove={removeMealEntry}
              onAddManual={() => setManualFor("before")}
            />
            <MealSection
              timing="after"
              title="Après la séance"
              suggestions={getNutritionSuggestions(session, "after")}
              entries={(j.mealLog ?? []).filter((m) => m.timing === "after")}
              onToggleSuggestion={(s) => toggleSuggestion("after", s)}
              onRemove={removeMealEntry}
              onAddManual={() => setManualFor("after")}
            />

            <Text style={styles.miniLabel}>Commentaire libre</Text>
            <TextInput
              testID="journal-comment"
              style={[styles.textArea, { minHeight: 100 }]}
              value={j.comment || ""}
              onChangeText={(t) => patchJournal({ comment: t.trim() ? t : null })}
              placeholder="Séance intense, bon feeling…"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
              multiline
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={manualFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setManualFor(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setManualFor(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <GlassCard
              level="elevated"
              style={[styles.modalCard, theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
            >
              <Text style={styles.modalTitle}>
                {manualFor === "before" ? "Avant la séance" : "Après la séance"}
              </Text>
              <TextInput
                testID="manual-meal-label"
                style={styles.input}
                value={manualLabel}
                onChangeText={setManualLabel}
                placeholder="Ex: Tartines + fromage blanc"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                autoFocus
              />
              <TextInput
                testID="manual-meal-kcal"
                style={styles.input}
                value={manualKcal}
                onChangeText={setManualKcal}
                keyboardType="number-pad"
                placeholder="Calories (ex: 300)"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setManualFor(null)} style={styles.modalBtnGhost}>
                  <Text style={styles.modalBtnGhostText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={submitManualMeal}
                  style={styles.modalBtn}
                  testID="manual-meal-save"
                >
                  <Text style={styles.modalBtnText}>Ajouter</Text>
                </Pressable>
              </View>
            </GlassCard>
          </KeyboardAvoidingView>
          <Pressable style={{ flex: 1 }} onPress={() => setManualFor(null)} />
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

function MealSection({
  timing,
  title,
  suggestions,
  entries,
  onToggleSuggestion,
  onRemove,
  onAddManual,
}: {
  timing: "before" | "after";
  title: string;
  suggestions: MealPreset[];
  entries: MealLogEntry[];
  onToggleSuggestion: (s: MealPreset) => void;
  onRemove: (entry: MealLogEntry) => void;
  onAddManual: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const total = entries.reduce((a, e) => a + e.kcal, 0);
  const acceptedLabels = new Set(
    entries.filter((e) => e.source === "suggestion").map((e) => e.label),
  );

  return (
    <View style={styles.mealSection}>
      <Text style={styles.subTitle}>{title.toUpperCase()}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mealChipRow}
      >
        {suggestions.map((s) => {
          const active = acceptedLabels.has(s.label);
          return (
            <Pressable
              key={s.id}
              testID={`meal-suggestion-${timing}-${s.id}`}
              style={[styles.mealChip, active && styles.mealChipActive]}
              onPress={() => onToggleSuggestion(s)}
            >
              <Text style={styles.mealChipEmoji}>{s.emoji}</Text>
              <Text style={[styles.mealChipText, active && { color: "#fff" }]} numberOfLines={1}>
                {s.label} · {s.kcal} kcal
              </Text>
              {active && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
            </Pressable>
          );
        })}
        <Pressable
          testID={`meal-manual-${timing}`}
          style={styles.mealChip}
          onPress={onAddManual}
        >
          <Text style={styles.mealChipEmoji}>✏️</Text>
          <Text style={styles.mealChipText}>Autre</Text>
        </Pressable>
      </ScrollView>

      {entries.length > 0 && (
        <View style={styles.mealEntriesBox}>
          {entries.map((e) => (
            <View key={e.id} style={styles.mealEntryRow}>
              <Text style={styles.mealEntryText} numberOfLines={1}>
                {e.emoji} {e.label} · {e.kcal} kcal
              </Text>
              <Pressable
                testID={`meal-remove-${e.id}`}
                hitSlop={8}
                onPress={() => onRemove(e)}
              >
                <Ionicons name="close-circle" size={16} color={theme.colors.onSurfaceTertiary} />
              </Pressable>
            </View>
          ))}
          <Text style={styles.mealTotalText}>Total : {total} kcal ajoutés au journal</Text>
        </View>
      )}
    </View>
  );
}

function Rating({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: any;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Ionicons name={icon} size={14} color={theme.colors.brand} />
        <Text style={styles.ratingLabel}>{label}</Text>
        <Text style={styles.ratingValue}>
          {value != null ? `${value}/10` : "—"}
        </Text>
      </View>
      <View style={styles.dotsRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable
            key={n}
            testID={`rating-${label}-${n}`}
            onPress={() => onChange(value === n ? null : n)}
            style={[styles.dot, value != null && n <= value && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  full?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={[styles.numField, full && { width: "100%" }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value == null ? "" : String(value)}
        onChangeText={(t) => {
          if (t.trim() === "") return onChange(null);
          const n = parseFloat(t.replace(",", "."));
          if (!isNaN(n)) onChange(n);
        }}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={theme.colors.onSurfaceTertiary}
      />
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  subTitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  actRow: { gap: 6 },
  actChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  actEmoji: { fontSize: 14 },
  actLabel: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  numField: { width: "48%" },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 10,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 12,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    minHeight: 56,
    textAlignVertical: "top",
  },
  ratingRow: { gap: 6 },
  ratingLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingLabel: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
  },
  ratingValue: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 12,
  },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    borderColor: colors.brand,
  },
  mealSection: { gap: 6 },
  mealChipRow: { gap: 6, paddingVertical: 2 },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  mealChipEmoji: { fontSize: 13 },
  mealChipText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 11.5,
    maxWidth: 200,
  },
  mealEntriesBox: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  mealEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  mealEntryText: { flex: 1, color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  mealTotalText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
  },
  modalBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8 },
  modalBtnGhost: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGhostText: { color: colors.onSurfaceSecondary, fontWeight: "800" },
  });
}
