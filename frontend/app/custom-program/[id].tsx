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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { PLAN_TYPE_COLORS } from "@/src/utils/plan-type-colors";
import { programIconFor } from "@/src/utils/program-goal-icon";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import ExercisePicturePicker from "@/src/components/ExercisePicturePicker";
import { ExerciseRecord, getExerciseRecords, saveExerciseRecord } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { learnAlias } from "@/src/utils/exercise-matching";
import ExerciseLinkModal from "@/src/components/ExerciseLinkModal";
import ExerciseNameSuggestions from "@/src/components/ExerciseNameSuggestions";
import DurationField from "@/src/components/DurationField";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  COVER_COLORS,
  COVER_EMOJIS,
  ExerciseTemplate,
  LEVEL_LABEL,
  Program,
  ProgramDay,
  ProgramLevel,
  ProgramSession,
} from "@/src/data/programs";
import {
  addActiveProgram,
  deleteCustomProgram,
  ExerciseMode,
  getActivePrograms,
  getCustomPrograms,
  getPlans,
  Plan,
  saveCustomProgram,
  uid,
} from "@/src/utils/gym-storage";
import { estimateSessionDurationSeconds, formatEstimatedDuration } from "@/src/utils/session-estimate";
import ExerciseLibraryPicker from "@/src/components/ExerciseLibraryPicker";
import { parseCompositeExerciseName, splitCompositeItemQuantity } from "@/src/utils/composite-exercise";
import CircuitCardListEditor, {
  CircuitCardDraft,
  newCircuitCard,
} from "@/src/components/CircuitCardListEditor";

const LEVELS: ProgramLevel[] = ["debutant", "intermediaire", "avance"];
const MODES: { key: ExerciseMode; label: string }[] = [
  { key: "reps", label: "REPS" },
  { key: "time", label: "TIME" },
  { key: "amrap", label: "AMRAP" },
  { key: "emom", label: "EMOM" },
  { key: "for_time", label: "FOR TIME" },
];

function emptyDay(): ProgramDay {
  return { rest: true, title: "Repos", sessions: [] };
}

/** Même convention que `plan/[id].tsx` (`composeCircuitFromCards`) — voir
 * ce fichier pour la doc complète. Dupliqué plutôt qu'importé : les deux
 * écrans opèrent sur des types distincts (`Exercise` vs `ExerciseTemplate`)
 * et n'ont pas de module utilitaire partagé pour ce genre d'aide UI-only. */
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

function titlePrefixForExercise(exercise: ExerciseTemplate): string {
  if (exercise.mode === "for_time") {
    const mm = Math.round((exercise.duration_seconds ?? 900) / 60);
    return `FOR TIME (cap ${mm} min · ${exercise.targetRounds ?? 0} tours)`;
  }
  const mm = Math.round((exercise.duration_seconds ?? 600) / 60);
  return `AMRAP ${mm} min`;
}

/** Résume le résultat d'un import (program-import.tsx / import-review) en une
 * seule phrase — `null` si aucun des 3 compteurs n'a été transmis (ouverture
 * normale d'un programme, pas juste après un import). Ordre volontairement
 * fixe : liés d'abord (le plus rassurant), puis à revoir, puis créés. */
function buildImportSummary(linked?: string, created?: string, toReview?: string): string | null {
  const l = Number(linked) || 0;
  const c = Number(created) || 0;
  const r = Number(toReview) || 0;
  if (l + c + r === 0) return null;
  const parts: string[] = [];
  if (l > 0) parts.push(`${l} exercice${l > 1 ? "s" : ""} lié${l > 1 ? "s" : ""} automatiquement`);
  if (r > 0) parts.push(`${r} à revoir`);
  if (c > 0) parts.push(`${c} créé${c > 1 ? "s" : ""}`);
  return parts.join(" • ");
}

function newSession(): ProgramSession {
  return {
    label: "",
    title: "Nouvelle séance",
    exercises: [
      {
        name: "",
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
}

export default function CustomProgramEditor() {
  const { id, category, linked, created, toReview } = useLocalSearchParams<{
    id: string;
    category?: string;
    linked?: string;
    created?: string;
    toReview?: string;
  }>();
  const router = useRouter();
  const isNew = id === "new";
  const isStretch = category === "stretch";
  const isCardio = category === "cardio";
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [pickingIdx, setPickingIdx] = useState<{ sessionIdx: number; exIdx: number } | null>(null);
  // Un seul `ExerciseLibraryPicker` partagé, routé selon le contexte —
  // réutilise ExerciseLibraryPicker tel quel (comme plan/[id].tsx), aucun
  // doublon de code : ajout classique à une séance, ou sélection pour une
  // carte de circuit (d'un exercice existant ou du brouillon Tours).
  const [libraryTarget, setLibraryTarget] = useState<
    | { kind: "add"; sessionIdx: number }
    | { kind: "card"; sessionIdx: number; exIdx: number; cardId: string }
    | { kind: "tours-card"; sessionIdx: number; cardId: string }
    | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  // Cartes du générateur de circuit (AMRAP/For Time), UI-only — voir
  // `composeCircuitFromCards`. Clé = `${selectedDay}-${sessionIdx}-${exIdx}`
  // pour ne jamais collisionner entre jours.
  const [circuitCards, setCircuitCards] = useState<Record<string, CircuitCardDraft[]>>({});
  // Brouillon du bloc Tours — même principe que `plan/[id].tsx`, scopé à une
  // séance précise (`toursBuilderSessionIdx`) puisqu'un bloc Tours s'ajoute
  // aux exercices d'UNE séance.
  const [toursBuilderSessionIdx, setToursBuilderSessionIdx] = useState<number | null>(null);
  const [toursCards, setToursCards] = useState<CircuitCardDraft[]>([newCircuitCard()]);
  const [toursRounds, setToursRounds] = useState(3);
  const [toursRestSeconds, setToursRestSeconds] = useState(0);
  // Même mécanisme que `plan/[id].tsx` (`linkingExerciseId`/`ExerciseLinkModal`)
  // — absent jusqu'ici dans cet écran, ajouté pour la parité de liaison
  // bibliothèque entre les deux éditeurs.
  const [linkingExercise, setLinkingExercise] = useState<{ sessionIdx: number; exIdx: number } | null>(null);
  /** Même rôle que dans `plan/[id].tsx` : exercice dont le champ nom a le
   * focus, pour afficher les suggestions live même quand l'exercice est
   * DÉJÀ lié (sinon remplacer le texte d'un exercice pré-lié ne déclenche
   * ni hint ni suggestions puisque `needsLink` devient faux dès qu'un id
   * est présent). */
  const [focusedNameExercise, setFocusedNameExercise] = useState<{ sessionIdx: number; exIdx: number } | null>(null);
  const { confirm, ConfirmModal } = useConfirmDialog();

  useEffect(() => {
    getExerciseRecords().then(setRecords);
  }, []);

  // Defensive clamp: a program can in theory reach this screen with fewer
  // days than `selectedDay` currently points at (e.g. an externally-crafted
  // or legacy program object) — keep the selection in bounds rather than
  // letting the day editor below dereference an out-of-range day.
  useEffect(() => {
    if (!program) return;
    if (program.days.length > 0 && selectedDay > program.days.length) {
      setSelectedDay(program.days.length);
    }
  }, [program, selectedDay]);

  // Renseigné uniquement juste après "Importer un programme" (voir
  // program-import.tsx / import-review/[id].tsx) — résume combien
  // d'exercices ont été liés automatiquement, revus manuellement ou créés.
  const [importSummary, setImportSummary] = useState<string | null>(() =>
    buildImportSummary(linked, created, toReview),
  );

  useEffect(() => {
    (async () => {
      // Load plans (individual sessions the user has created) for the import modal
      const plans = await getPlans();
      setAvailablePlans(plans);
      if (isNew) {
        const defaultDuration = isStretch ? 14 : isCardio ? 28 : 30;
        setProgram({
          id: uid(),
          title: "",
          description: "",
          durationDays: defaultDuration,
          level: "debutant",
          goal: isStretch
            ? "Souplesse & mobilité"
            : isCardio
              ? "Endurance & cardio"
              : "",
          coverEmoji: isStretch ? "🧘" : isCardio ? "🏃" : "💪",
          color: isStretch
            ? PLAN_TYPE_COLORS.stretch
            : isCardio
              ? PLAN_TYPE_COLORS.cardio
              : COVER_COLORS[0],
          days: Array.from({ length: defaultDuration }, () => emptyDay()),
          isCustom: true,
          category: isStretch ? "stretch" : isCardio ? "cardio" : "workout",
        });
      } else {
        const list = (await getCustomPrograms()) as Program[];
        const p = list.find((x) => x.id === id);
        if (p) setProgram(p);
        else {
          Alert.alert("Programme introuvable");
          router.back();
        }
      }
    })();
  }, [id, isNew, isStretch, isCardio]);

  const patch = useCallback(<K extends keyof Program>(k: K, v: Program[K]) => {
    setProgram((p) => (p ? { ...p, [k]: v } : p));
  }, []);

  const updateDay = useCallback((idx: number, updater: (d: ProgramDay) => ProgramDay) => {
    setProgram((p) => {
      if (!p) return p;
      const days = [...p.days];
      days[idx - 1] = updater(days[idx - 1]);
      return { ...p, days };
    });
  }, []);

  /** Lie l'exercice `(sessionIdx, exIdx)` (texte libre) au `record` choisi —
   * même mécanisme que `plan/[id].tsx` (`linkExerciseToRecord`). Corrige
   * aussi le nom affiché vers `learned.nameFr` (sinon seul `exerciseRecordId`
   * changeait et le texte tapé restait affiché tel quel) et propage la
   * liaison à tout autre exercice de la MÊME séance portant exactement le
   * même nom d'origine — un mouvement répété plusieurs fois dans une séance
   * (ex. un round-robin) n'a besoin que d'une seule liaison. */
  const linkExerciseToRecord = async (
    sessionIdx: number,
    exIdx: number,
    rawName: string,
    record: ExerciseRecord,
  ) => {
    const learned = learnAlias(record, rawName);
    if (learned !== record) {
      await saveExerciseRecord(learned);
      setRecords((prev) => prev.map((r) => (r.id === learned.id ? learned : r)));
    }
    const key = rawName.trim().toLowerCase();
    updateDay(selectedDay, (d) => ({
      ...d,
      sessions: d.sessions.map((s, si) =>
        si !== sessionIdx
          ? s
          : {
              ...s,
              exercises: s.exercises.map((ex, ei) => {
                const sameEntry = ei === exIdx;
                const sameName = key.length > 0 && ex.name.trim().toLowerCase() === key;
                if (!sameEntry && !sameName) return ex;
                return { ...ex, name: learned.nameFr, exerciseRecordId: learned.id, matchConfidence: "manual" };
              }),
            },
      ),
    }));
    setLinkingExercise(null);
  };

  /** Cartes du circuit pour l'exercice `(sessionIdx, exIdx)` du jour
   * sélectionné — même logique de dérivation que `plan/[id].tsx`. */
  const getCircuitCardsFor = (
    sessionIdx: number,
    exIdx: number,
    exercise: ExerciseTemplate,
  ): CircuitCardDraft[] => {
    const key = `${selectedDay}-${sessionIdx}-${exIdx}`;
    const existing = circuitCards[key];
    if (existing) return existing;
    const parsed = parseCompositeExerciseName(exercise.name);
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
              name: exercise.name,
              exerciseRecordId: (exercise as any).exerciseRecordId ?? null,
              reps: exercise.notes || "",
            },
          ];
    setCircuitCards((prev) => (prev[key] ? prev : { ...prev, [key]: seeded }));
    return seeded;
  };

  const applyCircuitCardsFor = (
    sessionIdx: number,
    exIdx: number,
    exercise: ExerciseTemplate,
    cards: CircuitCardDraft[],
  ) => {
    const key = `${selectedDay}-${sessionIdx}-${exIdx}`;
    setCircuitCards((prev) => ({ ...prev, [key]: cards }));
    const composed = composeCircuitFromCards(cards, titlePrefixForExercise(exercise));
    updateDay(selectedDay, (d) => ({
      ...d,
      sessions: d.sessions.map((s, si) =>
        si !== sessionIdx
          ? s
          : {
              ...s,
              exercises: s.exercises.map((ex, ei) =>
                ei !== exIdx
                  ? ex
                  : {
                      ...ex,
                      name: composed.name,
                      notes: composed.notes,
                      exerciseRecordId: composed.exerciseRecordId,
                      matchConfidence: composed.exerciseRecordId ? "manual" : null,
                    },
              ),
            },
      ),
    }));
  };

  /** Génère un bloc EMOM round-robin dans la séance `sessionIdx` — miroir de
   * `applyEmomBlock` (`plan/[id].tsx`) : remplace le SEUL exercice stub édité
   * `(sessionIdx, exIdx)` par `totalMinutes` `ExerciseTemplate` distinctes,
   * les cartes tournant en boucle. */
  const applyEmomBlockToSession = (
    sessionIdx: number,
    exIdx: number,
    cards: CircuitCardDraft[],
    totalMinutes: number,
  ) => {
    const filled = cards.filter((c) => c.name.trim());
    if (filled.length === 0 || totalMinutes < 1) return;
    const blockId = uid();
    const title = `EMOM ${totalMinutes} min`;
    const generated: ExerciseTemplate[] = Array.from({ length: totalMinutes }, (_, roundIndex) => {
      const card = filled[roundIndex % filled.length];
      return {
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
      } as ExerciseTemplate;
    });
    updateDay(selectedDay, (d) => ({
      ...d,
      sessions: d.sessions.map((s, si) =>
        si !== sessionIdx
          ? s
          : { ...s, exercises: s.exercises.flatMap((e, ei) => (ei === exIdx ? generated : [e])) },
      ),
    }));
    const key = `${selectedDay}-${sessionIdx}-${exIdx}`;
    setCircuitCards((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  /** Génère un bloc Tours dans la séance `sessionIdx` du jour sélectionné —
   * même convention d'aplatissement que `plan/[id].tsx` (`addToursBlock`). */
  const addToursBlockToSession = (
    sessionIdx: number,
    sequence: CircuitCardDraft[],
    rounds: number,
    restSeconds: number,
  ) => {
    const filled = sequence.filter((c) => c.name.trim());
    if (filled.length === 0 || rounds < 1) return;
    const blockId = uid();
    const generated: ExerciseTemplate[] = [];
    for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
      filled.forEach((card, sequenceIndex) => {
        const isLastOfRound = sequenceIndex === filled.length - 1;
        const isLastRound = roundIndex === rounds - 1;
        generated.push({
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
        } as ExerciseTemplate);
      });
    }
    updateDay(selectedDay, (d) => ({
      ...d,
      sessions: d.sessions.map((s, si) =>
        si !== sessionIdx ? s : { ...s, exercises: [...s.exercises, ...generated] },
      ),
    }));
    setToursBuilderSessionIdx(null);
    setToursCards([newCircuitCard()]);
    setToursRounds(3);
    setToursRestSeconds(0);
  };

  const setDuration = (n: number) => {
    if (!program) return;
    const target = Math.max(1, Math.min(60, n));
    let days = [...program.days];
    if (target > days.length) {
      days = [
        ...days,
        ...Array.from({ length: target - days.length }, () => emptyDay()),
      ];
    } else {
      days = days.slice(0, target);
    }
    setProgram({ ...program, durationDays: target, days });
    if (selectedDay > target) setSelectedDay(target);
  };

  const save = async () => {
    if (!program) return;
    if (!program.title.trim()) {
      Alert.alert("Titre requis", "Donne un nom à ton programme.");
      return;
    }
    const saved: Program = {
      ...program,
      title: program.title.trim(),
      goal: program.goal.trim() || "Objectif personnel",
      description:
        program.description.trim() ||
        `Programme personnalisé de ${program.durationDays} jours.`,
    };
    await saveCustomProgram(saved);
    if (isNew) {
      // Auto-activate the newly created program so it shows up in Entraînements
      const actives = await getActivePrograms();
      const alreadyActive = actives.some((a) => a.programId === saved.id);
      if (!alreadyActive) {
        await addActiveProgram({
          programId: saved.id,
          startedAt: new Date().toISOString(),
          completedSessions: [],
        });
      }
      // Navigate to the newly created program details so the user immediately sees it
      router.replace(`/program/${saved.id}`);
    } else {
      router.back();
    }
  };

  const remove = async () => {
    if (!program || isNew) return;
    const ok = await confirm({
      title: "Supprimer ce programme ?",
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    await deleteCustomProgram(program.id);
    router.back();
  };

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const currentDay: ProgramDay | null = program.days[selectedDay - 1] ?? program.days[0] ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="cancel-cp" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {isNew ? "Nouveau programme" : "Modifier programme"}
        </Text>
        <Pressable
          testID="save-cp"
          onPress={save}
          hitSlop={16}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.saveBtnText}>SAUVEGARDER</Text>
        </Pressable>
      </View>

      {importSummary && (
        <View style={styles.importSummaryBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
          <Text style={styles.importSummaryText}>{importSummary}</Text>
          <Pressable testID="import-summary-dismiss" hitSlop={8} onPress={() => setImportSummary(null)}>
            <Ionicons name="close" size={16} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meta */}
          <Text style={styles.label}>Titre</Text>
          <TextInput
            testID="cp-title"
            style={styles.input}
            value={program.title}
            onChangeText={(t) => patch("title", t)}
            placeholder="Ex: Mon programme 45 jours"
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <Text style={styles.label}>Objectif</Text>
          <TextInput
            testID="cp-goal"
            style={styles.input}
            value={program.goal}
            onChangeText={(t) => patch("goal", t)}
            placeholder="Prise de masse, perte de graisse…"
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            testID="cp-desc"
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            value={program.description}
            onChangeText={(t) => patch("description", t)}
            placeholder="Décris brièvement ton programme"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />

          <Text style={styles.label}>Niveau</Text>
          <View style={styles.chipsRow}>
            {LEVELS.map((l) => {
              const active = program.level === l;
              return (
                <Pressable
                  key={l}
                  testID={`cp-level-${l}`}
                  style={[styles.lvlChip, active && styles.lvlChipActive]}
                  onPress={() => patch("level", l)}
                >
                  <Text
                    style={[
                      styles.lvlChipText,
                      active && { color: "#fff" },
                    ]}
                  >
                    {LEVEL_LABEL[l].toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Icône</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
              >
                {COVER_EMOJIS.map((e) => {
                  const active = program.coverEmoji === e;
                  return (
                    <Pressable
                      key={e}
                      testID={`cp-emoji-${e}`}
                      style={[
                        styles.emojiBtn,
                        active && [styles.emojiBtnActive, { backgroundColor: program.color, borderColor: program.color }],
                      ]}
                      onPress={() => patch("coverEmoji", e)}
                    >
                      <Ionicons
                        name={programIconFor(e)}
                        size={20}
                        color={active ? "#fff" : colors.onSurfaceSecondary}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.label}>Couleur</Text>
          <View style={styles.colorRow}>
            {COVER_COLORS.map((c) => (
              <Pressable
                key={c}
                testID={`cp-color-${c}`}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  program.color === c && styles.colorSwatchActive,
                ]}
                onPress={() => patch("color", c)}
              />
            ))}
          </View>

          <Text style={styles.label}>Durée (jours)</Text>
          <View style={styles.durationRow}>
            <Pressable
              testID="dec-dur"
              style={styles.durationBtn}
              onPress={() => setDuration(program.durationDays - 1)}
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </Pressable>
            <Text style={styles.durationVal}>{program.durationDays}</Text>
            <Pressable
              testID="inc-dur"
              style={styles.durationBtn}
              onPress={() => setDuration(program.durationDays + 1)}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Day picker */}
          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            Planning ({program.durationDays} jours)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPickerRow}
          >
            {program.days.map((d, i) => {
              const active = i + 1 === selectedDay;
              return (
                <Pressable
                  key={i}
                  testID={`day-pick-${i + 1}`}
                  style={[
                    styles.dayPick,
                    active && { backgroundColor: program.color, borderColor: program.color },
                    d.rest && !active && styles.dayPickRest,
                  ]}
                  onPress={() => setSelectedDay(i + 1)}
                >
                  {d.rest ? (
                    <Ionicons
                      name="bed"
                      size={14}
                      color={active ? "#fff" : colors.onSurfaceTertiary}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.dayPickText,
                        active && { color: "#fff" },
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected day editor */}
          {currentDay ? (
            <View style={styles.dayEditor}>
              <View style={styles.dayEditorHead}>
                <Text style={styles.dayEditorTitle}>
                  Jour {selectedDay}
                </Text>
                <Pressable
                  testID="toggle-rest"
                  style={[styles.restToggle, currentDay.rest && styles.restToggleOn]}
                  onPress={() =>
                    updateDay(selectedDay, (d) =>
                      d.rest
                        ? { rest: false, title: "Nouvelle séance", sessions: [newSession()] }
                        : { rest: true, title: "Repos", sessions: [] },
                    )
                  }
                >
                  <Ionicons
                    name={currentDay.rest ? "bed" : "flame"}
                    size={12}
                    color={currentDay.rest ? "#fff" : colors.brand}
                  />
                  <Text
                    style={[
                      styles.restToggleText,
                      currentDay.rest && { color: "#fff" },
                    ]}
                  >
                    {currentDay.rest ? "REPOS" : "SÉANCE"}
                  </Text>
                </Pressable>
              </View>

              {!currentDay.rest && (
                <>
                  {currentDay.sessions.map((s, si) => (
                    <View key={si}>
                      <SessionEditor
                        session={s}
                        onChange={(patch) =>
                          updateDay(selectedDay, (d) => ({
                            ...d,
                            sessions: d.sessions.map((x, i) =>
                              i === si ? { ...x, ...patch } : x,
                            ),
                          }))
                        }
                        onRemove={() =>
                          updateDay(selectedDay, (d) => ({
                            ...d,
                            sessions: d.sessions.filter((_, i) => i !== si),
                          }))
                        }
                        onPickExercisePic={(exIdx) =>
                          setPickingIdx({ sessionIdx: si, exIdx })
                        }
                        onAddFromLibrary={() => setLibraryTarget({ kind: "add", sessionIdx: si })}
                        index={si}
                        records={records}
                        getCircuitCards={(exIdx, exercise) => getCircuitCardsFor(si, exIdx, exercise)}
                        onCircuitCardsChange={(exIdx, exercise, cards) =>
                          applyCircuitCardsFor(si, exIdx, exercise, cards)
                        }
                        onOpenCardPicker={(exIdx, cardId) =>
                          setLibraryTarget({ kind: "card", sessionIdx: si, exIdx, cardId })
                        }
                        onOpenToursBuilder={() => setToursBuilderSessionIdx(si)}
                        onRequestLink={(exIdx) => setLinkingExercise({ sessionIdx: si, exIdx })}
                        onPickSuggestion={(exIdx, record) =>
                          linkExerciseToRecord(si, exIdx, s.exercises[exIdx]?.name ?? "", record)
                        }
                        onFocusName={(exIdx) => setFocusedNameExercise({ sessionIdx: si, exIdx })}
                        focusedExIdx={focusedNameExercise?.sessionIdx === si ? focusedNameExercise.exIdx : null}
                        onGenerateEmom={(exIdx, cards, minutes) =>
                          applyEmomBlockToSession(si, exIdx, cards, minutes)
                        }
                      />
                      {toursBuilderSessionIdx === si && (
                        <View style={styles.exCard} testID={`tours-builder-${si}`}>
                          <Text style={styles.toursBuilderTitle}>Bloc Tours</Text>
                          <Text style={styles.miniLabel}>
                            Séquence répétée N fois, enchaînement automatique.
                          </Text>
                          <CircuitCardListEditor
                            cards={toursCards}
                            onChange={setToursCards}
                            records={records}
                            onOpenPicker={(cardId) => setLibraryTarget({ kind: "tours-card", sessionIdx: si, cardId })}
                          />
                          <Pressable
                            testID="tours-add-card-btn"
                            style={styles.addCardBtn}
                            onPress={() => setToursCards((prev) => [...prev, newCircuitCard()])}
                          >
                            <Ionicons name="add" size={14} color={colors.brand} />
                            <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
                          </Pressable>
                          <View style={styles.fieldsRow}>
                            <MiniField
                              label="Nombre de tours"
                              value={String(toursRounds)}
                              keyboard="number-pad"
                              onChange={(t) => setToursRounds(parseInt(t || "0", 10) || 0)}
                              testID="tours-rounds"
                            />
                            <DurationField
                              label="Repos entre tours"
                              valueSeconds={toursRestSeconds}
                              onChange={setToursRestSeconds}
                              testID="tours-rest"
                            />
                          </View>
                          <Pressable
                            testID="tours-generate-btn"
                            style={styles.addExBtn}
                            onPress={() => addToursBlockToSession(si, toursCards, toursRounds, toursRestSeconds)}
                          >
                            <Ionicons name="checkmark" size={14} color={colors.brand} />
                            <Text style={styles.addExText}>
                              Générer {toursRounds * toursCards.filter((c) => c.name.trim()).length || ""} exercices
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                  <View style={styles.addSessRow}>
                    <Pressable
                      testID="add-session"
                      style={[styles.addSessBtn, { flex: 1 }]}
                      onPress={() =>
                        updateDay(selectedDay, (d) => ({
                          ...d,
                          sessions: [...d.sessions, newSession()],
                        }))
                      }
                    >
                      <Ionicons name="add" size={16} color={colors.brand} />
                      <Text style={styles.addSessText}>SÉANCE VIDE</Text>
                    </Pressable>
                    <Pressable
                      testID="import-session"
                      style={[styles.addSessBtn, { flex: 1 }]}
                      onPress={() => setImportOpen(true)}
                    >
                      <Ionicons name="download" size={16} color={colors.brand} />
                      <Text style={styles.addSessText}>IMPORTER</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={styles.dayEditor}>
              <Text style={styles.emptyDayText}>Aucun jour dans ce programme pour l&apos;instant.</Text>
              <Pressable
                testID="add-first-day"
                style={[styles.addSessBtn, { marginTop: spacing.sm }]}
                onPress={() => {
                  setProgram((p) =>
                    p ? { ...p, durationDays: p.days.length + 1, days: [...p.days, emptyDay()] } : p,
                  );
                  setSelectedDay(1);
                }}
              >
                <Ionicons name="add" size={16} color={colors.brand} />
                <Text style={styles.addSessText}>AJOUTER UN JOUR</Text>
              </Pressable>
            </View>
          )}

          {!isNew && (
            <Pressable style={styles.delBtn} onPress={remove}>
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={styles.delText}>Supprimer le programme</Text>
            </Pressable>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicturePicker
        visible={pickingIdx !== null}
        currentPhoto={
          pickingIdx
            ? ((program.days[selectedDay - 1]?.sessions[pickingIdx.sessionIdx]
                ?.exercises[pickingIdx.exIdx] as any)?.photoBase64 ?? null)
            : null
        }
        currentIconKey={
          pickingIdx
            ? ((program.days[selectedDay - 1]?.sessions[pickingIdx.sessionIdx]
                ?.exercises[pickingIdx.exIdx] as any)?.iconKey ?? null)
            : null
        }
        onClose={() => setPickingIdx(null)}
        onPick={(payload) => {
          if (!pickingIdx) return;
          const { sessionIdx, exIdx } = pickingIdx;
          updateDay(selectedDay, (d) => ({
            ...d,
            sessions: d.sessions.map((s, si) =>
              si !== sessionIdx
                ? s
                : {
                    ...s,
                    exercises: s.exercises.map((ex, ei) =>
                      ei !== exIdx ? ex : { ...ex, ...payload },
                    ),
                  },
            ),
          }));
        }}
      />

      <PlanPickerModal
        visible={importOpen}
        plans={availablePlans}
        onClose={() => setImportOpen(false)}
        onPick={(plan) => {
          // Convert Plan into ProgramSession and append to selected day
          const importedSession: ProgramSession = {
            label: "",
            title: plan.title,
            exercises: plan.exercises.map((e) => ({
              name: e.name,
              mode: e.mode,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              rest_seconds: e.rest_seconds,
              duration_seconds: e.duration_seconds,
              notes: e.notes,
              photoBase64: e.photoBase64 ?? null,
              iconKey: e.iconKey ?? null,
            })),
          };
          updateDay(selectedDay, (d) => ({
            rest: false,
            title: d.rest ? plan.title : d.title,
            sessions: [...(d.rest ? [] : d.sessions), importedSession],
          }));
          setImportOpen(false);
        }}
      />
      <ExerciseLibraryPicker
        visible={libraryTarget !== null}
        onClose={() => setLibraryTarget(null)}
        onPick={(name, exerciseRecordId) => {
          if (!libraryTarget) return;
          if (libraryTarget.kind === "add") {
            const targetSessionIdx = libraryTarget.sessionIdx;
            updateDay(selectedDay, (d) => ({
              ...d,
              sessions: d.sessions.map((s, si) =>
                si !== targetSessionIdx
                  ? s
                  : {
                      ...s,
                      exercises: [
                        ...s.exercises,
                        {
                          name,
                          mode: "reps",
                          sets: 3,
                          reps: "10",
                          weight: null,
                          rest_seconds: 60,
                          duration_seconds: null,
                          notes: null,
                          exerciseRecordId: exerciseRecordId ?? null,
                          matchConfidence: exerciseRecordId ? "manual" : null,
                        },
                      ],
                    },
              ),
            }));
          } else if (libraryTarget.kind === "card") {
            const { sessionIdx, exIdx, cardId } = libraryTarget;
            const exercise = program.days[selectedDay - 1]?.sessions[sessionIdx]?.exercises[exIdx];
            if (exercise) {
              const cards = getCircuitCardsFor(sessionIdx, exIdx, exercise).map((c) =>
                c.id === cardId ? { ...c, name, exerciseRecordId: exerciseRecordId ?? null } : c,
              );
              if (exercise.mode === "emom") {
                const key = `${selectedDay}-${sessionIdx}-${exIdx}`;
                setCircuitCards((prev) => ({ ...prev, [key]: cards }));
              } else {
                applyCircuitCardsFor(sessionIdx, exIdx, exercise, cards);
              }
            }
          } else if (libraryTarget.kind === "tours-card") {
            const { cardId } = libraryTarget;
            setToursCards((prev) =>
              prev.map((c) =>
                c.id === cardId ? { ...c, name, exerciseRecordId: exerciseRecordId ?? null } : c,
              ),
            );
          }
          setLibraryTarget(null);
        }}
      />
      {linkingExercise && (
        <ExerciseLinkModal
          rawName={
            program.days[selectedDay - 1]?.sessions[linkingExercise.sessionIdx]
              ?.exercises[linkingExercise.exIdx]?.name ?? ""
          }
          records={records}
          onClose={() => setLinkingExercise(null)}
          onPickRecord={(record) => {
            const exercise =
              program.days[selectedDay - 1]?.sessions[linkingExercise.sessionIdx]
                ?.exercises[linkingExercise.exIdx];
            if (exercise) {
              linkExerciseToRecord(linkingExercise.sessionIdx, linkingExercise.exIdx, exercise.name, record);
            }
          }}
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
            await linkExerciseToRecord(linkingExercise.sessionIdx, linkingExercise.exIdx, nameFr, record);
          }}
        />
      )}
      {ConfirmModal}
    </SafeAreaView>
  );
}

function PlanPickerModal({
  visible,
  plans,
  onClose,
  onPick,
}: {
  visible: boolean;
  plans: Plan[];
  onClose: () => void;
  onPick: (p: Plan) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Importer une séance</Text>
          <Text style={styles.sheetHelp}>
            Choisis une séance individuelle déjà créée pour l&apos;ajouter à ce jour.
          </Text>
          {plans.length === 0 ? (
            <View style={styles.emptyImport}>
              <Ionicons name="folder-open" size={40} color={colors.brand} />
              <Text style={styles.emptyImportTitle}>
                Aucune séance individuelle
              </Text>
              <Text style={styles.emptyImportSub}>
                Crée une séance dans l&apos;onglet Entraînements → Séances
                individuelles pour pouvoir l&apos;importer ici.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {plans.map((p) => {
                const est = estimateSessionDurationSeconds(p.exercises);
                return (
                  <Pressable
                    key={p.id}
                    testID={`import-plan-${p.id}`}
                    style={styles.planCard}
                    onPress={() => onPick(p)}
                  >
                    <View
                      style={[
                        styles.planIcon,
                        p.type === "cardio" && {
                          backgroundColor: withAlpha(PLAN_TYPE_COLORS.cardio, 25),
                        },
                        p.type === "hiit" && {
                          backgroundColor: withAlpha(PLAN_TYPE_COLORS.hiit, 25),
                        },
                        p.category === "stretch" && {
                          backgroundColor: withAlpha(PLAN_TYPE_COLORS.stretch, 25),
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          p.category === "stretch"
                            ? "body"
                            : p.type === "cardio"
                              ? "walk"
                              : p.type === "hiit"
                                ? "flash"
                                : "barbell"
                        }
                        size={16}
                        color={colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={styles.planMeta}>
                        {p.exercises.length} exercice
                        {p.exercises.length > 1 ? "s" : ""}
                        {est > 0 ? ` · ${formatEstimatedDuration(est)}` : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.onSurfaceTertiary}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Pressable
            style={styles.sheetCloseBtn}
            onPress={onClose}
            testID="import-close"
          >
            <Text style={styles.sheetCloseText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SessionEditor({
  session,
  onChange,
  onRemove,
  onPickExercisePic,
  onAddFromLibrary,
  index,
  records,
  getCircuitCards,
  onCircuitCardsChange,
  onOpenCardPicker,
  onOpenToursBuilder,
  onRequestLink,
  onPickSuggestion,
  onFocusName,
  focusedExIdx,
  onGenerateEmom,
}: {
  session: ProgramSession;
  onChange: (p: Partial<ProgramSession>) => void;
  onRemove: () => void;
  onPickExercisePic: (exIdx: number) => void;
  onAddFromLibrary: () => void;
  index: number;
  records: ExerciseRecord[];
  getCircuitCards: (exIdx: number, exercise: ExerciseTemplate) => CircuitCardDraft[];
  onCircuitCardsChange: (exIdx: number, exercise: ExerciseTemplate, cards: CircuitCardDraft[]) => void;
  onOpenCardPicker: (exIdx: number, cardId: string) => void;
  onOpenToursBuilder: () => void;
  onRequestLink: (exIdx: number) => void;
  onPickSuggestion: (exIdx: number, record: ExerciseRecord) => void;
  onFocusName: (exIdx: number) => void;
  focusedExIdx: number | null;
  onGenerateEmom: (exIdx: number, cards: CircuitCardDraft[], totalMinutes: number) => void;
}) {
  return (
    <View style={styles.sessBox} testID={`session-editor-${index}`}>
      <View style={styles.sessHead}>
        <Text style={styles.sessNum}>SÉANCE #{index + 1}</Text>
        <Pressable
          testID={`remove-session-${index}`}
          onPress={onRemove}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={colors.onSurfaceTertiary} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniLabel}>Label</Text>
          <TextInput
            testID={`sess-label-${index}`}
            style={styles.miniInput}
            value={session.label}
            onChangeText={(t) => onChange({ label: t })}
            placeholder="Matin, Cardio…"
            placeholderTextColor={colors.onSurfaceTertiary}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Text style={styles.miniLabel}>Titre</Text>
          <TextInput
            testID={`sess-title-${index}`}
            style={styles.miniInput}
            value={session.title}
            onChangeText={(t) => onChange({ title: t })}
            placeholder="Push, Cardio 30 min…"
            placeholderTextColor={colors.onSurfaceTertiary}
          />
        </View>
      </View>
      <Text style={styles.miniLabel}>Exercices</Text>
      {session.exercises.map((e, ei) => (
        <ExerciseEditor
          key={ei}
          exercise={e}
          index={ei}
          records={records}
          onChange={(patch) =>
            onChange({
              exercises: session.exercises.map((x, i) =>
                i === ei ? { ...x, ...patch } : x,
              ),
            })
          }
          onRemove={() =>
            onChange({
              exercises: session.exercises.filter((_, i) => i !== ei),
            })
          }
          onPickPic={() => onPickExercisePic(ei)}
          onMoveUp={
            ei > 0
              ? () => {
                  const next = session.exercises.slice();
                  [next[ei - 1], next[ei]] = [next[ei], next[ei - 1]];
                  onChange({ exercises: next });
                }
              : undefined
          }
          onMoveDown={
            ei < session.exercises.length - 1
              ? () => {
                  const next = session.exercises.slice();
                  [next[ei], next[ei + 1]] = [next[ei + 1], next[ei]];
                  onChange({ exercises: next });
                }
              : undefined
          }
          circuitCards={getCircuitCards(ei, e)}
          onCircuitCardsChange={(cards) => onCircuitCardsChange(ei, e, cards)}
          onOpenCardPicker={(cardId) => onOpenCardPicker(ei, cardId)}
          onRequestLink={() => onRequestLink(ei)}
          onPickSuggestion={(record) => onPickSuggestion(ei, record)}
          onFocusName={() => onFocusName(ei)}
          isFocused={focusedExIdx === ei}
          onGenerateEmom={(cards, minutes) => onGenerateEmom(ei, cards, minutes)}
        />
      ))}
      <View style={styles.addExRow}>
        <Pressable
          testID={`add-tours-${index}`}
          style={[styles.addExBtn, { flex: 1 }]}
          onPress={onOpenToursBuilder}
        >
          <Ionicons name="repeat" size={14} color={colors.brand} />
          <Text style={styles.addExText}>Tours</Text>
        </Pressable>
        <Pressable
          testID={`add-ex-${index}`}
          style={[styles.addExBtn, { flex: 1 }]}
          onPress={() =>
            onChange({
              exercises: [
                ...session.exercises,
                {
                  name: "",
                  mode: "reps",
                  sets: 3,
                  reps: "10",
                  weight: null,
                  rest_seconds: 60,
                  duration_seconds: null,
                  notes: null,
                },
              ],
            })
          }
        >
          <Ionicons name="add" size={14} color={colors.brand} />
          <Text style={styles.addExText}>Manuel</Text>
        </Pressable>
        <Pressable
          testID={`add-ex-library-${index}`}
          style={[styles.addExBtn, { flex: 1 }]}
          onPress={onAddFromLibrary}
        >
          <Ionicons name="library" size={14} color={colors.brand} />
          <Text style={styles.addExText}>Bibliothèque</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExerciseEditor({
  exercise,
  index,
  onChange,
  onRemove,
  onPickPic,
  onMoveUp,
  onMoveDown,
  records,
  circuitCards,
  onCircuitCardsChange,
  onOpenCardPicker,
  onRequestLink,
  onPickSuggestion,
  onFocusName,
  isFocused,
  onGenerateEmom,
}: {
  exercise: ExerciseTemplate;
  index: number;
  onChange: (p: Partial<ExerciseTemplate>) => void;
  onRemove: () => void;
  onPickPic: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  records: ExerciseRecord[];
  circuitCards: CircuitCardDraft[];
  onCircuitCardsChange: (cards: CircuitCardDraft[]) => void;
  onOpenCardPicker: (cardId: string) => void;
  onRequestLink: () => void;
  onPickSuggestion: (record: ExerciseRecord) => void;
  onFocusName: () => void;
  isFocused: boolean;
  onGenerateEmom: (cards: CircuitCardDraft[], totalMinutes: number) => void;
}) {
  const composite = parseCompositeExerciseName(exercise.name);
  const needsLink = !composite && !exercise.exerciseRecordId && !matchExerciseRecord(exercise.name, records);
  const linkedRecord = exercise.exerciseRecordId ? records.find((r) => r.id === exercise.exerciseRecordId) : undefined;
  const nameMatchesLinked = !!linkedRecord && linkedRecord.nameFr.trim().toLowerCase() === exercise.name.trim().toLowerCase();
  const showSuggestions =
    !composite && exercise.name.trim().length >= 2 && !nameMatchesLinked && (needsLink || isFocused);
  const setMode = (m: ExerciseMode) => {
    const patch: Partial<ExerciseTemplate> = { mode: m };
    if (m === "reps") {
      patch.duration_seconds = null;
      patch.rest_seconds = exercise.rest_seconds || 60;
      patch.sets = exercise.sets || 3;
      patch.targetRounds = null;
    } else if (m === "time") {
      patch.duration_seconds = exercise.duration_seconds || 30;
      patch.rest_seconds = exercise.rest_seconds || 30;
      patch.sets = exercise.sets || 3;
      patch.targetRounds = null;
    } else if (m === "amrap") {
      patch.sets = 1;
      patch.duration_seconds = exercise.duration_seconds || 600;
      patch.rest_seconds = 0;
      patch.targetRounds = null;
    } else if (m === "emom") {
      patch.sets = exercise.sets || 10;
      patch.duration_seconds = 60;
      patch.rest_seconds = 0;
      patch.targetRounds = null;
    } else if (m === "for_time") {
      patch.sets = 1;
      patch.duration_seconds = exercise.duration_seconds || 900;
      patch.rest_seconds = 0;
      patch.targetRounds = exercise.targetRounds || 3;
    }
    onChange(patch);
  };

  return (
    <View style={styles.exCard} testID={`ex-editor-${index}`}>
      <View style={styles.exHead}>
        <Pressable onPress={onPickPic} testID={`ex-pic-editor-${index}`}>
          <ExerciseThumbnail
            photoBase64={(exercise as any).photoBase64}
            iconKey={(exercise as any).iconKey}
            name={exercise.name}
            records={records}
            exerciseRecordId={exercise.exerciseRecordId}
            size={40}
          />
        </Pressable>
        <TextInput
          testID={`ex-name-${index}`}
          style={styles.exNameInput}
          value={exercise.name}
          onChangeText={(t) => {
            if (!exercise.name.trim() && t.trim() && !exercise.exerciseRecordId) {
              onRequestLink();
            }
            onChange({ name: t });
          }}
          onFocus={onFocusName}
          placeholder="Nom de l'exercice"
          placeholderTextColor={colors.onSurfaceTertiary}
        />
        <Pressable
          testID={`move-ex-up-${index}`}
          hitSlop={8}
          disabled={!onMoveUp}
          onPress={onMoveUp}
        >
          <Ionicons
            name="chevron-up-circle"
            size={18}
            color={onMoveUp ? colors.onSurfaceSecondary : colors.surfaceTertiary}
          />
        </Pressable>
        <Pressable
          testID={`move-ex-down-${index}`}
          hitSlop={8}
          disabled={!onMoveDown}
          onPress={onMoveDown}
        >
          <Ionicons
            name="chevron-down-circle"
            size={18}
            color={onMoveDown ? colors.onSurfaceSecondary : colors.surfaceTertiary}
          />
        </Pressable>
        <Pressable
          testID={`remove-ex-${index}`}
          hitSlop={8}
          onPress={onRemove}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.onSurfaceTertiary}
          />
        </Pressable>
      </View>

      {needsLink && (
        <Pressable
          testID={`ex-link-${index}`}
          style={styles.linkHint}
          onPress={onRequestLink}
        >
          <Ionicons name="link-outline" size={12} color={colors.warning} />
          <Text style={styles.linkHintText}>
            Pas encore illustré — lier à la bibliothèque
          </Text>
          <Ionicons name="chevron-forward" size={12} color={colors.warning} />
        </Pressable>
      )}
      {showSuggestions && (
        <ExerciseNameSuggestions query={exercise.name} records={records} onPick={onPickSuggestion} />
      )}

      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const active = exercise.mode === m.key;
          return (
            <Pressable
              key={m.key}
              testID={`ex-mode-${index}-${m.key}`}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() => setMode(m.key)}
            >
              <Text
                style={[
                  styles.modeChipText,
                  active && { color: "#fff" },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {exercise.mode === "reps" && (
        <>
          <View style={styles.fieldsRow}>
            <MiniField
              label="Séries"
              value={String(exercise.sets)}
              keyboard="number-pad"
              onChange={(t) =>
                onChange({ sets: parseInt(t || "0", 10) || 0 })
              }
              testID={`ex-sets-${index}`}
            />
            <MiniField
              label="Reps"
              value={exercise.reps}
              onChange={(t) => onChange({ reps: t })}
              testID={`ex-reps-${index}`}
            />
          </View>
          <View style={styles.fieldsRow}>
            <DurationField
              label="Repos"
              valueSeconds={exercise.rest_seconds}
              onChange={(v) => onChange({ rest_seconds: v })}
              testID={`ex-rest-${index}`}
            />
            <MiniField
              label="Poids"
              value={exercise.weight || ""}
              onChange={(t) =>
                onChange({ weight: t.trim() ? t : null })
              }
              placeholder="Ex: 40kg"
              testID={`ex-weight-${index}`}
            />
          </View>
        </>
      )}

      {exercise.mode === "time" && (
        <>
          <View style={styles.fieldsRow}>
            <MiniField
              label="Séries"
              value={String(exercise.sets)}
              keyboard="number-pad"
              onChange={(t) =>
                onChange({ sets: parseInt(t || "0", 10) || 0 })
              }
              testID={`ex-sets-${index}`}
            />
            <DurationField
              label="Durée"
              valueSeconds={exercise.duration_seconds ?? 30}
              onChange={(v) => onChange({ duration_seconds: v })}
              testID={`ex-duration-${index}`}
            />
          </View>
          <DurationField
            label="Repos"
            valueSeconds={exercise.rest_seconds}
            onChange={(v) => onChange({ rest_seconds: v })}
            testID={`ex-rest-${index}`}
          />
        </>
      )}

      {exercise.mode === "amrap" && (
        <>
          <DurationField
            label="Durée totale"
            valueSeconds={exercise.duration_seconds ?? 600}
            presetsSeconds={[300, 480, 600, 720, 900, 1200]}
            onChange={(v) => onChange({ duration_seconds: v })}
            testID={`ex-duration-${index}`}
          />
          <CircuitCardListEditor
            cards={circuitCards}
            onChange={onCircuitCardsChange}
            records={records}
            onOpenPicker={onOpenCardPicker}
          />
          <Pressable
            testID={`ex-add-card-${index}`}
            style={styles.addCardBtn}
            onPress={() => onCircuitCardsChange([...circuitCards, newCircuitCard()])}
          >
            <Ionicons name="add" size={14} color={colors.brand} />
            <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
          </Pressable>
        </>
      )}

      {exercise.mode === "for_time" && (
        <>
          <View style={styles.fieldsRow}>
            <DurationField
              label="Cap chrono"
              valueSeconds={exercise.duration_seconds ?? 900}
              presetsSeconds={[300, 600, 720, 900, 1200, 1500]}
              onChange={(v) => onChange({ duration_seconds: v })}
              testID={`ex-duration-${index}`}
            />
            <MiniField
              label="Tours cible"
              value={String(exercise.targetRounds ?? 1)}
              keyboard="number-pad"
              onChange={(t) => onChange({ targetRounds: parseInt(t || "0", 10) || 0 })}
              testID={`ex-target-rounds-${index}`}
            />
          </View>
          <CircuitCardListEditor
            cards={circuitCards}
            onChange={onCircuitCardsChange}
            records={records}
            onOpenPicker={onOpenCardPicker}
          />
          <Pressable
            testID={`ex-add-card-${index}`}
            style={styles.addCardBtn}
            onPress={() => onCircuitCardsChange([...circuitCards, newCircuitCard()])}
          >
            <Ionicons name="add" size={14} color={colors.brand} />
            <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
          </Pressable>
        </>
      )}

      {exercise.mode === "emom" && (
        <>
          <View style={styles.fieldsRow}>
            <MiniField
              label="Durée totale (minutes)"
              value={String(exercise.sets)}
              keyboard="number-pad"
              onChange={(t) => onChange({ sets: parseInt(t || "0", 10) || 0 })}
              testID={`ex-sets-${index}`}
            />
          </View>
          <Text style={styles.miniLabel}>
            Construis les mouvements qui tournent minute par minute, puis génère les rounds.
          </Text>
          <CircuitCardListEditor
            cards={circuitCards}
            onChange={onCircuitCardsChange}
            records={records}
            onOpenPicker={onOpenCardPicker}
          />
          <Pressable
            testID={`ex-add-card-${index}`}
            style={styles.addCardBtn}
            onPress={() => onCircuitCardsChange([...circuitCards, newCircuitCard()])}
          >
            <Ionicons name="add" size={14} color={colors.brand} />
            <Text style={styles.addCardBtnText}>Ajouter un exercice</Text>
          </Pressable>
          <Pressable
            testID={`ex-generate-emom-${index}`}
            style={styles.addExBtn}
            onPress={() => onGenerateEmom(circuitCards, exercise.sets)}
          >
            <Ionicons name="checkmark" size={14} color={colors.brand} />
            <Text style={styles.addExText}>Générer {exercise.sets} exercices</Text>
          </Pressable>
        </>
      )}

      <TextInput
        testID={`ex-notes-${index}`}
        style={styles.notesInput}
        value={exercise.notes || ""}
        onChangeText={(t) => onChange({ notes: t.trim() ? t : null })}
        placeholder="Notes (optionnel)"
        placeholderTextColor={colors.onSurfaceTertiary}
      />
    </View>
  );
}

function MiniField({
  label,
  value,
  onChange,
  keyboard,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  keyboard?: "number-pad" | "default";
  placeholder?: string;
  testID?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={styles.fInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || "default"}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 },
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
  importSummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  importSummaryText: { flex: 1, color: colors.onSurface, fontWeight: "700", fontSize: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  scroll: { padding: spacing.lg, gap: spacing.sm },
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
  chipsRow: { flexDirection: "row", gap: spacing.sm },
  lvlChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lvlChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  lvlChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: spacing.md },
  emojiRow: { gap: 6, paddingRight: spacing.lg },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiBtnActive: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  colorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: { borderColor: "#fff" },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  durationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  durationVal: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 22,
    minWidth: 40,
    textAlign: "center",
  },
  dayPickerRow: {
    paddingVertical: spacing.sm,
    gap: 6,
  },
  dayPick: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPickRest: { backgroundColor: colors.surface },
  dayPickText: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 12,
  },
  dayEditor: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  dayEditorHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayEditorTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 16,
  },
  restToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  restToggleOn: { backgroundColor: colors.brand },
  restToggleText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  sessBox: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 6,
  },
  sessHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessNum: { color: colors.brand, fontWeight: "800", fontSize: 10, letterSpacing: 0.8 },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "700",
    marginTop: 4,
  },
  miniInput: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 8,
    color: colors.onSurface,
    fontSize: 13,
  },
  exCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  exNameInput: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    padding: 8,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    gap: 3,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    padding: 3,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 4,
  },
  modeChipActive: { backgroundColor: colors.brand },
  modeChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  fieldsRow: { flexDirection: "row", gap: 6 },
  fLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    padding: 6,
    color: colors.onSurface,
    fontSize: 12,
  },
  notesInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    padding: 6,
    color: colors.onSurface,
    fontSize: 11,
    fontStyle: "italic",
  },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  addExText: { color: colors.brand, fontWeight: "700", fontSize: 11 },
  addExRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
  addSessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: radius.sm,
  },
  addSessRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  sheetTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  sheetHelp: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  planMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  emptyImport: {
    alignItems: "center",
    padding: spacing.lg,
    gap: 8,
  },
  emptyImportTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyImportSub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
  },
  sheetCloseBtn: {
    marginTop: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCloseText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "800",
  },
  addSessText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  delBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  delText: { color: colors.error, fontWeight: "700" },
  emptyDayText: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    textAlign: "center",
  },
});
