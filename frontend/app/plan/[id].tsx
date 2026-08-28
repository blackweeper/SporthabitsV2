import { useCallback, useEffect, useMemo, useState } from "react";
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
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import {
  Exercise,
  ExerciseMode,
  getPlan,
  Plan,
  savePlan,
  uid,
} from "@/src/utils/gym-storage";
import { ExerciseRecord, getExerciseRecords, saveExerciseRecord } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { learnAlias } from "@/src/utils/exercise-matching";
import { parseCompositeExerciseName, splitCompositeItemQuantity } from "@/src/utils/composite-exercise";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import ExercisePicturePicker from "@/src/components/ExercisePicturePicker";
import ExerciseLibraryPicker from "@/src/components/ExerciseLibraryPicker";
import ExerciseLinkModal from "@/src/components/ExerciseLinkModal";
import ExerciseNameSuggestions from "@/src/components/ExerciseNameSuggestions";
import CompositeExerciseImage from "@/src/components/CompositeExerciseImage";
import DurationField from "@/src/components/DurationField";
import CircuitCardListEditor, {
  CircuitCardDraft,
  newCircuitCard,
} from "@/src/components/CircuitCardListEditor";

const TYPES: Plan["type"][] = ["musculation", "hiit", "cardio", "mixte"];
// "Tours" n'est pas un ExerciseMode réel (voir RoundBlock) — c'est un
// générateur séparé (bouton dédié, pas une chip de mode par exercice)
// puisqu'il produit PLUSIEURS Exercise à partir d'une seule séquence, pas
// une propriété d'un exercice existant.
const MODES: { key: ExerciseMode; label: string; hint: string }[] = [
  { key: "reps", label: "REPS", hint: "Séries × répétitions" },
  { key: "time", label: "TIME", hint: "X minutes / série (WOD)" },
  { key: "amrap", label: "AMRAP", hint: "Tours max sur une durée" },
  { key: "emom", label: "EMOM", hint: "X reps chaque minute pendant N minutes" },
  { key: "for_time", label: "FOR TIME", hint: "Cap chrono + tours cible, décompte" },
];

/** Compose le nom composite d'un circuit AMRAP/EMOM/For Time à partir des
 * cartes du générateur — même convention que l'entrée "Cindy"
 * (`src/data/wod-library.ts`) : `"{prefix} : {reps} {nom} → {reps} {nom} → ..."`.
 * Une seule carte remplie : nom pur (pas de préfixe/flèche, cohérent avec
 * `parseCompositeExerciseName` qui exige ≥2 segments pour traiter une entrée
 * comme composite) — la carte unique va dans `notes` à la place. */
function composeCircuitFromCards(
  cards: CircuitCardDraft[],
  prefix: string,
): { name: string; notes: string | null; exerciseRecordId: string | null } {
  const filled = cards.filter((c) => c.name.trim());
  if (filled.length <= 1) {
    const only = filled[0];
    return {
      name: only ? only.name.trim() : "Nouvel exercice",
      notes: only?.reps.trim() ? only.reps.trim() : null,
      exerciseRecordId: only?.exerciseRecordId ?? null,
    };
  }
  const parts = filled.map((c) =>
    c.reps.trim() ? `${c.reps.trim()} ${c.name.trim()}` : c.name.trim(),
  );
  return {
    name: `${prefix} : ${parts.join(" → ")}`,
    notes: null,
    exerciseRecordId: filled[0].exerciseRecordId ?? null,
  };
}

export default function PlanDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickingExerciseId, setPickingExerciseId] = useState<string | null>(null);
  const [linkingExerciseId, setLinkingExerciseId] = useState<string | null>(null);
  /** Exercice dont le champ nom a le focus — pilote l'affichage des
   * suggestions live (`ExerciseNameSuggestions`) même quand l'exercice est
   * DÉJÀ lié (`exerciseRecordId` renseigné) : sans ça, remplacer le texte
   * d'un exercice déjà relié (ex. les WOD pré-liés par le script de
   * bibliothèque, comme "Double unders" dans Annie) ne déclenchait ni le
   * hint ni les suggestions, puisque `needsLink` devient faux dès qu'un id
   * est présent — l'utilisateur ne pouvait alors plus corriger le lien
   * depuis ce champ. */
  const [focusedNameExerciseId, setFocusedNameExerciseId] = useState<string | null>(null);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  // Cartes du générateur de circuit (AMRAP/EMOM/For Time), tenues côté UI
  // uniquement — la source de vérité persistée reste `Exercise.name`/`notes`
  // (voir `composeCircuitFromCards`), reconstruites depuis eux à l'ouverture.
  const [circuitCards, setCircuitCards] = useState<Record<string, CircuitCardDraft[]>>({});
  // Un seul `ExerciseLibraryPicker` partagé, routé selon le contexte qui l'a
  // ouvert : ajout classique d'un exercice au plan, ou sélection pour une
  // carte de circuit (du plan ou du brouillon Tours).
  const [libraryTarget, setLibraryTarget] = useState<
    | { kind: "add" }
    | { kind: "card"; exId: string; cardId: string }
    | { kind: "tours-card"; cardId: string }
    | null
  >(null);
  // Brouillon du bloc Tours (séquence + tours + repos entre tours) — n'existe
  // que le temps de la construction, jamais persisté tel quel : à la
  // génération, aplati en plusieurs `Exercise` taggées `roundBlock`.
  const [toursBuilderOpen, setToursBuilderOpen] = useState(false);
  const [toursCards, setToursCards] = useState<CircuitCardDraft[]>([newCircuitCard()]);
  const [toursRounds, setToursRounds] = useState(3);
  const [toursRestSeconds, setToursRestSeconds] = useState(0);

  useEffect(() => {
    getExerciseRecords().then(setRecords);
  }, []);

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

  /** Lie l'exercice `exId` (texte libre, pas d'illustration/description
   * puisqu'aucun `ExerciseRecord` ne matche son nom) au `record` choisi —
   * même mécanisme que `import-review/[id].tsx` : le nom original devient un
   * alias du record (`learnAlias`) pour que la résolution par nom déjà
   * utilisée partout (`ExerciseThumbnail`, la fiche, la séance active)
   * retrouve désormais une vraie image/description, plus seulement l'emoji
   * de repli. Le nom AFFICHÉ est aussi corrigé vers le nom canonique de la
   * bibliothèque (`learned.nameFr`) — sans ça, seul `exerciseRecordId`
   * changeait et le texte tapé par l'utilisateur restait affiché tel quel,
   * donnant l'impression que "rien ne se corrige". Tout autre exercice du
   * même plan portant exactement le même nom d'origine (ex. "Double
   * unders" répété à chaque round d'Annie) est mis à jour en même temps —
   * une seule liaison suffit pour toutes les occurrences de la séance. */
  const linkExerciseToRecord = async (exId: string, rawName: string, record: ExerciseRecord) => {
    if (!plan) return;
    const learned = learnAlias(record, rawName);
    if (learned !== record) {
      await saveExerciseRecord(learned);
      setRecords((prev) => prev.map((r) => (r.id === learned.id ? learned : r)));
    }
    const key = rawName.trim().toLowerCase();
    setPlan({
      ...plan,
      exercises: plan.exercises.map((e) => {
        const sameEntry = e.id === exId;
        const sameName = key.length > 0 && e.name.trim().toLowerCase() === key;
        if (!sameEntry && !sameName) return e;
        return { ...e, name: learned.nameFr, exerciseRecordId: learned.id, matchConfidence: "manual" };
      }),
    });
    setLinkingExerciseId(null);
  };

  const addExercise = (name = "", exerciseRecordId: string | null = null) => {
    if (!plan) return;
    setPlan({
      ...plan,
      exercises: [
        ...plan.exercises,
        {
          id: uid(),
          name,
          mode: "reps",
          sets: 3,
          reps: "10",
          weight: null,
          rest_seconds: 60,
          duration_seconds: null,
          notes: null,
          exerciseRecordId,
          matchConfidence: exerciseRecordId ? "manual" : null,
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
    setCircuitCards((prev) => {
      if (!(exId in prev)) return prev;
      const { [exId]: _, ...rest } = prev;
      return rest;
    });
  };

  /** Cartes du circuit pour `ex` — dérivées de son nom composite existant si
   * déjà construit ainsi (une carte par segment, texte complet non splitté
   * pour ne rien perdre), sinon d'une seule carte reprenant le nom/notes
   * actuels. Mémorisées dans `circuitCards` dès la première lecture pour ne
   * pas régénérer des ids à chaque frappe. */
  const getCircuitCards = (ex: Exercise): CircuitCardDraft[] => {
    const existing = circuitCards[ex.id];
    if (existing) return existing;
    const parsed = parseCompositeExerciseName(ex.name);
    const seeded: CircuitCardDraft[] =
      parsed && parsed.length > 0
        ? parsed.map((item) => {
            const { reps, name } = splitCompositeItemQuantity(item);
            return {
              id: uid(),
              name,
              exerciseRecordId: matchExerciseRecord(name, records)?.id ?? null,
              reps,
            };
          })
        : [
            {
              id: uid(),
              name: ex.name,
              exerciseRecordId: ex.exerciseRecordId ?? null,
              reps: ex.notes || "",
            },
          ];
    setCircuitCards((prev) => (prev[ex.id] ? prev : { ...prev, [ex.id]: seeded }));
    return seeded;
  };

  const titlePrefixFor = (ex: Exercise): string => {
    if (ex.mode === "for_time") {
      const mm = Math.round((ex.duration_seconds ?? 900) / 60);
      return `FOR TIME (cap ${mm} min · ${ex.targetRounds ?? 0} tours)`;
    }
    const mm = Math.round((ex.duration_seconds ?? 720) / 60);
    return `AMRAP ${mm} min`;
  };

  const applyCircuitCards = (ex: Exercise, cards: CircuitCardDraft[]) => {
    setCircuitCards((prev) => ({ ...prev, [ex.id]: cards }));
    const composed = composeCircuitFromCards(cards, titlePrefixFor(ex));
    updateExercise(ex.id, {
      name: composed.name,
      notes: composed.notes,
      exerciseRecordId: composed.exerciseRecordId,
      matchConfidence: composed.exerciseRecordId ? "manual" : null,
    });
  };

  /** Génère un bloc EMOM round-robin : `totalMinutes` `Exercise` distinctes
   * (une par minute, `mode:'emom'`, `sets:1`), les cartes tournant en boucle
   * (`filled[i % filled.length]`) — même principe d'aplatissement que
   * `addToursBlock`, mais basé sur le temps (1 round = 1 minute) plutôt que
   * sur la complétion. Remplace le SEUL exercice stub édité (`ex`) par les N
   * rounds générés, contrairement à `applyCircuitCards` qui patche un objet
   * unique en place — l'EMOM produit toujours plusieurs `Exercise`. */
  const applyEmomBlock = (ex: Exercise, cards: CircuitCardDraft[], totalMinutes: number) => {
    if (!plan) return;
    const filled = cards.filter((c) => c.name.trim());
    if (filled.length === 0 || totalMinutes < 1) return;
    const blockId = uid();
    const title = `EMOM ${totalMinutes} min`;
    const generated: Exercise[] = Array.from({ length: totalMinutes }, (_, roundIndex) => {
      const card = filled[roundIndex % filled.length];
      return {
        id: uid(),
        name: card.name.trim(),
        mode: "emom",
        sets: 1,
        reps: card.reps.trim() || "",
        weight: null,
        rest_seconds: 0,
        duration_seconds: 60,
        notes: card.reps.trim() || null,
        exerciseRecordId: card.exerciseRecordId ?? null,
        matchConfidence: card.exerciseRecordId ? "manual" : null,
        emomBlock: { blockId, roundIndex, totalRounds: totalMinutes, title },
      };
    });
    setPlan({
      ...plan,
      exercises: plan.exercises.flatMap((e) => (e.id === ex.id ? generated : [e])),
    });
    setCircuitCards((prev) => {
      const { [ex.id]: _, ...rest } = prev;
      return rest;
    });
  };

  /** Génère un bloc Tours : aplati `sequence × rounds` en `Exercise` `reps`
   * distinctes (jamais `sets:N`, même convention round-robin que
   * `scripts/import-wod-json.js`), taguées d'un `roundBlock` commun. Repos
   * uniquement sur le dernier exercice de chaque round sauf le dernier
   * (voir `toggleSet`/`chainRestAndAdvance` côté séance active). */
  const addToursBlock = (sequence: CircuitCardDraft[], rounds: number, restSeconds: number) => {
    if (!plan) return;
    const filled = sequence.filter((c) => c.name.trim());
    if (filled.length === 0 || rounds < 1) return;
    const blockId = uid();
    const generated: Exercise[] = [];
    for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
      filled.forEach((card, sequenceIndex) => {
        const isLastOfRound = sequenceIndex === filled.length - 1;
        const isLastRound = roundIndex === rounds - 1;
        generated.push({
          id: uid(),
          name: card.name.trim(),
          mode: "reps",
          sets: 1,
          reps: card.reps.trim() || "10",
          weight: null,
          rest_seconds: isLastOfRound && !isLastRound ? restSeconds : 0,
          duration_seconds: null,
          notes: null,
          exerciseRecordId: card.exerciseRecordId ?? null,
          matchConfidence: card.exerciseRecordId ? "manual" : null,
          roundBlock: {
            blockId,
            roundIndex,
            totalRounds: rounds,
            sequenceIndex,
            sequenceLength: filled.length,
            title: null,
          },
        });
      });
    }
    setPlan({ ...plan, exercises: [...plan.exercises, ...generated] });
    setToursBuilderOpen(false);
    setToursCards([newCircuitCard()]);
    setToursRounds(3);
    setToursRestSeconds(0);
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
        <Pressable
          testID="back-plan"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isNew ? "Nouveau plan" : "Modifier le plan"}
        </Text>
        <Pressable
          testID="save-plan-btn"
          onPress={save}
          hitSlop={16}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons name="checkmark" size={14} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
          <Text style={styles.saveBtnText}>SAUVEGARDER</Text>
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
            placeholderTextColor={theme.colors.onSurfaceTertiary}
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
            <View style={styles.addBtnRow}>
              <Pressable
                testID="add-tours-block-btn"
                style={styles.addBtnGhost}
                onPress={() => setToursBuilderOpen((v) => !v)}
              >
                <Ionicons name="repeat" size={14} color={theme.colors.brand} />
                <Text style={styles.addBtnGhostText}>TOURS</Text>
              </Pressable>
              <Pressable
                testID="add-from-library-btn"
                style={styles.addBtnGhost}
                onPress={() => setLibraryTarget({ kind: "add" })}
              >
                <Ionicons name="library" size={14} color={theme.colors.brand} />
                <Text style={styles.addBtnGhostText}>BIBLIOTHÈQUE</Text>
              </Pressable>
              <Pressable
                testID="add-exercise-btn"
                style={styles.addBtn}
                onPress={() => addExercise()}
              >
                <Ionicons name="add" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
                <Text style={styles.addBtnText}>AJOUTER</Text>
              </Pressable>
            </View>
          </View>

          {toursBuilderOpen && (
            <View style={styles.exCard} testID="tours-builder">
              <Text style={styles.toursBuilderTitle}>Bloc Tours</Text>
              <Text style={styles.modeHint}>
                Construis la séquence d'exercices, puis choisis combien de fois elle se répète.
              </Text>
              <CircuitCardListEditor
                cards={toursCards}
                onChange={setToursCards}
                records={records}
                onOpenPicker={(cardId) => setLibraryTarget({ kind: "tours-card", cardId })}
              />
              <Pressable
                testID="tours-add-card-btn"
                style={styles.addCardBtn}
                onPress={() => setToursCards((prev) => [...prev, newCircuitCard()])}
              >
                <Ionicons name="add" size={14} color={theme.colors.brand} />
                <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
              </Pressable>
              <View style={styles.fieldRow}>
                <FieldNum label="Nombre de tours" value={toursRounds} onChange={setToursRounds} />
                <DurationField
                  testID="tours-rest"
                  label="Repos entre tours"
                  valueSeconds={toursRestSeconds}
                  onChange={setToursRestSeconds}
                />
              </View>
              <Pressable
                testID="tours-generate-btn"
                style={styles.addBtn}
                onPress={() => addToursBlock(toursCards, toursRounds, toursRestSeconds)}
              >
                <Ionicons name="checkmark" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
                <Text style={styles.addBtnText}>
                  GÉNÉRER {toursRounds * toursCards.filter((c) => c.name.trim()).length || ""} EXERCICES
                </Text>
              </Pressable>
            </View>
          )}

          {plan.exercises.length === 0 && (
            <Text style={styles.emptyEx}>
              Aucun exercice. Ajoute-en un pour commencer.
            </Text>
          )}

          {plan.exercises.map((ex, idx) => {
            const composite = parseCompositeExerciseName(ex.name);
            const needsLink = !composite && !ex.exerciseRecordId && !matchExerciseRecord(ex.name, records);
            const linkedRecord = ex.exerciseRecordId ? records.find((r) => r.id === ex.exerciseRecordId) : undefined;
            const nameMatchesLinked = !!linkedRecord && linkedRecord.nameFr.trim().toLowerCase() === ex.name.trim().toLowerCase();
            const showSuggestions =
              !composite &&
              ex.name.trim().length >= 2 &&
              !nameMatchesLinked &&
              (needsLink || focusedNameExerciseId === ex.id);
            return (
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
                    color={theme.colors.onSurfaceTertiary}
                  />
                </Pressable>
              </View>
              <View style={styles.exNameRow}>
                <Pressable
                  testID={`ex-pic-${ex.id}`}
                  onPress={() => setPickingExerciseId(ex.id)}
                  style={styles.exPicWrap}
                >
                  <ExerciseThumbnail
                    photoBase64={ex.photoBase64}
                    iconKey={ex.iconKey}
                    name={ex.name}
                    records={records}
                    exerciseRecordId={ex.exerciseRecordId}
                    size={48}
                  />
                  <View style={styles.exPicEdit}>
                    <Ionicons name="pencil" size={10} color="#fff" />
                  </View>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.inputCompact, { flex: 1 }]}
                  value={ex.name}
                  onChangeText={(t) => {
                    if (!ex.name.trim() && t.trim() && !ex.exerciseRecordId) {
                      setLinkingExerciseId(ex.id);
                    }
                    updateExercise(ex.id, { name: t });
                  }}
                  onFocus={() => setFocusedNameExerciseId(ex.id)}
                  placeholder="Nom de l'exercice"
                  placeholderTextColor={theme.colors.onSurfaceTertiary}
                />
              </View>

              {needsLink && (
                <Pressable
                  testID={`ex-link-${ex.id}`}
                  style={styles.linkHint}
                  onPress={() => setLinkingExerciseId(ex.id)}
                >
                  <Ionicons name="link-outline" size={12} color={theme.colors.warning} />
                  <Text style={styles.linkHintText}>
                    Pas encore illustré — lier à la bibliothèque
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={theme.colors.warning} />
                </Pressable>
              )}
              {showSuggestions && (
                <ExerciseNameSuggestions
                  query={ex.name}
                  records={records}
                  onPick={(record) => linkExerciseToRecord(ex.id, ex.name, record)}
                />
              )}

              {composite && (
                <CompositeExerciseImage items={composite} records={records} />
              )}

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
                            m.key === "amrap" || m.key === "for_time"
                              ? 1
                              : m.key === "emom"
                                ? ex.sets || 10
                                : ex.sets || 3,
                          duration_seconds:
                            m.key === "reps"
                              ? null
                              : m.key === "emom"
                                ? 60
                                : m.key === "for_time"
                                  ? ex.duration_seconds || 900
                                  : ex.duration_seconds || 300,
                          targetRounds: m.key === "for_time" ? ex.targetRounds || 3 : null,
                          rest_seconds:
                            m.key === "amrap" || m.key === "emom" || m.key === "for_time"
                              ? 0
                              : ex.rest_seconds || 60,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.modeChipLabel,
                          active && { color: theme.card.mode === "glass" ? theme.colors.brand : "#fff" },
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
                    <DurationField
                      testID={`ex-rest-${ex.id}`}
                      label="Repos"
                      valueSeconds={ex.rest_seconds}
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
                    <DurationField
                      testID={`ex-duration-${ex.id}`}
                      label="Durée"
                      valueSeconds={ex.duration_seconds ?? 300}
                      onChange={(v) =>
                        updateExercise(ex.id, { duration_seconds: v })
                      }
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <DurationField
                      testID={`ex-rest-${ex.id}`}
                      label="Repos"
                      valueSeconds={ex.rest_seconds}
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
                <>
                  <View style={styles.fieldRow}>
                    <DurationField
                      testID={`ex-duration-${ex.id}`}
                      label="Durée totale"
                      valueSeconds={ex.duration_seconds ?? 720}
                      presetsSeconds={[300, 480, 600, 720, 900, 1200]}
                      onChange={(v) =>
                        updateExercise(ex.id, { duration_seconds: v })
                      }
                    />
                  </View>
                  <CircuitCardListEditor
                    cards={getCircuitCards(ex)}
                    onChange={(cards) => applyCircuitCards(ex, cards)}
                    records={records}
                    onOpenPicker={(cardId) => setLibraryTarget({ kind: "card", exId: ex.id, cardId })}
                  />
                  <Pressable
                    testID={`ex-add-card-${ex.id}`}
                    style={styles.addCardBtn}
                    onPress={() => applyCircuitCards(ex, [...getCircuitCards(ex), newCircuitCard()])}
                  >
                    <Ionicons name="add" size={14} color={theme.colors.brand} />
                    <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
                  </Pressable>
                </>
              )}

              {ex.mode === "emom" && (
                <>
                  <View style={styles.fieldRow}>
                    <FieldNum
                      label="Durée totale (minutes)"
                      value={ex.sets}
                      onChange={(v) => updateExercise(ex.id, { sets: v })}
                    />
                  </View>
                  <Text style={styles.modeHint}>
                    Construis les mouvements qui tournent minute par minute, puis génère les rounds.
                  </Text>
                  <CircuitCardListEditor
                    cards={getCircuitCards(ex)}
                    onChange={(cards) => setCircuitCards((prev) => ({ ...prev, [ex.id]: cards }))}
                    records={records}
                    onOpenPicker={(cardId) => setLibraryTarget({ kind: "card", exId: ex.id, cardId })}
                  />
                  <Pressable
                    testID={`ex-add-card-${ex.id}`}
                    style={styles.addCardBtn}
                    onPress={() =>
                      setCircuitCards((prev) => ({ ...prev, [ex.id]: [...getCircuitCards(ex), newCircuitCard()] }))
                    }
                  >
                    <Ionicons name="add" size={14} color={theme.colors.brand} />
                    <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
                  </Pressable>
                  <Pressable
                    testID={`ex-generate-emom-${ex.id}`}
                    style={styles.addBtn}
                    onPress={() => applyEmomBlock(ex, getCircuitCards(ex), ex.sets)}
                  >
                    <Ionicons name="checkmark" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
                    <Text style={styles.addBtnText}>GÉNÉRER {ex.sets} EXERCICES</Text>
                  </Pressable>
                </>
              )}

              {ex.mode === "for_time" && (
                <>
                  <View style={styles.fieldRow}>
                    <DurationField
                      testID={`ex-duration-${ex.id}`}
                      label="Cap chrono"
                      valueSeconds={ex.duration_seconds ?? 900}
                      presetsSeconds={[300, 600, 720, 900, 1200, 1500]}
                      onChange={(v) => updateExercise(ex.id, { duration_seconds: v })}
                    />
                    <FieldNum
                      label="Tours cible"
                      value={ex.targetRounds ?? 1}
                      onChange={(v) => updateExercise(ex.id, { targetRounds: v })}
                    />
                  </View>
                  <CircuitCardListEditor
                    cards={getCircuitCards(ex)}
                    onChange={(cards) => applyCircuitCards(ex, cards)}
                    records={records}
                    onOpenPicker={(cardId) => setLibraryTarget({ kind: "card", exId: ex.id, cardId })}
                  />
                  <Pressable
                    testID={`ex-add-card-${ex.id}`}
                    style={styles.addCardBtn}
                    onPress={() => applyCircuitCards(ex, [...getCircuitCards(ex), newCircuitCard()])}
                  >
                    <Ionicons name="add" size={14} color={theme.colors.brand} />
                    <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
                  </Pressable>
                </>
              )}
            </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicturePicker
        visible={pickingExerciseId !== null}
        currentPhoto={
          pickingExerciseId
            ? plan.exercises.find((e) => e.id === pickingExerciseId)?.photoBase64
            : null
        }
        currentIconKey={
          pickingExerciseId
            ? plan.exercises.find((e) => e.id === pickingExerciseId)?.iconKey
            : null
        }
        onClose={() => setPickingExerciseId(null)}
        onPick={(payload) => {
          if (pickingExerciseId) updateExercise(pickingExerciseId, payload);
        }}
      />

      <ExerciseLibraryPicker
        visible={libraryTarget !== null}
        onClose={() => setLibraryTarget(null)}
        onPick={(name, exerciseRecordId) => {
          if (libraryTarget?.kind === "card") {
            const ex = plan.exercises.find((e) => e.id === libraryTarget.exId);
            if (ex) {
              const cards = getCircuitCards(ex).map((c) =>
                c.id === libraryTarget.cardId ? { ...c, name, exerciseRecordId: exerciseRecordId ?? null } : c,
              );
              if (ex.mode === "emom") {
                setCircuitCards((prev) => ({ ...prev, [ex.id]: cards }));
              } else {
                applyCircuitCards(ex, cards);
              }
            }
          } else if (libraryTarget?.kind === "tours-card") {
            setToursCards((prev) =>
              prev.map((c) =>
                c.id === libraryTarget.cardId ? { ...c, name, exerciseRecordId: exerciseRecordId ?? null } : c,
              ),
            );
          } else {
            addExercise(name, exerciseRecordId ?? null);
          }
          setLibraryTarget(null);
        }}
      />

      {linkingExerciseId && (
        <ExerciseLinkModal
          rawName={plan.exercises.find((e) => e.id === linkingExerciseId)?.name ?? ""}
          records={records}
          onClose={() => setLinkingExerciseId(null)}
          onPickRecord={(record) => {
            const ex = plan.exercises.find((e) => e.id === linkingExerciseId);
            if (ex) linkExerciseToRecord(ex.id, ex.name, record);
          }}
          onCreateRecord={async (nameFr, category, equipment) => {
            const ex = plan.exercises.find((e) => e.id === linkingExerciseId);
            if (!ex) return;
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
            await linkExerciseToRecord(ex.id, ex.name, record);
          }}
        />
      )}
      </SafeAreaView>
    </View>
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
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
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
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        style={styles.miniInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
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
  saveBtn: isGlass
    ? {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: withAlpha(colors.brand, 18),
        borderWidth: 1,
        borderColor: withAlpha(colors.brand, 50),
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
      }
    : {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.brand,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
      },
  saveBtnText: {
    color: isGlass ? colors.brand : "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
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
  exNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exPicWrap: {
    position: "relative",
  },
  exPicEdit: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  typeChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  typeChipTextActive: { color: isGlass ? colors.brand : "#fff" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  addBtn: isGlass
    ? {
        backgroundColor: withAlpha(colors.brand, 18),
        borderWidth: 1,
        borderColor: withAlpha(colors.brand, 50),
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }
    : {
        backgroundColor: colors.brand,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      },
  addBtnText: { color: isGlass ? colors.brand : "#fff", fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  addBtnRow: { flexDirection: "row", gap: 8 },
  addBtnGhost: {
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnGhostText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  toursBuilderTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 4,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  addCardBtnText: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
  },
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
  linkHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  linkHintText: { flex: 1, color: colors.warning, fontSize: 11, fontWeight: "600" },
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
  modeChipActive: isGlass ? { backgroundColor: withAlpha(colors.brand, 25) } : { backgroundColor: colors.brand },
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
}
