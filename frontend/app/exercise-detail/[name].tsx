import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { EXERCISE_CATEGORY_COLOR, EXERCISE_CATEGORY_LABEL } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { getPRs, getSessions, PersonalRecord, WorkoutSession } from "@/src/utils/gym-storage";
import { computeExerciseDetail } from "@/src/utils/exercise-detail";
import { useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import { ExerciseRecord, getExerciseRecords } from "@/src/utils/exercise-records";
import { ensureMediaCached } from "@/src/utils/exercise-media-cache";

/**
 * Full coaching-content fiche for a single exercise. Even though today's
 * data (static library + custom exercises) doesn't yet carry step-by-step
 * instructions/tips/common-mistakes, the sections are built now so the
 * final structure (démonstration, description, muscles, étapes, conseils,
 * erreurs, historique) is already in place once WorkoutX data lands.
 */
export default function ExerciseDetailFiche() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const decoded = decodeURIComponent(name ?? "");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [remoteImageUri, setRemoteImageUri] = useState<string | null>(null);
  const [libraryRecord, setLibraryRecord] = useState<ExerciseRecord | null>(null);

  const { items, customExercises, toggleFavorite } = useExerciseLibraryItems(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSessions(await getSessions());
        setPRs(await getPRs());
      })();
    }, []),
  );

  // If a WorkoutX-imported ExerciseRecord matching this name exists (i.e. a
  // library update has run), prefer its remote demonstration media, cached
  // locally on first view. Until an update actually runs, no record matches
  // and the legacy imageBase64/emoji display below is used unchanged.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const records = await getExerciseRecords();
        const key = decoded.toLowerCase().trim();
        const match = records.find(
          (r) =>
            r.nameFr.toLowerCase().trim() === key ||
            r.nameEn?.toLowerCase().trim() === key ||
            (r.aliases ?? []).some((a) => a.toLowerCase().trim() === key),
        );
        if (!cancelled) setLibraryRecord(match ?? null);
        const remoteUrl = match?.media?.primaryImage?.remoteUrl;
        if (!remoteUrl) return;
        const uri = await ensureMediaCached(remoteUrl);
        if (!cancelled) setRemoteImageUri(uri);
      })();
      return () => {
        cancelled = true;
      };
    }, [decoded]),
  );

  const item = useMemo(
    () => items.find((i) => i.name.toLowerCase().trim() === decoded.toLowerCase().trim()),
    [items, decoded],
  );
  const custom = useMemo(
    () => (item?.customId ? customExercises.find((c) => c.id === item.customId) : undefined),
    [item, customExercises],
  );
  const detail = useMemo(
    () => computeExerciseDetail(decoded, sessions, prs),
    [decoded, sessions, prs],
  );
  // Phase B5 display-priority rule: prefer IronFlow's own enriched French
  // content over the raw WorkoutX-derived fields on `ExerciseRecord` — see
  // ExerciseEnrichment in src/utils/exercise-records.ts. `fr` stays
  // undefined until `enrich-library-content.ts` has actually run.
  const fr = libraryRecord?.enrichment?.translations?.fr;

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable testID="close-ex-detail" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {decoded}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="help-circle" size={40} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>Exercice introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const color = EXERCISE_CATEGORY_COLOR[item.category];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="close-ex-detail" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <Pressable
          testID="ex-detail-fav"
          hitSlop={12}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={item.favorite ? "star" : "star-outline"}
            size={22}
            color={item.favorite ? "#FFC107" : colors.onSurface}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Démonstration visuelle */}
        {remoteImageUri || item.imageBase64 ? (
          <Image
            source={{
              uri: remoteImageUri ?? `data:image/webp;base64,${item.imageBase64}`,
            }}
            style={styles.hero}
          />
        ) : (
          <View style={[styles.hero, styles.heroFallback, { backgroundColor: color + "26" }]}>
            <Text style={{ fontSize: 56 }}>{item.emoji ?? iconEmojiForExercise(item.name, null)}</Text>
            <Text style={styles.heroHint}>Démonstration bientôt disponible</Text>
          </View>
        )}

        <View style={[styles.catBadge, { backgroundColor: color + "26", borderColor: color }]}>
          <Text style={[styles.catBadgeText, { color }]}>{EXERCISE_CATEGORY_LABEL[item.category]}</Text>
        </View>

        {/* Muscles + équipement */}
        <Text style={styles.sectionTitle}>Muscles travaillés</Text>
        {item.muscleGroups && item.muscleGroups.length > 0 ? (
          <View style={styles.chipWrap}>
            {item.muscleGroups.map((mg) => {
              const def = MUSCLE_GROUPS.find((m) => m.key === mg);
              return (
                <View key={mg} style={styles.metaChip}>
                  <Text style={{ fontSize: 12 }}>{def?.emoji}</Text>
                  <Text style={styles.metaChipText}>{def?.label ?? mg}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Bientôt disponible</Text>
        )}

        <Text style={styles.sectionTitle}>Équipement</Text>
        <Text style={styles.bodyText}>{custom?.equipment ?? item.equipment ?? "Bientôt disponible"}</Text>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.bodyText}>
          {custom?.description ?? fr?.description ?? libraryRecord?.description ?? "Bientôt disponible"}
        </Text>

        <Text style={styles.sectionTitle}>Étapes d&apos;exécution</Text>
        {(fr?.instructions ?? libraryRecord?.instructions)?.length ? (
          <View style={{ marginTop: 4, gap: 6 }}>
            {(fr?.instructions ?? libraryRecord?.instructions ?? []).map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.bodyText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Bientôt disponible</Text>
        )}

        <Text style={styles.sectionTitle}>Conseils</Text>
        {(fr?.executionTips ?? libraryRecord?.tips)?.length ? (
          <View style={{ marginTop: 4, gap: 4 }}>
            {(fr?.executionTips ?? libraryRecord?.tips ?? []).map((tip, i) => (
              <Text key={i} style={styles.bodyText}>
                • {tip}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Bientôt disponible</Text>
        )}

        <Text style={styles.sectionTitle}>Erreurs fréquentes</Text>
        {(fr?.commonMistakes ?? libraryRecord?.commonMistakes)?.length ? (
          <View style={{ marginTop: 4, gap: 4 }}>
            {(fr?.commonMistakes ?? libraryRecord?.commonMistakes ?? []).map((mistake, i) => (
              <Text key={i} style={styles.bodyText}>
                • {mistake}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Bientôt disponible</Text>
        )}

        {/* Historique personnel */}
        <Text style={styles.sectionTitle}>Historique personnel</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Ionicons name="checkmark-done" size={14} color={color} />
            <Text style={styles.kpiVal}>{detail.totalOccurrences}</Text>
            <Text style={styles.kpiLabel}>Séances</Text>
          </View>
          <View style={styles.kpiBox}>
            <Ionicons name="trophy" size={14} color={color} />
            <Text style={styles.kpiVal}>{detail.linkedPRs.length}</Text>
            <Text style={styles.kpiLabel}>Records</Text>
          </View>
        </View>

        {detail.lastSession && (
          <View style={styles.lastSessionCard}>
            <Text style={styles.lastSessionLabel}>DERNIÈRE FOIS</Text>
            <Text style={styles.lastSessionValue}>
              {detail.lastSession.weight ? `${detail.lastSession.weight} kg × ` : ""}
              {detail.lastSession.reps || `${detail.lastSession.setsDone} séries`}
            </Text>
            <Text style={styles.lastSessionDate}>
              {new Date(detail.lastSession.date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        )}

        <Pressable
          testID="ex-detail-open-stats"
          style={styles.statsBtn}
          onPress={() => router.push(`/exercise/${encodeURIComponent(item.name)}`)}
        >
          <Ionicons name="stats-chart" size={16} color={colors.brand} />
          <Text style={styles.statsBtnText}>Voir mes statistiques détaillées</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
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
    gap: spacing.md,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700", flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { color: colors.onSurfaceTertiary },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceTertiary,
  },
  heroFallback: { alignItems: "center", justifyContent: "center", gap: 8 },
  heroHint: { color: colors.onSurfaceTertiary, fontSize: 11, fontStyle: "italic" },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  catBadgeText: { fontWeight: "800", fontSize: 11, letterSpacing: 0.6 },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  bodyText: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  placeholderText: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepNum: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 13,
    width: 18,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  kpiGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  kpiBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  kpiVal: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginTop: 4 },
  kpiLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  lastSessionCard: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  lastSessionLabel: { color: "#fff", letterSpacing: 2, fontSize: 10, fontWeight: "800", opacity: 0.9 },
  lastSessionValue: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 },
  lastSessionDate: { color: "#fff", opacity: 0.85, fontSize: 11, marginTop: 4 },
  statsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    justifyContent: "center",
  },
  statsBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13 },
});
