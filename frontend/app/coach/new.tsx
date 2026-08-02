import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";
import {
  TRAINING_GOALS,
  TRAINING_GOAL_LABEL,
  TrainingGoal,
} from "@/src/utils/exercise-training-goal";
import { LEVEL_LABEL, ProgramLevel } from "@/src/data/programs";
import { EXERCISE_EQUIPMENT, ExerciseEquipment } from "@/src/utils/exercise-equipment";
import {
  PAIN_ZONE_LABEL,
  PainZone,
  addActiveProgram,
  getProfile,
  getSessions,
  saveCustomProgram,
  saveProfile,
} from "@/src/utils/gym-storage";
import { getExerciseRecords } from "@/src/utils/exercise-records";
import { generateProgram } from "@/src/utils/coach-engine";
import { computeLearningSignals } from "@/src/utils/coach-learning";

const LEVELS: ProgramLevel[] = ["debutant", "intermediaire", "avance"];
const PAIN_ZONES: PainZone[] = Object.keys(PAIN_ZONE_LABEL) as PainZone[];

type Capacities = {
  strength: number;
  cardio: number;
  mobility: number;
  weightliftingTechnique: number;
  muscularEndurance: number;
};

const CAPACITY_FIELDS: { key: keyof Capacities; label: string }[] = [
  { key: "strength", label: "Force" },
  { key: "cardio", label: "Cardio" },
  { key: "mobility", label: "Mobilité" },
  { key: "weightliftingTechnique", label: "Technique haltérophilie" },
  { key: "muscularEndurance", label: "Endurance musculaire" },
];

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  testID: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        testID={`${testID}-dec`}
        style={styles.stepperBtn}
        onPress={() => onChange(Math.max(min, value - step))}
        hitSlop={8}
      >
        <Ionicons name="remove" size={18} color="#fff" />
      </Pressable>
      <Text style={styles.stepperVal}>
        {value}
        {suffix ?? ""}
      </Text>
      <Pressable
        testID={`${testID}-inc`}
        style={styles.stepperBtn}
        onPress={() => onChange(Math.min(max, value + step))}
        hitSlop={8}
      >
        <Ionicons name="add" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function CoachNewScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState<TrainingGoal>("hypertrophy");
  const [level, setLevel] = useState<ProgramLevel>("intermediaire");
  const [frequency, setFrequency] = useState(4);
  const [duration, setDuration] = useState(45);
  const [equipment, setEquipment] = useState<ExerciseEquipment[]>([]);
  const [painZones, setPainZones] = useState<PainZone[]>([]);
  const [capacities, setCapacities] = useState<Capacities>({
    strength: 5,
    cardio: 5,
    mobility: 5,
    weightliftingTechnique: 5,
    muscularEndurance: 5,
  });
  const [generating, setGenerating] = useState(false);
  const [learningSignals, setLearningSignals] = useState<{
    exerciseFailureRate: Record<string, number>;
    frequencyFromHistory: boolean;
    durationFromHistory: boolean;
    observedWeeklyFrequency: number | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile.experienceLevel) setLevel(profile.experienceLevel);
      const constraints = profile.athleteConstraints;
      if (constraints?.weeklyFrequency) setFrequency(constraints.weeklyFrequency);
      if (constraints?.sessionDurationMinutes) setDuration(constraints.sessionDurationMinutes);
      if (constraints?.availableEquipment) setEquipment(constraints.availableEquipment);
      if (constraints?.painZones) setPainZones(constraints.painZones);
      const cap = profile.athleteCapacities;
      if (cap) {
        setCapacities({
          strength: cap.strength ?? 5,
          cardio: cap.cardio ?? 5,
          mobility: cap.mobility ?? 5,
          weightliftingTechnique: cap.weightliftingTechnique ?? 5,
          muscularEndurance: cap.muscularEndurance ?? 5,
        });
      }

      // Niveau 3 — le comportement réel récent prime sur l'intention déclarée
      // au dernier questionnaire (l'objectif du brief : "l'utilisateur s'entraîne
      // réellement 3x/semaine alors que son objectif était 6 -> adapter").
      const sessions = await getSessions();
      const signals = computeLearningSignals(sessions);
      let frequencyFromHistory = false;
      let durationFromHistory = false;
      if (signals.observedWeeklyFrequency) {
        setFrequency(Math.min(6, Math.max(2, Math.round(signals.observedWeeklyFrequency))));
        frequencyFromHistory = true;
      }
      if (signals.observedSessionDurationMinutes) {
        setDuration(Math.min(90, Math.max(20, Math.round(signals.observedSessionDurationMinutes / 5) * 5)));
        durationFromHistory = true;
      }
      setLearningSignals({
        exerciseFailureRate: signals.exerciseFailureRate,
        frequencyFromHistory,
        durationFromHistory,
        observedWeeklyFrequency: signals.observedWeeklyFrequency,
      });
    })();
  }, []);

  function toggleEquipment(e: ExerciseEquipment) {
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }
  function togglePain(z: PainZone) {
    setPainZones((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]));
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      const allExercises = await getExerciseRecords();
      const hasFailureSignal = learningSignals && Object.keys(learningSignals.exerciseFailureRate).length > 0;
      const program = generateProgram({
        allExercises,
        primaryGoal: goal,
        level,
        weeklyFrequency: frequency,
        sessionDurationMinutes: duration,
        availableEquipment: equipment.length ? equipment : null,
        painZones: painZones.length ? painZones : null,
        athleteCapacities: { ...capacities, updatedAt: new Date().toISOString() },
        exerciseFailureRate: hasFailureSignal ? learningSignals!.exerciseFailureRate : null,
        historyInformed: !!(learningSignals?.frequencyFromHistory || learningSignals?.durationFromHistory),
      });

      await saveCustomProgram(program);
      await addActiveProgram({
        programId: program.id,
        startedAt: new Date().toISOString(),
        completedSessions: [],
      });

      const profile = await getProfile();
      await saveProfile({
        ...profile,
        experienceLevel: level,
        athleteCapacities: { ...capacities, updatedAt: new Date().toISOString() },
        athleteConstraints: {
          weeklyFrequency: frequency,
          sessionDurationMinutes: duration,
          availableEquipment: equipment.length ? equipment : null,
          painZones: painZones.length ? painZones : null,
        },
      });

      router.replace(`/program/${program.id}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="coach-close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Coach IronFlow</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Réponds à quelques questions, le moteur IronFlow construit ton plan d&apos;entraînement — sans IA, à partir de notre bibliothèque d&apos;exercices.
        </Text>

        <Text style={styles.sectionTitle}>Objectif</Text>
        <View style={styles.chipGrid}>
          {TRAINING_GOALS.map((g) => {
            const active = goal === g;
            return (
              <PressableScale
                key={g}
                testID={`coach-goal-${g}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setGoal(g)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {TRAINING_GOAL_LABEL[g]}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Niveau d&apos;expérience</Text>
        <View style={styles.chipGrid}>
          {LEVELS.map((l) => {
            const active = level === l;
            return (
              <PressableScale
                key={l}
                testID={`coach-level-${l}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{LEVEL_LABEL[l]}</Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Séances par semaine</Text>
          <NumberStepper testID="coach-frequency" value={frequency} onChange={setFrequency} min={2} max={6} />
        </View>
        {learningSignals?.frequencyFromHistory && (
          <Text testID="coach-frequency-hint" style={styles.historyHint}>
            Ajusté depuis tes 4 dernières semaines réelles ({learningSignals.observedWeeklyFrequency}x/semaine observées).
          </Text>
        )}

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Durée d&apos;une séance</Text>
          <NumberStepper
            testID="coach-duration"
            value={duration}
            onChange={setDuration}
            min={20}
            max={90}
            step={5}
            suffix=" min"
          />
        </View>
        {learningSignals?.durationFromHistory && (
          <Text testID="coach-duration-hint" style={styles.historyHint}>
            Ajusté depuis la durée moyenne de tes dernières séances réelles.
          </Text>
        )}

        <Text style={styles.sectionTitle}>Matériel disponible</Text>
        <Text style={styles.sectionHint}>Rien coché = tout le matériel est considéré disponible.</Text>
        <View style={styles.chipGrid}>
          {EXERCISE_EQUIPMENT.map((e) => {
            const active = equipment.includes(e.key);
            return (
              <PressableScale
                key={e.key}
                testID={`coach-equipment-${e.key}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleEquipment(e.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.label}</Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Douleurs actuelles</Text>
        <Text style={styles.sectionHint}>Les mouvements à risque pour ces zones seront exclus, pas seulement déconseillés.</Text>
        <View style={styles.chipGrid}>
          {PAIN_ZONES.map((z) => {
            const active = painZones.includes(z);
            return (
              <PressableScale
                key={z}
                testID={`coach-pain-${z}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => togglePain(z)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{PAIN_ZONE_LABEL[z]}</Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Ton profil sportif</Text>
        <Text style={styles.sectionHint}>Sur 10 — le moteur privilégie le développement de tes points faibles.</Text>
        {CAPACITY_FIELDS.map((f) => (
          <View key={f.key} style={styles.fieldRow}>
            <Text style={styles.label}>{f.label}</Text>
            <NumberStepper
              testID={`coach-capacity-${f.key}`}
              value={capacities[f.key]}
              onChange={(v) => setCapacities((prev) => ({ ...prev, [f.key]: v }))}
              min={0}
              max={10}
            />
          </View>
        ))}

        <Pressable
          testID="coach-generate"
          style={[styles.generateBtn, generating && { opacity: 0.7 }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>GÉNÉRER MON PLAN</Text>
            </>
          )}
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 20 },
  intro: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  sectionHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  label: { color: colors.onSurface, fontSize: 13, fontWeight: "600", flex: 1 },
  historyHint: {
    color: colors.info,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: -4,
    marginBottom: 4,
  },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.brand, 25),
    alignItems: "center",
    justifyContent: "center",
  },
  stepperVal: { color: colors.onSurface, fontSize: 15, fontWeight: "800", minWidth: 44, textAlign: "center" },
  generateBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  generateBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
