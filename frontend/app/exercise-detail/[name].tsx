import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { colors, coloredShadow, motion, radius, spacing, withAlpha } from "@/src/theme";
import Card from "@/src/components/ui/Card";
import SegmentedTabRow from "@/src/components/ui/SegmentedTabRow";
import ExerciseMediaFrame from "@/src/components/exercise-library/ExerciseMediaFrame";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { EXERCISE_CATEGORY_COLOR, EXERCISE_CATEGORY_ICON, EXERCISE_CATEGORY_LABEL } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { EXERCISE_MUSCLE_GROUP_LABEL } from "@/src/utils/exercise-muscle-groups";
import { MOVEMENT_PATTERN_LABEL } from "@/src/utils/exercise-movement-pattern";
import { EXERCISE_DIFFICULTY_LABEL } from "@/src/utils/exercise-difficulty";
import { TRAINING_GOAL_LABEL } from "@/src/utils/exercise-training-goal";
import { DISCIPLINE_LABEL } from "@/src/utils/exercise-discipline";
import {
  Exercise,
  getPRs,
  getSessions,
  getPlans,
  savePlan,
  uid,
  Plan,
  PersonalRecord,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { computeExerciseDetail } from "@/src/utils/exercise-detail";
import { computeExerciseProgress } from "@/src/utils/exercise-progress";
import { findExerciseUsage } from "@/src/utils/exercise-usage";
import { useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import { ExerciseRecord, getExerciseRecords, isCoreVisible } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { useExerciseMediaSources } from "@/src/hooks/useExerciseMedia";
import { CORE_LIBRARY_ASSETS } from "@/src/data/core-library-assets.generated";
import { getAllPrograms } from "@/src/utils/programs";
import { Program } from "@/src/data/programs";
import PressableScale from "@/src/components/ui/PressableScale";
import StatHero from "@/src/components/ui/StatHero";
import { computeFicheCompleteness } from "@/src/utils/exercise-fiche-completeness";
import MuscleActivationView from "@/src/components/exercise-library/MuscleActivationView";
import { parseCompositeExerciseName, parseCompositePrefix, cleanCompositeItemLabel } from "@/src/utils/composite-exercise";
import CompositeExerciseImage from "@/src/components/CompositeExerciseImage";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * La fiche IronFlow — pas une fiche brute de base de données. Surface tout
 * ce que `ExerciseRecord`/`ExerciseEnrichment` modélisent déjà (pédagogie,
 * variantes, disciplines...) et se limite volontairement à un résumé
 * d'historique personnel : le détail (graphique, sélecteur de métrique,
 * liste complète de PR) reste sur `/exercise/[name]`, une intention
 * différente (analyser sa progression plutôt qu'apprendre le mouvement).
 */
export default function ExerciseDetailFiche() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const decoded = decodeURIComponent(name ?? "");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [libraryRecord, setLibraryRecord] = useState<ExerciseRecord | null>(null);
  const [allRecords, setAllRecords] = useState<ExerciseRecord[]>([]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  // Bascule illustration IronFlow ↔ GIF WorkoutX en place dans le hero,
  // même idiome que workout/[id].tsx — reset à "photo" à chaque exercice.
  const [heroMediaMode, setHeroMediaMode] = useState<"photo" | "gif">("photo");
  const [adviceTab, setAdviceTab] = useState<"technique" | "securite" | "niveau">("technique");

  const { items, customExercises, toggleFavorite } = useExerciseLibraryItems(true);

  useEffect(() => {
    setHeroMediaMode("photo");
    setAdviceTab("technique");
  }, [decoded]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSessions(await getSessions());
        setPRs(await getPRs());
        setPlans(await getPlans());
        setPrograms(await getAllPrograms());
      })();
    }, []),
  );

  // If a WorkoutX-imported ExerciseRecord matching this name exists (i.e. a
  // library update has run), its id drives the official media resolver
  // below. Until an update actually runs, no record matches and the legacy
  // imageBase64/emoji display is used unchanged.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const records = await getExerciseRecords();
        if (cancelled) return;
        setAllRecords(records);
        setLibraryRecord(matchExerciseRecord(decoded, records) ?? null);
      })();
      return () => {
        cancelled = true;
      };
    }, [decoded]),
  );

  // V3 — illustration IronFlow et GIF WorkoutX résolus indépendamment (pas
  // de priorité/fallback entre les deux) : la fiche les affiche ensemble,
  // chacun avec son rôle propre (identité visuelle vs démonstration du
  // mouvement) — voir le plan "Bibliothèque V3".
  const { ironflowUri, workoutxUri } = useExerciseMediaSources(libraryRecord?.id ?? null);
  // Priorité à l'asset embarqué dans le binaire (zéro réseau, disponible
  // même hors ligne dès le premier lancement) pour les exercices de la
  // bibliothèque de base ; repli sur le cache distant sinon.
  const bundledIllustration = libraryRecord?.id ? CORE_LIBRARY_ASSETS[libraryRecord.id] : undefined;
  const heroImageSource = bundledIllustration ?? (ironflowUri ? { uri: ironflowUri } : null);

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
  const enrichment = libraryRecord?.enrichment;

  const progress = useMemo(() => {
    if (!item) return null;
    return computeExerciseProgress(
      libraryRecord ? { id: libraryRecord.id, nameFr: item.name, nameEn: libraryRecord.nameEn } : item.name,
      sessions,
      prs,
    );
  }, [item, libraryRecord, sessions, prs]);

  const usage = useMemo(() => {
    if (!item) return [];
    return findExerciseUsage(item.name, libraryRecord?.aliases ?? [], programs, plans);
  }, [item, libraryRecord, programs, plans]);

  const variantLinks = useMemo(
    () => ({
      progression: enrichment?.progressionExercises ?? [],
      regression: enrichment?.regressionExercises ?? [],
    }),
    [enrichment],
  );

  const completeness = useMemo(
    () => (libraryRecord ? computeFicheCompleteness(libraryRecord) : null),
    [libraryRecord],
  );

  const currentDifficulty = enrichment?.difficulty ?? libraryRecord?.difficulty ?? null;
  const currentLevelGuidance = currentDifficulty ? enrichment?.levelGuidance?.[currentDifficulty] : null;

  const similarExercises = useMemo(() => {
    if (!libraryRecord || !item) return [];
    const exclude = new Set([
      normalize(item.name),
      ...variantLinks.progression.map((p) => normalize(p.name)),
      ...variantLinks.regression.map((p) => normalize(p.name)),
    ]);
    const myMuscle = enrichment?.verifiedPrimaryMuscle ?? libraryRecord.primaryMuscle;
    const myPattern = libraryRecord.movementPattern;
    if (!myMuscle && !myPattern) return [];
    return allRecords
      .filter((r) => r.id !== libraryRecord.id && !exclude.has(normalize(r.nameFr)))
      .filter((r) => isCoreVisible(r.exerciseTier))
      .filter((r) => {
        const muscle = r.enrichment?.verifiedPrimaryMuscle ?? r.primaryMuscle;
        return (myMuscle && muscle === myMuscle) || (myPattern && r.movementPattern === myPattern);
      })
      .slice(0, 6);
  }, [allRecords, libraryRecord, item, variantLinks, enrichment]);

  const addExerciseToPlan = async (plan: Plan) => {
    if (!item) return;
    const newExercise: Exercise = {
      id: uid(),
      name: item.name,
      mode: "reps",
      sets: 3,
      reps: "10",
      weight: null,
      rest_seconds: 60,
      duration_seconds: null,
      notes: null,
    };
    await savePlan({ ...plan, exercises: [...plan.exercises, newExercise] });
    setAddSheetOpen(false);
    router.push(`/plan/${plan.id}` as any);
  };

  const createPlanWithExercise = async () => {
    if (!item) return;
    const newPlan: Plan = {
      id: uid(),
      title: item.name,
      type: "musculation",
      createdAt: new Date().toISOString(),
      exercises: [
        {
          id: uid(),
          name: item.name,
          mode: "reps",
          sets: 3,
          reps: "10",
          weight: null,
          rest_seconds: 60,
          duration_seconds: null,
          notes: null,
        },
      ],
    };
    await savePlan(newPlan);
    setAddSheetOpen(false);
    router.push(`/plan/${newPlan.id}` as any);
  };

  // Une entrée composite (AMRAP/EMOM/relais — voir `parseCompositeExerciseName`)
  // ne matche jamais un `ExerciseLibraryItem` puisque son "nom" est la phrase
  // entière du circuit, pas un exercice unique — sans ce cas particulier,
  // l'écran retombait sur "Exercice introuvable". Fiche dédiée : le montage
  // en une image, puis chaque mouvement réel du circuit dans sa propre ligne,
  // cliquable vers sa vraie fiche quand une correspondance existe.
  const compositeItems = parseCompositeExerciseName(decoded);
  if (compositeItems) {
    const compositeTitle = parseCompositePrefix(decoded) ?? decoded;
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable testID="close-ex-detail" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {compositeTitle}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <CompositeExerciseImage items={compositeItems} records={allRecords} showLabel={false} />
          <Text style={styles.circuitFullName}>{decoded}</Text>
          <Card title="Mouvements du circuit" icon="list-outline">
            <View style={{ gap: spacing.sm }}>
              {compositeItems.map((raw, i) => {
                const cleaned = cleanCompositeItemLabel(raw);
                const record = matchExerciseRecord(cleaned, allRecords);
                const content = (
                  <>
                    <ExerciseThumbnail name={cleaned} records={allRecords} size={44} square />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.circuitRowName}>{raw}</Text>
                      {!record && (
                        <Text style={styles.circuitRowHint}>Pas encore dans la bibliothèque</Text>
                      )}
                    </View>
                    {record && (
                      <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
                    )}
                  </>
                );
                if (record) {
                  return (
                    <PressableScale
                      key={i}
                      testID={`circuit-item-${i}`}
                      style={styles.circuitRow}
                      onPress={() => router.push(`/exercise-detail/${encodeURIComponent(record.nameFr)}` as any)}
                    >
                      {content}
                    </PressableScale>
                  );
                }
                return (
                  <View key={i} testID={`circuit-item-${i}`} style={styles.circuitRow}>
                    {content}
                  </View>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
  const primaryMuscleLabel = enrichment?.verifiedPrimaryMuscle
    ? EXERCISE_MUSCLE_GROUP_LABEL[enrichment.verifiedPrimaryMuscle]
    : libraryRecord?.primaryMuscle
      ? EXERCISE_MUSCLE_GROUP_LABEL[libraryRecord.primaryMuscle]
      : null;
  const secondaryMuscleLabels = (
    enrichment?.verifiedSecondaryMuscles ??
    libraryRecord?.secondaryMuscles ??
    []
  ).map((m) => EXERCISE_MUSCLE_GROUP_LABEL[m]);
  const stabilizerMuscleLabels = (enrichment?.stabilizerMuscles ?? []).map(
    (m) => EXERCISE_MUSCLE_GROUP_LABEL[m],
  );
  const equipmentLabel = custom?.equipment ?? item.equipment ?? null;
  const hasRelated =
    variantLinks.regression.length > 0 || variantLinks.progression.length > 0 || similarExercises.length > 0;

  const statChips: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [];
  if (currentDifficulty) {
    statChips.push({ icon: "speedometer-outline", label: "Niveau", value: EXERCISE_DIFFICULTY_LABEL[currentDifficulty] });
  }
  if (primaryMuscleLabel) statChips.push({ icon: "body-outline", label: "Muscle", value: primaryMuscleLabel });
  if (equipmentLabel) statChips.push({ icon: "barbell-outline", label: "Matériel", value: equipmentLabel });
  if (libraryRecord?.movementPattern) {
    statChips.push({
      icon: "swap-horizontal-outline",
      label: "Mouvement",
      value: MOVEMENT_PATTERN_LABEL[libraryRecord.movementPattern],
    });
  }
  if (similarExercises.length > 0) {
    statChips.push({ icon: "git-branch-outline", label: "Similaires", value: String(similarExercises.length) });
  }

  const adviceHasTechnique = !!(fr?.warmupSuggestion || (fr?.executionTips ?? libraryRecord?.tips)?.length || fr?.breathingTips);
  const adviceHasSecurity = !!(
    fr?.precautions ||
    enrichment?.fatigueLevel ||
    (enrichment?.restTimeByGoal && Object.keys(enrichment.restTimeByGoal).length > 0) ||
    (enrichment?.alternativeEquipment && enrichment.alternativeEquipment.length > 0)
  );
  const adviceHasLevel = !!(enrichment?.levelGuidance && Object.keys(enrichment.levelGuidance).length > 0);
  const hasMoreInfo = usage.length > 0 || !!enrichment?.tags?.length || !!enrichment?.equipmentLevel;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="close-ex-detail" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <Pressable testID="ex-detail-fav" hitSlop={12} onPress={() => toggleFavorite(item.id)}>
          <Ionicons
            name={item.favorite ? "star" : "star-outline"}
            size={22}
            color={item.favorite ? "#FFC107" : colors.onSurface}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* En-tête — identité visuelle IronFlow + démonstration WorkoutX,
            toujours affichées ensemble dès qu'elles existent. Les deux
            cadres partagent les MÊMES bornes de hauteur : un même ratio
            (le cas courant) donne un rendu visuellement identique, sans
            jamais recadrer un ratio différent. */}
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <Card elevated style={styles.mediaCard} padding={spacing.sm}>
            <ExerciseMediaFrame
              testID="ex-detail-hero-media"
              source={
                heroMediaMode === "gif" && workoutxUri
                  ? { uri: workoutxUri }
                  : (heroImageSource ?? (item.imageBase64 ? { uri: `data:image/webp;base64,${item.imageBase64}` } : null))
              }
              fallbackEmoji={item.emoji ?? iconEmojiForExercise(item.name, null)}
              fallbackTint={color}
              fallbackHint="Illustration bientôt disponible"
              minHeight={240}
              maxHeight={340}
              badgeIcon={heroMediaMode === "gif" ? "play" : undefined}
              badgeLabel={heroMediaMode === "gif" ? "Exécution" : undefined}
            />
            {workoutxUri && (
              <Pressable
                testID="ex-detail-media-toggle"
                hitSlop={8}
                style={[styles.mediaToggleBtn, heroMediaMode === "gif" && styles.mediaToggleBtnActive]}
                onPress={() => setHeroMediaMode((m) => (m === "gif" ? "photo" : "gif"))}
              >
                <Ionicons name={heroMediaMode === "gif" ? "image" : "film"} size={16} color="#fff" />
              </Pressable>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(20).duration(motion.base)}>
          <Text style={styles.heroName}>{item.name}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: withAlpha(color, 15), borderColor: withAlpha(color, 45) }]}>
              <Ionicons name={EXERCISE_CATEGORY_ICON[item.category]} size={12} color={color} />
              <Text style={[styles.catBadgeText, { color }]}>{EXERCISE_CATEGORY_LABEL[item.category]}</Text>
            </View>
            {completeness && (
              <View style={styles.completenessBadge} testID="ex-detail-completeness">
                <View style={styles.completenessTrack}>
                  <View style={[styles.completenessFill, { width: `${completeness.score}%` }]} />
                </View>
                <Text style={styles.completenessText}>Fiche {completeness.score}%</Text>
              </View>
            )}
          </View>

          {statChips.length > 0 && (
            <View style={styles.statChipsRow}>
              {statChips.map((c, i) => (
                <View key={i} style={styles.statChip}>
                  <Ionicons name={c.icon} size={14} color={colors.brand} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.statChipValue} numberOfLines={1}>
                      {c.value}
                    </Text>
                    <Text style={styles.statChipLabel}>{c.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {currentLevelGuidance?.prerequisites && currentLevelGuidance.prerequisites.length > 0 && (
            <View style={styles.prereqHint}>
              <Ionicons name="information-circle" size={13} color={colors.progressSecondary} />
              <Text style={styles.prereqHintText}>
                Prérequis : {currentLevelGuidance.prerequisites.join(", ")}
              </Text>
            </View>
          )}

          <Pressable
            testID="ex-detail-add-to-plan"
            style={styles.addToPlanBtn}
            onPress={() => setAddSheetOpen(true)}
          >
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.addToPlanBtnText}>Ajouter à une séance</Text>
          </Pressable>
        </Animated.View>

        {/* Le mouvement — muscles + description + pourquoi/objectifs/disciplines,
            un seul point d'entrée pédagogique plutôt que deux petites cartes
            consécutives. */}
        <Animated.View entering={FadeInDown.delay(60).duration(motion.base)}>
          <Card style={styles.sectionCard} padding={spacing.lg} title="Le mouvement" icon="body-outline">
            {primaryMuscleLabel ? (
              <View>
                <Text style={styles.variantGroupLabel}>Muscle principal</Text>
                <View style={styles.chipWrap}>
                  <View style={styles.metaChipPrimary}>
                    <Text style={styles.metaChipPrimaryText}>{primaryMuscleLabel}</Text>
                  </View>
                </View>
              </View>
            ) : item.muscleGroups && item.muscleGroups.length > 0 ? (
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
            ) : null}

            {secondaryMuscleLabels.length > 0 && (
              <View style={styles.subBlock}>
                <Text style={styles.variantGroupLabel}>Muscles secondaires</Text>
                <View style={styles.chipWrap}>
                  {secondaryMuscleLabels.map((label) => (
                    <View key={label} style={styles.metaChipMuted}>
                      <Text style={styles.metaChipMutedText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {stabilizerMuscleLabels.length > 0 && (
              <View style={styles.subBlock}>
                <Text style={styles.variantGroupLabel}>Stabilisateurs</Text>
                <View style={styles.chipWrap}>
                  {stabilizerMuscleLabels.map((label) => (
                    <View key={label} style={styles.metaChipMuted}>
                      <Text style={styles.metaChipMutedText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {enrichment?.muscleActivation?.activationScore && (
              <View style={styles.subBlock}>
                <MuscleActivationView
                  primary={enrichment.muscleActivation.primary}
                  secondary={enrichment.muscleActivation.secondary}
                  activationScore={enrichment.muscleActivation.activationScore}
                />
              </View>
            )}

            <View style={styles.subBlock}>
              <Text style={styles.bodyTextFlush}>
                {custom?.description ?? fr?.description ?? libraryRecord?.description ?? "Bientôt disponible"}
              </Text>
            </View>

            {fr?.rationale && (
              <View style={styles.subBlock}>
                <Text style={styles.tipSubLabel}>POURQUOI CET EXERCICE</Text>
                <Text style={styles.bodyText}>{fr.rationale}</Text>
              </View>
            )}

            {enrichment?.trainingGoals && enrichment.trainingGoals.length > 0 && (
              <View style={styles.subBlock}>
                <Text style={styles.tipSubLabel}>OBJECTIFS</Text>
                <View style={styles.chipWrap}>
                  {enrichment.trainingGoals.map((g) => (
                    <View key={g} style={styles.goalChip}>
                      <Text style={styles.goalChipText}>{TRAINING_GOAL_LABEL[g]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {enrichment?.disciplines && enrichment.disciplines.length > 0 && (
              <View style={styles.subBlock}>
                <Text style={styles.tipSubLabel}>DISCIPLINES</Text>
                <View style={styles.chipWrap}>
                  {enrichment.disciplines.map((d) => (
                    <View key={d} style={styles.metaChip}>
                      <Text style={styles.metaChipText}>{DISCIPLINE_LABEL[d]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(motion.base)}>
          <Card style={styles.sectionCard} padding={spacing.lg} title="Étapes d'exécution" icon="list-outline">
            {(fr?.instructions ?? libraryRecord?.instructions)?.length ? (
              <View style={{ gap: 10 }}>
                {(fr?.instructions ?? libraryRecord?.instructions ?? []).map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.bodyText, { marginTop: 2, flex: 1 }]}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Bientôt disponible</Text>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(motion.base)}>
          <Card style={styles.sectionCard} padding={spacing.lg} title="Conseils IronFlow" icon="bulb-outline">
            <SegmentedTabRow
              testIDPrefix="ex-detail-advice-tab"
              value={adviceTab}
              onChange={setAdviceTab}
              options={[
                { key: "technique", label: "Technique" },
                { key: "securite", label: "Sécurité & Repos" },
                { key: "niveau", label: "Niveau" },
              ]}
            />

            <View style={styles.subBlock}>
              {adviceTab === "technique" &&
                (adviceHasTechnique ? (
                  <View style={{ gap: 10 }}>
                    {fr?.warmupSuggestion && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>ÉCHAUFFEMENT</Text>
                        <Text style={styles.bodyText}>{fr.warmupSuggestion}</Text>
                      </View>
                    )}
                    {(fr?.executionTips ?? libraryRecord?.tips ?? []).map((tip, i) => (
                      <Text key={i} style={styles.bodyTextFlush}>
                        • {tip}
                      </Text>
                    ))}
                    {fr?.breathingTips && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>RESPIRATION</Text>
                        <Text style={styles.bodyText}>{fr.breathingTips}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Bientôt disponible</Text>
                ))}

              {adviceTab === "securite" &&
                (adviceHasSecurity ? (
                  <View style={{ gap: 10 }}>
                    {fr?.precautions && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>PRÉCAUTIONS</Text>
                        <Text style={styles.bodyText}>{fr.precautions}</Text>
                      </View>
                    )}
                    {enrichment?.fatigueLevel && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>NIVEAU DE FATIGUE</Text>
                        <Text style={styles.bodyText}>{FATIGUE_LEVEL_LABEL[enrichment.fatigueLevel]}</Text>
                      </View>
                    )}
                    {enrichment?.restTimeByGoal && Object.keys(enrichment.restTimeByGoal).length > 0 && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>REPOS CONSEILLÉ</Text>
                        {Object.entries(enrichment.restTimeByGoal).map(([goal, restTime]) => (
                          <Text key={goal} style={styles.bodyText}>
                            {TRAINING_GOAL_LABEL[goal as keyof typeof TRAINING_GOAL_LABEL]} : {restTime}
                          </Text>
                        ))}
                      </View>
                    )}
                    {enrichment?.alternativeEquipment && enrichment.alternativeEquipment.length > 0 && (
                      <View style={styles.tipSubBlock}>
                        <Text style={styles.tipSubLabel}>MATÉRIEL ALTERNATIF</Text>
                        <View style={styles.chipWrap}>
                          {enrichment.alternativeEquipment.map((eq, i) => (
                            <View key={i} style={styles.metaChipMuted}>
                              <Text style={styles.metaChipMutedText}>{eq}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Bientôt disponible</Text>
                ))}

              {adviceTab === "niveau" &&
                (adviceHasLevel ? (
                  <View style={{ gap: 10 }}>
                    {(["beginner", "intermediate", "advanced"] as const).map((level) => {
                      const g = enrichment?.levelGuidance?.[level];
                      if (!g || (!g.note && !(g.prerequisites && g.prerequisites.length > 0))) return null;
                      return (
                        <View key={level} style={styles.levelBlock}>
                          <Text style={styles.variantGroupLabel}>{EXERCISE_DIFFICULTY_LABEL[level]}</Text>
                          {g.note && <Text style={styles.bodyTextFlush}>{g.note}</Text>}
                          {g.prerequisites && g.prerequisites.length > 0 && (
                            <View style={styles.chipWrap}>
                              {g.prerequisites.map((p, i) => (
                                <View key={i} style={styles.metaChipMuted}>
                                  <Text style={styles.metaChipMutedText}>{p}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Bientôt disponible</Text>
                ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(motion.base)}>
          <Card style={styles.sectionCard} padding={spacing.lg} title="Erreurs fréquentes" icon="alert-circle-outline">
            {fr?.mistakeCorrections?.length ? (
              <View style={{ gap: 8 }}>
                {fr.mistakeCorrections.map((mc, i) => (
                  <View key={i} style={styles.mistakePairCard}>
                    <View style={styles.mistakeRow}>
                      <Ionicons name="close-circle" size={14} color={colors.error} />
                      <Text style={[styles.bodyText, { flex: 1, marginTop: 0 }]}>{mc.mistake}</Text>
                    </View>
                    <View style={styles.mistakeRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={[styles.bodyText, { flex: 1, marginTop: 0 }]}>{mc.correction}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (fr?.commonMistakes ?? libraryRecord?.commonMistakes)?.length ? (
              <View style={{ gap: 4 }}>
                {(fr?.commonMistakes ?? libraryRecord?.commonMistakes ?? []).map((mistake, i) => (
                  <Text key={i} style={styles.bodyTextFlush}>
                    • {mistake}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Bientôt disponible</Text>
            )}
          </Card>
        </Animated.View>

        {hasRelated && (
          <Animated.View entering={FadeInDown.delay(300).duration(motion.base)}>
            <Card style={styles.sectionCard} padding={spacing.lg} title="Exercices liés" icon="git-branch-outline">
              {(variantLinks.regression.length > 0 || variantLinks.progression.length > 0) && (
                <View>
                  {variantLinks.regression.length > 0 && (
                    <View>
                      <Text style={styles.variantGroupLabel}>Pour débuter</Text>
                      <View style={styles.chipWrap}>
                        {variantLinks.regression.map((v, i) => (
                          <Pressable
                            key={i}
                            testID={`ex-detail-regression-${i}`}
                            style={styles.linkChip}
                            onPress={() => router.push(`/exercise-detail/${encodeURIComponent(v.name)}` as any)}
                          >
                            <Text style={styles.linkChipText}>{v.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                  {variantLinks.progression.length > 0 && (
                    <View style={styles.subBlock}>
                      <Text style={styles.variantGroupLabel}>Pour progresser</Text>
                      <View style={styles.chipWrap}>
                        {variantLinks.progression.map((v, i) => (
                          <Pressable
                            key={i}
                            testID={`ex-detail-progression-${i}`}
                            style={styles.linkChip}
                            onPress={() => router.push(`/exercise-detail/${encodeURIComponent(v.name)}` as any)}
                          >
                            <Text style={styles.linkChipText}>{v.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {similarExercises.length > 0 && (
                <View style={styles.subBlock}>
                  <Text style={styles.variantGroupLabel}>À explorer aussi</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
                    {similarExercises.map((r) => (
                      <Pressable
                        key={r.id}
                        testID={`ex-detail-similar-${r.id}`}
                        style={styles.similarCard}
                        onPress={() => router.push(`/exercise-detail/${encodeURIComponent(r.nameFr)}` as any)}
                      >
                        <ExerciseThumbnail name={r.nameFr} records={allRecords} exerciseRecordId={r.id} size={44} square />
                        <Text style={styles.similarCardText} numberOfLines={2}>
                          {r.nameFr}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {hasMoreInfo && (
          <Animated.View entering={FadeInDown.delay(340).duration(motion.base)}>
            <Card
              style={styles.sectionCard}
              padding={spacing.lg}
              title="Plus d'infos"
              icon="information-circle-outline"
              collapsible
              defaultCollapsed
              testID="ex-detail-more-info"
            >
              {usage.length > 0 && (
                <View>
                  <Text style={styles.variantGroupLabel}>Utilisé dans tes séances</Text>
                  <View style={styles.chipWrap}>
                    {usage.map((u) => (
                      <Pressable
                        key={u.key}
                        testID={`ex-detail-usage-${u.key}`}
                        style={styles.linkChip}
                        onPress={() => router.push(`/${u.kind}/${u.id}` as any)}
                      >
                        <Ionicons
                          name={u.kind === "program" ? "calendar" : "list"}
                          size={12}
                          color={colors.brand}
                        />
                        <Text style={styles.linkChipText}>{u.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {(enrichment?.tags?.length || enrichment?.equipmentLevel) && (
                <View style={usage.length > 0 ? styles.subBlock : undefined}>
                  <Text style={styles.variantGroupLabel}>Détails</Text>
                  <View style={styles.chipWrap}>
                    {enrichment?.equipmentLevel && (
                      <View style={styles.metaChipMuted}>
                        <Text style={styles.metaChipMutedText}>
                          Matériel : {enrichment.equipmentLevel === "none" ? "aucun" : enrichment.equipmentLevel === "basic" ? "basique" : "salle"}
                        </Text>
                      </View>
                    )}
                    {(enrichment?.tags ?? []).map((tag) => (
                      <View key={tag} style={styles.metaChipMuted}>
                        <Text style={styles.metaChipMutedText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Historique personnel */}
        <Animated.View entering={FadeInDown.delay(420).duration(motion.base)}>
          <Card elevated style={styles.sectionCard} padding={spacing.lg} title="Historique personnel" icon="stats-chart-outline">
            {progress && progress.totalSessions > 0 ? (
              <>
                <View style={styles.statHeroRow}>
                  <StatHero
                    testID="ex-detail-stat-sessions"
                    value={progress.totalSessions}
                    unit="Séances"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <StatHero
                    testID="ex-detail-stat-records"
                    value={detail.linkedPRs.length}
                    unit="Records"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  {progress.weightProgression.length > 0 && (
                    <StatHero
                      testID="ex-detail-stat-best-weight"
                      value={Math.max(...progress.weightProgression.map((p) => p.value))}
                      unit="Meilleur poids (kg)"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  )}
                  {progress.volumeProgression.length > 0 && (
                    <StatHero
                      testID="ex-detail-stat-best-volume"
                      value={Math.max(...progress.volumeProgression.map((p) => p.value))}
                      unit="Meilleur volume (kg)"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  )}
                </View>

                {progress.weightProgression.length >= 2 && (
                  <View style={styles.progressChartCard}>
                    <Text style={styles.progressChartTitle}>Évolution du poids</Text>
                    <LineChart
                      data={progress.weightProgression.map((p) => ({
                        value: Math.round(p.value),
                        label: shortDate(p.date),
                      }))}
                      color={color}
                      thickness={3}
                      areaChart
                      startFillColor={color}
                      startOpacity={0.4}
                      endFillColor={color}
                      endOpacity={0.05}
                      yAxisThickness={0}
                      xAxisThickness={0}
                      yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 9 }}
                      hideRules
                      width={Dimensions.get("window").width - spacing.lg * 2 - spacing.lg * 2 - 32}
                      isAnimated
                      curved
                      dataPointsColor={color}
                      dataPointsRadius={3}
                    />
                  </View>
                )}

                {progress.lastUsedAt && (
                  <View style={styles.lastSessionCard}>
                    <Text style={styles.lastSessionLabel}>DERNIÈRE FOIS</Text>
                    <Text style={styles.lastSessionValue}>
                      {detail.lastSession?.weight ? `${detail.lastSession.weight} kg × ` : ""}
                      {detail.lastSession?.reps || `${detail.lastSession?.setsDone ?? ""} séries`}
                    </Text>
                    <Text style={styles.lastSessionDate}>
                      {new Date(progress.lastUsedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.placeholderText}>Pas encore pratiqué — lance ta première séance pour construire ton historique.</Text>
            )}
          </Card>
        </Animated.View>

        <Pressable
          testID="ex-detail-open-stats"
          style={styles.statsBtn}
          onPress={() => router.push(`/exercise/${encodeURIComponent(item.name)}`)}
        >
          <Ionicons name="stats-chart" size={16} color={colors.brand} />
          <Text style={styles.statsBtnText}>Voir mes statistiques avancées</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={addSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddSheetOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ajouter « {item.name} » à…</Text>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {plans.length === 0 ? (
                <Text style={styles.placeholderText}>Aucune séance existante.</Text>
              ) : (
                plans.map((p) => (
                  <PressableScale
                    key={p.id}
                    testID={`ex-detail-add-to-plan-${p.id}`}
                    style={styles.sheetPlanRow}
                    onPress={() => addExerciseToPlan(p)}
                  >
                    <Text style={styles.sheetPlanTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
                  </PressableScale>
                ))
              )}
            </ScrollView>
            <PressableScale
              testID="ex-detail-create-plan"
              style={styles.sheetCreateBtn}
              onPress={createPlanWithExercise}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.sheetCreateBtnText}>Créer une nouvelle séance</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const FATIGUE_LEVEL_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Faible",
  medium: "Modéré",
  high: "Élevé",
};

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
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { color: colors.onSurfaceTertiary },
  circuitFullName: { color: colors.onSurface, fontSize: 15, fontWeight: "700", lineHeight: 21 },
  circuitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  circuitRowName: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  circuitRowHint: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  mediaCard: { gap: 6, overflow: "hidden" },
  mediaToggleBtn: {
    position: "absolute",
    top: spacing.sm + 8,
    right: spacing.sm + 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#000000", 55),
  },
  mediaToggleBtnActive: { backgroundColor: colors.brand },
  heroName: {
    color: colors.onSurface,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: spacing.lg,
  },
  sectionCard: { borderRadius: radius.lg },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm, flexWrap: "wrap" },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  catBadgeText: { fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  completenessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completenessTrack: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  completenessFill: { height: "100%", backgroundColor: colors.progress },
  completenessText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  statChipsRow: { flexDirection: "row", gap: 8, marginTop: spacing.md, flexWrap: "wrap" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statChipValue: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  statChipLabel: { color: colors.onSurfaceTertiary, fontSize: 9.5, fontWeight: "700" },
  prereqHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.progressTertiary,
  },
  prereqHintText: { flex: 1, color: colors.progressSecondary, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  mistakePairCard: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  mistakeRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  levelBlock: { gap: 4 },
  addToPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    ...coloredShadow(colors.brand, { offsetY: 6, opacity: 0.35, radius: 14, elevation: 6 }),
  },
  addToPlanBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  subBlock: { marginTop: spacing.md },
  bodyText: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  bodyTextFlush: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  placeholderText: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    fontStyle: "italic",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
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
  metaChipPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.brand, 16),
    borderWidth: 1,
    borderColor: withAlpha(colors.brand, 45),
  },
  metaChipPrimaryText: { color: colors.brandSecondary, fontSize: 12, fontWeight: "800" },
  metaChipMuted: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  metaChipMutedText: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.progressTertiary,
    borderWidth: 1,
    borderColor: colors.progress,
  },
  goalChipText: { color: colors.progressSecondary, fontSize: 11, fontWeight: "700" },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  linkChipText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  variantGroupLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipSubBlock: { gap: 2 },
  tipSubLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  similarRow: { gap: spacing.sm, marginTop: 2, paddingRight: spacing.md },
  similarCard: {
    width: 96,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  similarCardText: { color: colors.onSurface, fontSize: 11, fontWeight: "700", textAlign: "center" },
  statHeroRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  progressChartCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  progressChartTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700", marginBottom: spacing.md },
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
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(colors.brand, 12),
    justifyContent: "center",
  },
  statsBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: 32,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  sheetPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sheetPlanTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13, flex: 1 },
  sheetCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  sheetCreateBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
