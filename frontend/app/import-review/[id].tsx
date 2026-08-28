import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import CTAButton from "@/src/components/ui/CTAButton";
import PressableScale from "@/src/components/ui/PressableScale";
import ExerciseLinkModal from "@/src/components/ExerciseLinkModal";
import { getCustomPrograms, saveCustomProgram, uid } from "@/src/utils/gym-storage";
import type { Program } from "@/src/data/programs";
import { ExerciseRecord, getExerciseRecords, saveExerciseRecord } from "@/src/utils/exercise-records";
import { normalize } from "@/src/utils/exercise-library-merge";
import {
  buildExerciseIndex,
  matchExercise,
  learnAlias,
  matchScoreBand,
  MatchResult,
  MatchScoreBand,
} from "@/src/utils/exercise-matching";

function bandColor(theme: Theme, band: MatchScoreBand): string {
  if (band.color === "success") return theme.colors.success;
  if (band.color === "warning") return theme.colors.warning;
  if (band.color === "info") return theme.colors.info;
  return theme.colors.onSurfaceTertiary;
}

/**
 * Écran de revue post-import — n'apparaît que si `program-import.tsx` a
 * trouvé au moins un exercice "fuzzy" (suggestion à confirmer) ou "none"
 * (aucun candidat). Les exercices exact/alias sont déjà liés silencieusement
 * avant d'arriver ici — voir `exercise-matching.ts`. Résoudre une ligne ici
 * écrit un alias sur l'`ExerciseRecord` choisi (`learnAlias`), donc le même
 * texte importé matchera automatiquement au prochain import.
 *
 * Les compteurs (`linked`/`created`/`toReview`) sont exprimés en nombre
 * d'exercices du programme (instances), pas en noms uniques : résoudre "Squat"
 * une fois compte pour 3 si le programme contient 3 séances avec "Squat".
 */
export default function ImportReviewScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { id, autoLinked: autoLinkedParam } = useLocalSearchParams<{ id: string; autoLinked?: string }>();
  const router = useRouter();
  const autoLinked = Number(autoLinkedParam) || 0;
  const [program, setProgram] = useState<Program | null>(null);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [pending, setPending] = useState<MatchResult[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());
  const [linkedInstances, setLinkedInstances] = useState(0);
  const [createdInstances, setCreatedInstances] = useState(0);
  const [resolverFor, setResolverFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [programs, exerciseRecords] = await Promise.all([
        getCustomPrograms() as Promise<Program[]>,
        getExerciseRecords(),
      ]);
      const p = programs.find((x) => x.id === id) ?? null;
      setProgram(p);
      setRecords(exerciseRecords);
      if (!p) return;

      const index = buildExerciseIndex(exerciseRecords);
      // Regroupe par nom normalisé : une seule entrée de revue par nom
      // distinct, mais on garde le nombre d'exercices concernés pour que
      // le résumé final compte de vrais "exercices", pas des noms.
      const grouped = new Map<string, { rawName: string; count: number }>();
      for (const day of p.days) {
        for (const session of day.sessions) {
          for (const exercise of session.exercises) {
            if (exercise.matchConfidence !== "fuzzy" && exercise.matchConfidence !== "unmatched") continue;
            const key = normalize(exercise.name);
            const g = grouped.get(key);
            if (g) g.count += 1;
            else grouped.set(key, { rawName: exercise.name, count: 1 });
          }
        }
      }
      const results: MatchResult[] = [];
      const counts = new Map<string, number>();
      for (const { rawName, count } of grouped.values()) {
        results.push(matchExercise(rawName, index));
        counts.set(normalize(rawName), count);
      }
      setPending(results);
      setPendingCounts(counts);
    })();
  }, [id]);

  const finish = () => {
    const toReview = pending.reduce((sum, r) => sum + (pendingCounts.get(normalize(r.rawName)) ?? 1), 0);
    const params = new URLSearchParams({
      linked: String(autoLinked + linkedInstances),
      created: String(createdInstances),
      toReview: String(toReview),
    });
    router.replace(`/custom-program/${id}?${params.toString()}` as any);
  };

  // Rien (ou plus rien) à revoir — pas d'écran vide à traverser.
  useEffect(() => {
    if (program && pending.length === 0) finish();
  }, [program, pending]);

  const applyResolution = async (rawName: string, record: ExerciseRecord, created: boolean) => {
    if (!program) return;

    const learned = learnAlias(record, rawName);
    if (learned !== record) {
      await saveExerciseRecord(learned);
      setRecords((prev) => prev.map((r) => (r.id === learned.id ? learned : r)));
    }

    const key = normalize(rawName);
    const nextProgram: Program = {
      ...program,
      days: program.days.map((day) => ({
        ...day,
        sessions: day.sessions.map((session) => ({
          ...session,
          exercises: session.exercises.map((ex) =>
            normalize(ex.name) === key
              ? { ...ex, exerciseRecordId: learned.id, matchConfidence: "manual" as const }
              : ex,
          ),
        })),
      })),
    };
    await saveCustomProgram(nextProgram);
    setProgram(nextProgram);
    setPending((prev) => prev.filter((r) => normalize(r.rawName) !== key));
    const count = pendingCounts.get(key) ?? 1;
    if (created) setCreatedInstances((c) => c + count);
    else setLinkedInstances((c) => c + count);
    setResolverFor(null);
  };

  if (!program) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={styles.loading}>Chargement…</Text>
        </SafeAreaView>
      </View>
    );
  }

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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Vérifier les exercices</Text>
          <Text style={styles.subtitle}>
            {pending.length} exercice{pending.length > 1 ? "s" : ""} à lier à ta bibliothèque
          </Text>
        </View>
        <Pressable testID="import-review-skip" onPress={finish} hitSlop={12}>
          <Text style={styles.skipText}>PASSER</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hintCard}>
          <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
          <Text style={styles.hintText}>
            Ces exercices n&apos;ont pas de correspondance sûre dans ta bibliothèque. Choisis une
            suggestion, cherche l&apos;exercice existant, ou laisse-le en texte libre — tu pourras
            toujours le corriger plus tard dans le programme.
          </Text>
        </View>

        {pending.map((result) => (
          <Card key={result.rawName} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={2}>
                {result.rawName}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      result.status === "fuzzy" ? withAlpha(theme.colors.warning, 18) : withAlpha(theme.colors.onSurfaceTertiary, 15),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: result.status === "fuzzy" ? theme.colors.warning : theme.colors.onSurfaceTertiary },
                  ]}
                >
                  {result.status === "fuzzy" ? "SUGGESTION" : "AUCUN MATCH"}
                </Text>
              </View>
            </View>

            {result.suggestions.map((s, i) => {
              const band = matchScoreBand(s.score);
              const color = bandColor(theme, band);
              return (
                <PressableScale
                  key={s.id}
                  testID={`import-review-suggestion-${result.rawName}-${s.id}`}
                  style={[styles.suggestionRow, i === 0 && { borderWidth: 1.5, borderColor: theme.colors.brand }]}
                  onPress={() => {
                    const record = records.find((r) => r.id === s.id);
                    if (record) applyResolution(result.rawName, record, false);
                  }}
                >
                  <Ionicons name="link" size={14} color={theme.colors.brand} />
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View style={[styles.scoreBadge, { backgroundColor: withAlpha(color, 18) }]}>
                    <Text style={[styles.scoreBadgeText, { color }]}>
                      {Math.round(s.score * 100)}% · {band.label}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}

            <Pressable
              testID={`import-review-search-${result.rawName}`}
              style={styles.searchBtn}
              onPress={() => setResolverFor(result.rawName)}
            >
              <Ionicons name="search" size={13} color={theme.colors.onSurfaceSecondary} />
              <Text style={styles.searchBtnText}>Chercher ou créer un exercice</Text>
            </Pressable>
          </Card>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <CTAButton label="TERMINER" variant="primary" icon="checkmark" onPress={finish} testID="import-review-finish" />
      </View>

      {resolverFor && (
        <ExerciseLinkModal
          rawName={resolverFor}
          records={records}
          onClose={() => setResolverFor(null)}
          onPickRecord={(record) => applyResolution(resolverFor, record, false)}
          onCreateRecord={async (nameFr, category, equipment) => {
            const record: ExerciseRecord = {
              id: uid(),
              source: "custom",
              nameFr,
              nameEn: null,
              category,
              equipment,
              createdAt: new Date().toISOString(),
            };
            await saveExerciseRecord(record);
            setRecords((prev) => [...prev, record]);
            await applyResolution(resolverFor, record, true);
          }}
        />
      )}
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  return StyleSheet.create({
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
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  skipText: { color: colors.onSurfaceTertiary, fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
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
  hintText: { flex: 1, color: colors.brandSecondary, fontSize: 11, lineHeight: 15 },
  itemCard: { gap: spacing.sm },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  itemName: { flex: 1, color: colors.onSurface, fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  suggestionName: { flex: 1, color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  scoreBadgeText: { fontSize: 10, fontWeight: "800" },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBtnText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  });
}
