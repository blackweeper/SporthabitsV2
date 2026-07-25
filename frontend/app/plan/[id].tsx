import { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  Exercise,
  ExerciseMode,
  getPlan,
  Plan,
  savePlan,
  uid,
} from "@/src/utils/gym-storage";

const TYPES: Plan["type"][] = ["musculation", "hiit", "cardio", "mixte"];
const MODES: { key: ExerciseMode; label: string; hint: string }[] = [
  { key: "reps", label: "REPS", hint: "Séries × répétitions" },
  { key: "time", label: "TIME", hint: "X minutes / série (WOD)" },
  { key: "amrap", label: "AMRAP", hint: "Tours max sur une durée" },
  { key: "emom", label: "EMOM", hint: "X reps chaque minute pendant N minutes" },
];

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (isNew) {
        setPlan({
          id: uid(),
          title: "",
          type: "musculation",
          createdAt: new Date().toISOString(),
          exercises: [],
        });
      } else {
        const p = await getPlan(id!);
        setPlan(p);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  const update = (patch: Partial<Plan>) => {
    if (!plan) return;
    setPlan({ ...plan, ...patch });
  };

  const updateExercise = (exId: string, patch: Partial<Exercise>) => {
    if (!plan) return;
    setPlan({
      ...plan,
      exercises: plan.exercises.map((e) =>
        e.id === exId ? { ...e, ...patch } : e,
      ),
    });
  };

  const addExercise = () => {
    if (!plan) return;
    setPlan({
      ...plan,
      exercises: [
        ...plan.exercises,
        {
          id: uid(),
          name: "Nouvel exercice",
          mode: "reps",
          sets: 3,
          reps: "10",
          weight: null,
          rest_seconds: 60,
          duration_seconds: null,
          notes: null,
        },
      ],
    });
  };

  const removeExercise = (exId: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      exercises: plan.exercises.filter((e) => e.id !== exId),
    });
  };

  const save = async () => {
    if (!plan) return;
    if (!plan.title.trim()) {
      Alert.alert("Titre requis", "Donne un nom à ton plan.");
      return;
    }
    await savePlan({ ...plan, title: plan.title.trim() });
    router.back();
  };

  if (loading || !plan) {
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
          testID="back-plan"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isNew ? "Nouveau plan" : "Modifier le plan"}
        </Text>
        <Pressable
          testID="save-plan-btn"
          onPress={save}
          hitSlop={12}
        >
          <Text style={styles.saveText}>ENREGISTRER</Text>
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
          <Text style={styles.label}>Nom du plan</Text>
          <TextInput
            testID="plan-title-input"
            style={styles.input}
            value={plan.title}
            onChangeText={(t) => update({ title: t })}
            placeholder="Ex: Push Day, HIIT 20 min…"
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                testID={`type-${t}`}
                style={[
                  styles.typeChip,
                  plan.type === t && styles.typeChipActive,
                ]}
                onPress={() => update({ type: t })}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    plan.type === t && styles.typeChipTextActive,
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.label}>Exercices ({plan.exercises.length})</Text>
            <Pressable
              testID="add-exercise-btn"
              style={styles.addBtn}
              onPress={addExercise}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>AJOUTER</Text>
            </Pressable>
          </View>

          {plan.exercises.length === 0 && (
            <Text style={styles.emptyEx}>
              Aucun exercice. Ajoute-en un pour commencer.
            </Text>
          )}

          {plan.exercises.map((ex, idx) => (
            <View key={ex.id} style={styles.exCard} testID={`ex-${ex.id}`}>
              <View style={styles.exCardHead}>
                <Text style={styles.exIdx}>#{idx + 1}</Text>
                <Pressable
                  testID={`remove-ex-${ex.id}`}
                  onPress={() => removeExercise(ex.id)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.onSurfaceTertiary}
                  />
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.inputCompact]}
                value={ex.name}
                onChangeText={(t) => updateExercise(ex.id, { name: t })}
                placeholder="Nom de l'exercice"
                placeholderTextColor={colors.onSurfaceTertiary}
              />

              {/* Mode selector */}
              <View style={styles.modeRow}>
                {MODES.map((m) => {
                  const active = ex.mode === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      testID={`ex-mode-${ex.id}-${m.key}`}
                      style={[
                        styles.modeChip,
                        active && styles.modeChipActive,
                      ]}
                      onPress={() =>
                        updateExercise(ex.id, {
                          mode: m.key,
                          sets:
                            m.key === "amrap"
                              ? 1
                              : m.key === "emom"
                                ? ex.sets || 10
                                : ex.sets || 3,
                          duration_seconds:
                            m.key === "reps"
                              ? null
                              : m.key === "emom"
                                ? 60
                                : ex.duration_seconds || 300,
                          rest_seconds:
                            m.key === "amrap" || m.key === "emom"
                              ? 0
                              : ex.rest_seconds || 60,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.modeChipLabel,
                          active && { color: "#fff" },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.modeHint}>
                {MODES.find((m) => m.key === ex.mode)?.hint}
              </Text>

              {ex.mode === "reps" && (
                <>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Séries"
                      value={ex.sets}
                      onChange={(v) => updateExercise(ex.id, { sets: v })}
                    />
                    <FieldText
                      label="Reps"
                      value={ex.reps}
                      onChange={(v) => updateExercise(ex.id, { reps: v })}
                      placeholder="10 ou 8-12"
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Repos (s)"
                      value={ex.rest_seconds}
                      onChange={(v) => updateExercise(ex.id, { rest_seconds: v })}
                    />
                    <FieldText
                      label="Poids"
                      value={ex.weight || ""}
                      onChange={(v) =>
                        updateExercise(ex.id, { weight: v.trim() ? v : null })
                      }
                      placeholder="Ex: 40kg"
                    />
                  </View>
                </>
              )}

              {ex.mode === "time" && (
                <>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Séries"
                      value={ex.sets}
                      onChange={(v) => updateExercise(ex.id, { sets: v })}
                    />
                    <FieldNum
                      label="Durée (s)"
                      value={ex.duration_seconds ?? 300}
                      onChange={(v) =>
                        updateExercise(ex.id, { duration_seconds: v })
                      }
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Repos (s)"
                      value={ex.rest_seconds}
                      onChange={(v) => updateExercise(ex.id, { rest_seconds: v })}
                    />
                    <FieldText
                      label="Notes"
                      value={ex.notes || ""}
                      onChange={(v) =>
                        updateExercise(ex.id, { notes: v.trim() ? v : null })
                      }
                      placeholder="Ex: Burpees"
                    />
                  </View>
                </>
              )}

              {ex.mode === "amrap" && (
                <View style={styles.fieldRow}>
                  <FieldNum
                    label="Durée totale (s)"
                    value={ex.duration_seconds ?? 720}
                    onChange={(v) =>
                      updateExercise(ex.id, { duration_seconds: v })
                    }
                  />
                  <FieldText
                    label="Consigne"
                    value={ex.notes || ""}
                    onChange={(v) =>
                      updateExercise(ex.id, { notes: v.trim() ? v : null })
                    }
                    placeholder="10 squats + 5 pompes…"
                  />
                </View>
              )}

              {ex.mode === "emom" && (
                <>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Rounds (minutes)"
                      value={ex.sets}
                      onChange={(v) => updateExercise(ex.id, { sets: v })}
                    />
                    <FieldText
                      label="Reps / round"
                      value={ex.reps}
                      onChange={(v) => updateExercise(ex.id, { reps: v })}
                      placeholder="10"
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Durée round (s)"
                      value={ex.duration_seconds ?? 60}
                      onChange={(v) =>
                        updateExercise(ex.id, { duration_seconds: v })
                      }
                    />
                    <FieldText
                      label="Notes"
                      value={ex.notes || ""}
                      onChange={(v) =>
                        updateExercise(ex.id, { notes: v.trim() ? v : null })
                      }
                      placeholder="Ex: Pompes"
                    />
                  </View>
                </>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        style={styles.miniInput}
        value={String(value)}
        keyboardType="number-pad"
        onChangeText={(t) => onChange(parseInt(t || "0", 10) || 0)}
      />
    </View>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        style={styles.miniInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  inputCompact: { marginBottom: spacing.sm },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  typeChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  typeChipTextActive: { color: "#fff" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  addBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  emptyEx: {
    color: colors.onSurfaceTertiary,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  exCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  exCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exIdx: { color: colors.brand, fontWeight: "800", fontSize: 12 },
  fieldRow: { flexDirection: "row", gap: spacing.sm },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.onSurface,
    fontSize: 14,
  },
  modeRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: 3,
    marginTop: 4,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 4,
  },
  modeChipActive: { backgroundColor: colors.brand },
  modeChipLabel: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1,
  },
  modeHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 4,
  },
});
