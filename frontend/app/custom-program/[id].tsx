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
import { colors, radius, spacing } from "@/src/theme";
import ExercisePicture from "@/src/components/ExercisePicture";
import ExercisePicturePicker from "@/src/components/ExercisePicturePicker";
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

const LEVELS: ProgramLevel[] = ["debutant", "intermediaire", "avance"];
const MODES: { key: ExerciseMode; label: string }[] = [
  { key: "reps", label: "REPS" },
  { key: "time", label: "TIME" },
  { key: "amrap", label: "AMRAP" },
  { key: "emom", label: "EMOM" },
];

function emptyDay(): ProgramDay {
  return { rest: true, title: "Repos", sessions: [] };
}

function newSession(): ProgramSession {
  return {
    label: "",
    title: "Nouvelle séance",
    exercises: [
      {
        name: "Exercice",
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
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const isStretch = category === "stretch";
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [pickingIdx, setPickingIdx] = useState<{ sessionIdx: number; exIdx: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  useEffect(() => {
    (async () => {
      // Load plans (individual sessions the user has created) for the import modal
      const plans = await getPlans();
      setAvailablePlans(plans);
      if (isNew) {
        setProgram({
          id: uid(),
          title: "",
          description: "",
          durationDays: isStretch ? 14 : 30,
          level: "debutant",
          goal: isStretch ? "Souplesse & mobilité" : "",
          coverEmoji: isStretch ? "🧘" : "💪",
          color: isStretch ? "#00E676" : COVER_COLORS[0],
          days: Array.from({ length: isStretch ? 14 : 30 }, () => emptyDay()),
          isCustom: true,
          category: isStretch ? "stretch" : "workout",
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
  }, [id, isNew, isStretch]);

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
    const msg = "Supprimer ce programme ?";
    const doDel = async () => {
      await deleteCustomProgram(program.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm(msg)) doDel();
      return;
    }
    Alert.alert(msg, "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: doDel },
    ]);
  };

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const currentDay = program.days[selectedDay - 1];

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
              <Text style={styles.label}>Emoji</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
              >
                {COVER_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    testID={`cp-emoji-${e}`}
                    style={[
                      styles.emojiBtn,
                      program.coverEmoji === e && styles.emojiBtnActive,
                    ]}
                    onPress={() => patch("coverEmoji", e)}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </Pressable>
                ))}
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
                  <Text
                    style={[
                      styles.dayPickText,
                      active && { color: "#fff" },
                    ]}
                  >
                    {d.rest ? "😴" : i + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected day editor */}
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
                  <SessionEditor
                    key={si}
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
                    index={si}
                  />
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
                        p.type === "cardio" && { backgroundColor: "#00B0FF40" },
                        p.type === "hiit" && { backgroundColor: "#FF6B0040" },
                        p.category === "stretch" && {
                          backgroundColor: "#00E67640",
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
  index,
}: {
  session: ProgramSession;
  onChange: (p: Partial<ProgramSession>) => void;
  onRemove: () => void;
  onPickExercisePic: (exIdx: number) => void;
  index: number;
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
        />
      ))}
      <Pressable
        testID={`add-ex-${index}`}
        style={styles.addExBtn}
        onPress={() =>
          onChange({
            exercises: [
              ...session.exercises,
              {
                name: "Exercice",
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
        <Text style={styles.addExText}>Ajouter un exercice</Text>
      </Pressable>
    </View>
  );
}

function ExerciseEditor({
  exercise,
  index,
  onChange,
  onRemove,
  onPickPic,
}: {
  exercise: ExerciseTemplate;
  index: number;
  onChange: (p: Partial<ExerciseTemplate>) => void;
  onRemove: () => void;
  onPickPic: () => void;
}) {
  const setMode = (m: ExerciseMode) => {
    const patch: Partial<ExerciseTemplate> = { mode: m };
    if (m === "reps") {
      patch.duration_seconds = null;
      patch.rest_seconds = exercise.rest_seconds || 60;
      patch.sets = exercise.sets || 3;
    } else if (m === "time") {
      patch.duration_seconds = exercise.duration_seconds || 30;
      patch.rest_seconds = exercise.rest_seconds || 30;
      patch.sets = exercise.sets || 3;
    } else if (m === "amrap") {
      patch.sets = 1;
      patch.duration_seconds = exercise.duration_seconds || 600;
      patch.rest_seconds = 0;
    } else if (m === "emom") {
      patch.sets = exercise.sets || 10;
      patch.duration_seconds = 60;
      patch.rest_seconds = 0;
    }
    onChange(patch);
  };

  return (
    <View style={styles.exCard} testID={`ex-editor-${index}`}>
      <View style={styles.exHead}>
        <Pressable onPress={onPickPic} testID={`ex-pic-editor-${index}`}>
          <ExercisePicture
            photoBase64={(exercise as any).photoBase64}
            iconKey={(exercise as any).iconKey}
            name={exercise.name}
            size={40}
          />
        </Pressable>
        <TextInput
          testID={`ex-name-${index}`}
          style={styles.exNameInput}
          value={exercise.name}
          onChangeText={(t) => onChange({ name: t })}
          placeholder="Nom de l'exercice"
          placeholderTextColor={colors.onSurfaceTertiary}
        />
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
            <MiniField
              label="Repos (s)"
              value={String(exercise.rest_seconds)}
              keyboard="number-pad"
              onChange={(t) =>
                onChange({ rest_seconds: parseInt(t || "0", 10) || 0 })
              }
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
            <MiniField
              label="Durée (s)"
              value={String(exercise.duration_seconds ?? 30)}
              keyboard="number-pad"
              onChange={(t) =>
                onChange({ duration_seconds: parseInt(t || "0", 10) || 0 })
              }
              testID={`ex-duration-${index}`}
            />
          </View>
          <MiniField
            label="Repos (s)"
            value={String(exercise.rest_seconds)}
            keyboard="number-pad"
            onChange={(t) =>
              onChange({ rest_seconds: parseInt(t || "0", 10) || 0 })
            }
            testID={`ex-rest-${index}`}
          />
        </>
      )}

      {exercise.mode === "amrap" && (
        <MiniField
          label="Durée totale (s)"
          value={String(exercise.duration_seconds ?? 600)}
          keyboard="number-pad"
          onChange={(t) =>
            onChange({ duration_seconds: parseInt(t || "0", 10) || 0 })
          }
          testID={`ex-duration-${index}`}
        />
      )}

      {exercise.mode === "emom" && (
        <>
          <View style={styles.fieldsRow}>
            <MiniField
              label="Rounds (min)"
              value={String(exercise.sets)}
              keyboard="number-pad"
              onChange={(t) =>
                onChange({ sets: parseInt(t || "0", 10) || 0 })
              }
              testID={`ex-sets-${index}`}
            />
            <MiniField
              label="Reps / round"
              value={exercise.reps}
              onChange={(t) => onChange({ reps: t })}
              testID={`ex-reps-${index}`}
            />
          </View>
          <MiniField
            label="Durée round (s)"
            value={String(exercise.duration_seconds ?? 60)}
            keyboard="number-pad"
            onChange={(t) =>
              onChange({ duration_seconds: parseInt(t || "0", 10) || 0 })
            }
            testID={`ex-duration-${index}`}
          />
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
    gap: 4,
    padding: 6,
  },
  addExText: { color: colors.brand, fontWeight: "700", fontSize: 11 },
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
    backgroundColor: "rgba(0,0,0,0.65)",
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
});
