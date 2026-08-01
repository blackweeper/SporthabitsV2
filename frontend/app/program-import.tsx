import { useState } from "react";
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
import { parseProgramText, findUnrecognizedNames } from "@/src/utils/program-parser";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import { getCustomExercises, saveCustomProgram } from "@/src/utils/gym-storage";

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
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { program, unrecognized } = parseProgramText(text);
      const [customs] = await Promise.all([getCustomExercises()]);
      const knownNames = [
        ...EXERCISE_LIBRARY.map((e) => e.name),
        ...customs.map((c) => c.nameFr ?? ""),
      ];
      const stillUnrecognized = findUnrecognizedNames(unrecognized, knownNames);
      await saveCustomProgram(program);
      const suffix =
        stillUnrecognized.length > 0
          ? `?unrecognized=${encodeURIComponent(stillUnrecognized.join("|"))}`
          : "";
      router.replace(`/custom-program/${program.id}${suffix}` as any);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
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
            <Ionicons name="information-circle" size={14} color={colors.brand} />
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
            placeholderTextColor={colors.onSurfaceTertiary}
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
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  analyzeBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8 },
});
