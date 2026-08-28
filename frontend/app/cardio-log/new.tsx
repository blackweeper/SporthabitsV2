import { useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABEL,
  CardioActivity,
  estimateCalories,
  saveSession,
  uid,
  WorkoutSession,
} from "@/src/utils/gym-storage";

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

/**
 * Quick log for a cardio activity done outside of a full program/session —
 * reachable from the global Actions rapides button. Produces a normal
 * WorkoutSession (planType "cardio", no exercises) so it shows up in
 * history/stats exactly like a session started from a cardio program.
 */
export default function NewCardioLogScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [activity, setActivity] = useState<CardioActivity>("course");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [seconds, setSeconds] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [bodyWeight, setBodyWeight] = useState("70");
  const [notes, setNotes] = useState("");

  const durationSeconds = useMemo(() => {
    const h = parseInt(hours || "0", 10) || 0;
    const m = parseInt(minutes || "0", 10) || 0;
    const s = parseInt(seconds || "0", 10) || 0;
    return h * 3600 + m * 60 + s;
  }, [hours, minutes, seconds]);

  const bodyMassKg = parseFloat(bodyWeight.replace(",", ".")) || 70;
  const estimatedCalories = useMemo(
    () =>
      durationSeconds > 0
        ? estimateCalories("cardio", durationSeconds, bodyMassKg)
        : 0,
    [durationSeconds, bodyMassKg],
  );

  const save = async () => {
    if (durationSeconds <= 0) {
      Alert.alert("Durée requise", "Renseigne une durée valide.");
      return;
    }
    const km = parseFloat(distanceKm.replace(",", "."));
    const distance_m = !isNaN(km) && km > 0 ? Math.round(km * 1000) : null;
    const now = new Date();
    const startedAt = new Date(now.getTime() - durationSeconds * 1000).toISOString();

    const session: WorkoutSession = {
      id: uid(),
      planId: "quick-cardio",
      planTitle: CARDIO_ACTIVITY_LABEL[activity],
      planType: "cardio",
      startedAt,
      endedAt: now.toISOString(),
      durationSeconds,
      totalRestSeconds: 0,
      caloriesBurned: estimatedCalories,
      exercises: [],
      cardio_activity: activity,
      cardio_metrics: distance_m ? { distance_m } : null,
      journal: notes.trim() ? { comment: notes.trim() } : null,
    };
    await saveSession(session);
    router.back();
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
        <Pressable testID="close-cardio-log" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Activité cardio</Text>
        <Pressable testID="save-cardio-log" onPress={save} hitSlop={12}>
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
          <Text style={styles.label}>Activité</Text>
          <View style={styles.activityGrid}>
            {ACTIVITIES.map((a) => {
              const active = activity === a;
              return (
                <Pressable
                  key={a}
                  testID={`cardio-activity-${a}`}
                  style={[styles.activityChip, active && styles.activityChipActive]}
                  onPress={() => setActivity(a)}
                >
                  <Text style={{ fontSize: 16 }}>{CARDIO_ACTIVITY_EMOJI[a]}</Text>
                  <Text
                    style={[
                      styles.activityChipText,
                      active && { color: "#fff" },
                    ]}
                  >
                    {CARDIO_ACTIVITY_LABEL[a]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Durée</Text>
          <View style={styles.timeRow}>
            <TimeBox label="H" value={hours} onChange={setHours} testID="cardio-hours" />
            <Text style={styles.timeSep}>:</Text>
            <TimeBox label="MIN" value={minutes} onChange={setMinutes} testID="cardio-minutes" />
            <Text style={styles.timeSep}>:</Text>
            <TimeBox label="SEC" value={seconds} onChange={setSeconds} testID="cardio-seconds" />
          </View>

          <Text style={styles.label}>Distance (km, optionnel)</Text>
          <TextInput
            testID="cardio-distance"
            style={styles.input}
            keyboardType="decimal-pad"
            value={distanceKm}
            onChangeText={setDistanceKm}
            placeholder="Ex: 8.5"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />

          {durationSeconds > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>CALORIES ESTIMÉES</Text>
              <Text style={styles.previewValue}>{estimatedCalories} kcal</Text>
            </View>
          )}

          <Text style={styles.label}>Poids corporel (kg) — pour les calories</Text>
          <TextInput
            testID="cardio-bodyweight"
            style={styles.input}
            keyboardType="decimal-pad"
            value={bodyWeight}
            onChangeText={setBodyWeight}
            placeholder="70"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />

          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            testID="cardio-notes"
            style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ressenti, parcours…"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            multiline
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TimeBox({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={styles.timeBox}>
      <TextInput
        testID={testID}
        style={styles.timeInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 3))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={theme.colors.onSurfaceTertiary}
      />
      <Text style={styles.timeLabel}>{label}</Text>
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
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  activityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityChipActive: {
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    borderColor: colors.brand,
  },
  activityChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  timeBox: { flex: 1, alignItems: "center" },
  timeInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 12,
    width: "100%",
  },
  timeLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
  },
  timeSep: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: -14,
  },
  previewCard: {
    marginTop: spacing.md,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  previewLabel: {
    color: "#fff",
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.9,
  },
  previewValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  });
}
