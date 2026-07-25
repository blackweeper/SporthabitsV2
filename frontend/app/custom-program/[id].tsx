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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  COVER_COLORS,
  COVER_EMOJIS,
  LEVEL_LABEL,
  Program,
  ProgramDay,
  ProgramLevel,
  ProgramSession,
} from "@/src/data/programs";
import {
  deleteCustomProgram,
  getCustomPrograms,
  saveCustomProgram,
  uid,
} from "@/src/utils/gym-storage";

const LEVELS: ProgramLevel[] = ["debutant", "intermediaire", "avance"];

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    (async () => {
      if (isNew) {
        setProgram({
          id: uid(),
          title: "",
          description: "",
          durationDays: 30,
          level: "intermediaire",
          goal: "",
          coverEmoji: "💪",
          color: COVER_COLORS[0],
          days: Array.from({ length: 30 }, () => emptyDay()),
          isCustom: true,
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
  }, [id, isNew]);

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
    await saveCustomProgram({
      ...program,
      title: program.title.trim(),
      goal: program.goal.trim() || "Objectif personnel",
      description:
        program.description.trim() ||
        `Programme personnalisé de ${program.durationDays} jours.`,
    });
    router.back();
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
        <Pressable testID="save-cp" onPress={save} hitSlop={12}>
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
                    index={si}
                  />
                ))}
                <Pressable
                  testID="add-session"
                  style={styles.addSessBtn}
                  onPress={() =>
                    updateDay(selectedDay, (d) => ({
                      ...d,
                      sessions: [...d.sessions, newSession()],
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color={colors.brand} />
                  <Text style={styles.addSessText}>AJOUTER UNE SÉANCE CE JOUR</Text>
                </Pressable>
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
    </SafeAreaView>
  );
}

function SessionEditor({
  session,
  onChange,
  onRemove,
  index,
}: {
  session: ProgramSession;
  onChange: (p: Partial<ProgramSession>) => void;
  onRemove: () => void;
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
        <View key={ei} style={styles.exRow}>
          <Text style={styles.exDot}>•</Text>
          <TextInput
            style={styles.exName}
            value={e.name}
            onChangeText={(t) =>
              onChange({
                exercises: session.exercises.map((x, i) =>
                  i === ei ? { ...x, name: t } : x,
                ),
              })
            }
            placeholder="Nom exercice"
            placeholderTextColor={colors.onSurfaceTertiary}
          />
          <TextInput
            style={styles.exSets}
            value={String(e.sets)}
            onChangeText={(t) =>
              onChange({
                exercises: session.exercises.map((x, i) =>
                  i === ei ? { ...x, sets: parseInt(t || "0", 10) || 0 } : x,
                ),
              })
            }
            keyboardType="number-pad"
          />
          <Text style={styles.xSep}>×</Text>
          <TextInput
            style={styles.exReps}
            value={e.reps}
            onChangeText={(t) =>
              onChange({
                exercises: session.exercises.map((x, i) =>
                  i === ei ? { ...x, reps: t } : x,
                ),
              })
            }
          />
          <Pressable
            hitSlop={8}
            onPress={() =>
              onChange({
                exercises: session.exercises.filter((_, i) => i !== ei),
              })
            }
          >
            <Ionicons name="remove-circle" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>
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
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exDot: { color: colors.brand, fontSize: 12 },
  exName: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 6,
    color: colors.onSurface,
    fontSize: 12,
  },
  exSets: {
    width: 32,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 6,
    color: colors.onSurface,
    textAlign: "center",
    fontSize: 12,
  },
  xSep: { color: colors.onSurfaceTertiary, fontSize: 12 },
  exReps: {
    width: 60,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 6,
    color: colors.onSurface,
    textAlign: "center",
    fontSize: 12,
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
