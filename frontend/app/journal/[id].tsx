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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  CardioActivity,
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABEL,
  getSession,
  saveSession,
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

export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);

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

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const j = session.journal ?? {};
  const cm = session.cardio_metrics ?? {};
  const showCardio = ["cardio", "mixte", "hiit"].includes(session.planType);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
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

            <Text style={styles.miniLabel}>Douleurs / gênes</Text>
            <TextInput
              testID="journal-pain"
              style={styles.textArea}
              value={j.pain || ""}
              onChangeText={(t) => patchJournal({ pain: t.trim() ? t : null })}
              placeholder="Ex: petite douleur à l'épaule droite"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
            />

            <Text style={styles.miniLabel}>Alimentation avant/après</Text>
            <TextInput
              testID="journal-nutrition"
              style={styles.textArea}
              value={j.nutrition || ""}
              onChangeText={(t) => patchJournal({ nutrition: t.trim() ? t : null })}
              placeholder="Ex: banane + café avant, shake après"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
            />

            <Text style={styles.miniLabel}>Commentaire libre</Text>
            <TextInput
              testID="journal-comment"
              style={[styles.textArea, { minHeight: 100 }]}
              value={j.comment || ""}
              onChangeText={(t) => patchJournal({ comment: t.trim() ? t : null })}
              placeholder="Séance intense, bon feeling…"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Ionicons name={icon} size={14} color={colors.brand} />
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
        placeholderTextColor={colors.onSurfaceTertiary}
      />
    </View>
  );
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
  actChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
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
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
});
