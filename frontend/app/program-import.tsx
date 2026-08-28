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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { parseProgramText } from "@/src/utils/program-parser";
import { saveCustomProgram } from "@/src/utils/gym-storage";
import { getExerciseRecords } from "@/src/utils/exercise-records";
import { buildExerciseIndex, matchExercise } from "@/src/utils/exercise-matching";

const EXAMPLE = `Programme Full Body 4 semaines
Jour 1
Musculation
Squat 4x8 90kg repos 90s
Développé couché 4x8 70kg repos 90s
Tirage poitrine à la poulie 3x12 repos 60s

Jour 2
Repos

Jour 3
Cardio
Rameur 20 min`;

export default function ProgramImportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { program } = parseProgramText(text);

      // Lie chaque exercice importé à la vraie bibliothèque (exact/alias
      // uniquement — jamais de fuzzy auto-appliqué, voir exercise-matching.ts).
      // Un seul index construit pour tout le programme, réutilisé pour
      // chaque nom rencontré (une passe de lookup O(1) par exercice).
      const records = await getExerciseRecords();
      const index = buildExerciseIndex(records);
      const resultByName = new Map<string, ReturnType<typeof matchExercise>>();
      // Comptés en instances d'exercice (pas en noms uniques) pour que le
      // résumé affiché plus tard reflète le vrai nombre d'exercices du
      // programme — voir buildImportSummary dans custom-program/[id].tsx.
      let autoLinked = 0;
      let needsReview = 0;

      for (const day of program.days) {
        for (const session of day.sessions) {
          for (const exercise of session.exercises) {
            const key = exercise.name.toLowerCase().trim();
            let result = resultByName.get(key);
            if (!result) {
              result = matchExercise(exercise.name, index);
              resultByName.set(key, result);
            }
            if (result.status === "exact" || result.status === "alias") {
              exercise.exerciseRecordId = result.exerciseRecordId;
              exercise.matchConfidence = result.status;
              autoLinked += 1;
            } else {
              exercise.matchConfidence = result.status === "fuzzy" ? "fuzzy" : "unmatched";
              needsReview += 1;
            }
          }
        }
      }

      await saveCustomProgram(program);
      if (needsReview > 0) {
        router.replace(`/import-review/${program.id}?autoLinked=${autoLinked}` as any);
      } else {
        const params = new URLSearchParams({ linked: String(autoLinked), created: "0", toReview: "0" });
        router.replace(`/custom-program/${program.id}?${params.toString()}` as any);
      }
    } finally {
      setBusy(false);
    }
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Importer un programme</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
            <Text style={styles.hintText}>
              Colle un programme structuré (semaines, jours, blocs Musculation/Cardio/WOD,
              exercices avec séries x répétitions). L&apos;analyse est automatique mais jamais
              parfaite — tu pourras tout corriger juste après (exercices, séries, charges, ordre…).
            </Text>
          </View>

          <Text style={styles.miniLabel}>Texte du programme</Text>
          <TextInput
            testID="program-import-text"
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            placeholder={EXAMPLE}
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            testID="program-import-analyze"
            style={[styles.analyzeBtn, (!text.trim() || busy) && { opacity: 0.5 }]}
            onPress={analyze}
            disabled={!text.trim() || busy}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={styles.analyzeBtnText}>{busy ? "ANALYSE…" : "ANALYSER"}</Text>
          </Pressable>

          <View style={{ height: 40 }} />
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
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTertiary,
    padding: 10,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  hintText: {
    flex: 1,
    color: colors.brandSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 4,
  },
  textArea: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    minHeight: 260,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  analyzeBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8 },
  });
}
