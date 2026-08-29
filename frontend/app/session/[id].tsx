import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  deleteSession,
  getPlans,
  getSession,
  Plan,
  SessionExerciseLog,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { getExerciseRecords, ExerciseRecord } from "@/src/utils/exercise-records";
import { resolveSessionWodIdentity, SessionWodIdentity } from "@/src/utils/training-overview";
import { normalizeWodResult } from "@/src/utils/wod-result-normalizer";

export default function SessionDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [wodIdentity, setWodIdentity] = useState<SessionWodIdentity | null>(null);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const shareCardRef = useRef<View>(null);
  const { confirm, ConfirmModal } = useConfirmDialog();

  useEffect(() => {
    (async () => {
      const [s, plans, recs] = await Promise.all([getSession(id!), getPlans(), getExerciseRecords()]);
      setSession(s);
      setRecords(recs);
      if (s) {
        const wodPlansById = new Map<string, Plan>();
        for (const p of plans) if (p.wodSource) wodPlansById.set(p.id, p);
        setWodIdentity(resolveSessionWodIdentity(s, wodPlansById));
      }
    })();
  }, [id]);

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={styles.loading}>Chargement…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const durationText = formatDur(session.durationSeconds);
  const restText = formatDur(session.totalRestSeconds);
  const activeText = formatDur(
    Math.max(0, session.durationSeconds - session.totalRestSeconds),
  );
  const totalSetsDone = session.exercises.reduce(
    (a, ex) => a + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const displayTitle = wodIdentity ? wodIdentity.title : session.planTitle;

  async function shareImage() {
    if (!session || !shareCardRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `IronFlow — ${displayTitle}`,
        });
      } else {
        await shareText();
      }
    } catch (e: any) {
      // Fallback to text share
      await shareText();
    }
  }

  async function shareText() {
    if (!session) return;
    const lines: string[] = [];
    lines.push(`🔥 IronFlow — ${displayTitle}`);
    lines.push("");
    lines.push(`⏱️  Durée : ${formatDur(session.durationSeconds)}`);
    lines.push(`💥  Effort : ${activeText}  ·  Pause : ${restText}`);
    lines.push(`🔥  Calories : ~${session.caloriesBurned} kcal`);
    lines.push(
      `💪  Exercices : ${session.exercises.length}  ·  Séries : ${totalSetsDone}`,
    );
    lines.push("");
    session.exercises.forEach((ex) => {
      const done = ex.sets.filter((s) => s.completed).length;
      if (ex.mode === "reps") {
        lines.push(`• ${ex.name} — ${done}×${ex.targetReps}`);
      } else if (ex.mode === "time") {
        lines.push(
          `• ${ex.name} — ${done}× ${formatDur(ex.targetDurationSeconds ?? 0)}`,
        );
      } else if (ex.mode === "emom") {
        lines.push(
          `• EMOM ${ex.name} — ${done}/${ex.targetSets} rounds`,
        );
      } else {
        const rounds = ex.sets[0]?.reps ?? "0";
        lines.push(
          `• AMRAP ${ex.name} — ${rounds} tours en ${formatDur(ex.targetDurationSeconds ?? 0)}`,
        );
      }
    });
    lines.push("");
    lines.push("#IronFlow");
    try {
      await Share.share({
        message: lines.join("\n"),
        title: `IronFlow — ${displayTitle}`,
      });
    } catch (e: any) {
      Alert.alert("Partage impossible", e.message ?? "");
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Supprimer cette séance ?",
      message: "Cette action est irréversible.",
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    await deleteSession(session!.id);
    router.back();
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
          testID="back-session"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Résumé</Text>
        <Pressable testID="delete-session" onPress={remove} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Shareable card (wrapped for view-shot capture) */}
        <View collapsable={false} ref={shareCardRef} style={styles.shareable}>
          <LinearGradient
            colors={[theme.colors.brand, "#B02A00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.brandRow}>
              <Ionicons name="flame" size={16} color="#fff" />
              <Text style={styles.brandName}>IRONFLOW</Text>
            </View>
            <Text style={styles.heroLabel}>SÉANCE TERMINÉE</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {wodIdentity ? wodIdentity.title : session.planTitle}
            </Text>
            <Text style={styles.heroDate}>{formatDate(session.startedAt)}</Text>
            {wodIdentity && (
              <View style={styles.wodBadge}>
                <Ionicons name="flame" size={12} color="#fff" />
                <Text style={styles.wodBadgeText}>
                  {wodIdentity.format.toUpperCase()}
                  {wodIdentity.roundsCompleted != null ? ` · ${wodIdentity.roundsCompleted} TOURS` : ""}
                </Text>
              </View>
            )}

            <View style={styles.heroKpiRow}>
              <View style={styles.heroKpi}>
                <Text style={styles.heroKpiValue}>{durationText}</Text>
                <Text style={styles.heroKpiLabel}>DURÉE</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroKpi}>
                <Text style={styles.heroKpiValue} testID="kpi-calories">
                  {session.caloriesBurned}
                </Text>
                <Text style={styles.heroKpiLabel}>KCAL ~</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroKpi}>
                <Text style={styles.heroKpiValue}>{totalSetsDone}</Text>
                <Text style={styles.heroKpiLabel}>SÉRIES</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.subKpiRow}>
            <SubKpi label="Effort actif" value={activeText} />
            <SubKpi label="Temps de pause" value={restText} />
          </View>
        </View>

        {/* Exercises */}
        <Text style={styles.sectionTitle}>Exercices</Text>
        {session.exercises.map((ex, i) => (
          <ExerciseLogCard key={i} log={ex} records={records} theme={theme} />
        ))}

        <Pressable
          testID="open-journal"
          style={styles.journalBtn}
          onPress={() => router.push(`/journal/${session.id}`)}
        >
          <Ionicons name="book" size={18} color={theme.colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.journalBtnTitle}>Journal & cardio</Text>
            <Text style={styles.journalBtnSub}>
              {session.journal || session.cardio_activity
                ? "Modifier tes notes / ressenti"
                : "Ajouter ressenti, sommeil, activité cardio…"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.brand} />
        </Pressable>

        <Pressable
          testID="share-session"
          style={styles.shareBtn}
          onPress={shareImage}
        >
          <Ionicons name="share-social" size={20} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
          <Text style={styles.shareText}>PARTAGER MA SÉANCE</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Calories estimées (base 70kg). Précision ±20 %.
        </Text>

        <Pressable
          testID="finish-session"
          style={styles.finishBtn}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand} />
          <Text style={styles.finishBtnText}>TERMINER · RETOUR À L&apos;ACCUEIL</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
      {ConfirmModal}
      </SafeAreaView>
    </View>
  );
}

function SubKpi({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <GlassCard level="subtle" style={styles.subKpi}>
      <Text style={styles.subKpiValue}>{value}</Text>
      <Text style={styles.subKpiLabel}>{label}</Text>
    </GlassCard>
  );
}

/** Une carte par exercice de la séance. Un WOD composite ("5 Tractions →
 * 10 Pompes → 15 Squats") est décomposé en mouvements réels via
 * `normalizeWodResult` (déjà la source de vérité du badge "6 TOURS" du
 * héros) — total par mouvement = reps/tour × tours complétés, jamais
 * fabriqué. Chaque mouvement récupère sa miniature depuis la bibliothèque
 * (même resolver que le reste de l'app), aucun stockage supplémentaire. */
function ExerciseLogCard({
  log,
  records,
  theme,
}: {
  log: SessionExerciseLog;
  records: ExerciseRecord[];
  theme: Theme;
}) {
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const done = log.sets.filter((s) => s.completed).length;
  const normalized = normalizeWodResult(log);

  if (normalized) {
    return (
      <GlassCard level="subtle" style={styles.exCard}>
        <Text style={styles.exName}>{log.name}</Text>
        <Text style={styles.exMode}>
          {log.mode.toUpperCase()} · {normalized.roundsCompleted} tours
        </Text>
        <View style={styles.movementList}>
          {normalized.exercises.map((m) => (
            <View key={m.name} style={styles.movementRow}>
              <ExerciseThumbnail name={m.name} records={records} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.movementName}>{m.name}</Text>
                <Text style={styles.movementSub}>
                  {m.repsPerRound} × {normalized.roundsCompleted} tours
                </Text>
              </View>
              <Text style={styles.movementTotal}>{m.repsPerRound * normalized.roundsCompleted}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard level="subtle" style={styles.exCard}>
      <View style={styles.exHead}>
        <ExerciseThumbnail name={log.name} records={records} exerciseRecordId={log.libraryExerciseId} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{log.name}</Text>
          <Text style={styles.exMode}>
            {log.mode.toUpperCase()} · {done}/{log.sets.length}{" "}
            {log.mode === "amrap" ? "AMRAP" : log.mode === "emom" ? "rounds" : "séries"}
          </Text>
        </View>
      </View>
      {log.mode === "reps" && (
        <View style={styles.setList}>
          {log.sets.map((s, j) => (
            <View key={j} style={[styles.setPill, s.completed && styles.setPillDone]}>
              <Text style={[styles.setPillText, s.completed && { color: "#fff" }]}>
                S{j + 1} · {s.reps}
                {s.weight ? ` × ${s.weight}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
      {log.mode === "time" && (
        <Text style={styles.exSummary}>
          {done} × {formatDur(log.targetDurationSeconds ?? 0)}
        </Text>
      )}
      {log.mode === "emom" && (
        <Text style={styles.exSummary}>
          {done}/{log.sets.length} rounds · {formatDur(log.targetDurationSeconds ?? 60)} par round
        </Text>
      )}
      {log.mode === "amrap" && (
        <Text style={styles.exSummary}>
          {log.sets[0]?.reps ?? "0"} tours en {formatDur(log.targetDurationSeconds ?? 0)}
        </Text>
      )}
    </GlassCard>
  );
}

function formatDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m}min${s}s`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
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
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  shareable: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: 2,
    borderRadius: radius.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  brandName: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 2,
    fontSize: 11,
  },
  heroCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    color: "#fff",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "800",
    opacity: 0.85,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  heroDate: { color: "#fff", opacity: 0.8, fontSize: 12, textTransform: "capitalize" },
  wodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: withAlpha("#FFFFFF", 20),
    marginTop: 4,
  },
  wodBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  heroKpiRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroKpi: { flex: 1, alignItems: "center" },
  heroKpiValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroKpiLabel: {
    color: "#fff",
    opacity: 0.75,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 34,
    backgroundColor: withAlpha("#FFFFFF", 25),
  },
  subKpiRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  subKpi: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  subKpiValue: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  subKpiLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: 4,
  },
  exCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  exHead: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  exName: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  exMode: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  exSummary: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  movementList: { gap: spacing.sm, marginTop: 2 },
  movementRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  movementName: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  movementSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 1 },
  movementTotal: { color: colors.brand, fontWeight: "800", fontSize: 16 },
  setList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  setPill: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setPillDone: { backgroundColor: colors.success, borderColor: colors.success },
  setPillText: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "600" },
  shareBtn: isGlass
    ? {
        backgroundColor: withAlpha(colors.brand, 18),
        borderWidth: 1,
        borderColor: withAlpha(colors.brand, 50),
        paddingVertical: 16,
        borderRadius: radius.md,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
        marginTop: spacing.md,
      }
    : {
        backgroundColor: colors.brand,
        paddingVertical: 16,
        borderRadius: radius.md,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
        marginTop: spacing.md,
      },
  shareText: { color: isGlass ? colors.brand : "#fff", fontWeight: "800", letterSpacing: 1 },
  finishBtn: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 16,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  finishBtnText: {
    color: colors.brand,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  journalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginTop: spacing.md,
  },
  journalBtnTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  journalBtnSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  disclaimer: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  });
}
