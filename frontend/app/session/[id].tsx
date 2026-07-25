import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { colors, radius, spacing } from "@/src/theme";
import {
  deleteSession,
  getSession,
  WorkoutSession,
} from "@/src/utils/gym-storage";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      const s = await getSession(id!);
      setSession(s);
    })();
  }, [id]);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
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
          dialogTitle: `IronFlow — ${session.planTitle}`,
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
    lines.push(`🔥 IronFlow — ${session.planTitle}`);
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
        title: `IronFlow — ${session.planTitle}`,
      });
    } catch (e: any) {
      Alert.alert("Partage impossible", e.message ?? "");
    }
  }

  function remove() {
    const doDelete = async () => {
      await deleteSession(session!.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Supprimer cette séance ? Action irréversible.")) doDelete();
      return;
    }
    Alert.alert(
      "Supprimer cette séance ?",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: doDelete },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="back-session"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Résumé</Text>
        <Pressable testID="delete-session" onPress={remove} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Shareable card (wrapped for view-shot capture) */}
        <View collapsable={false} ref={shareCardRef} style={styles.shareable}>
          <LinearGradient
            colors={[colors.brand, "#B02A00"]}
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
              {session.planTitle}
            </Text>
            <Text style={styles.heroDate}>{formatDate(session.startedAt)}</Text>

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
        {session.exercises.map((ex, i) => {
          const done = ex.sets.filter((s) => s.completed).length;
          return (
            <View key={i} style={styles.exCard}>
              <View style={styles.exHead}>
                <View style={styles.exIdxBox}>
                  <Text style={styles.exIdx}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exMode}>
                    {ex.mode.toUpperCase()} · {done}/{ex.sets.length}{" "}
                    {ex.mode === "amrap"
                      ? "AMRAP"
                      : ex.mode === "emom"
                        ? "rounds"
                        : "séries"}
                  </Text>
                </View>
              </View>
              {ex.mode === "reps" && (
                <View style={styles.setList}>
                  {ex.sets.map((s, j) => (
                    <View
                      key={j}
                      style={[styles.setPill, s.completed && styles.setPillDone]}
                    >
                      <Text
                        style={[
                          styles.setPillText,
                          s.completed && { color: "#fff" },
                        ]}
                      >
                        S{j + 1} · {s.reps}
                        {s.weight ? ` × ${s.weight}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {ex.mode === "time" && (
                <Text style={styles.exSummary}>
                  {done} × {formatDur(ex.targetDurationSeconds ?? 0)}
                </Text>
              )}
              {ex.mode === "emom" && (
                <Text style={styles.exSummary}>
                  {done}/{ex.sets.length} rounds ·{" "}
                  {formatDur(ex.targetDurationSeconds ?? 60)} par round
                </Text>
              )}
              {ex.mode === "amrap" && (
                <Text style={styles.exSummary}>
                  {ex.sets[0]?.reps ?? "0"} tours en{" "}
                  {formatDur(ex.targetDurationSeconds ?? 0)}
                </Text>
              )}
            </View>
          );
        })}

        <Pressable
          testID="share-session"
          style={styles.shareBtn}
          onPress={shareImage}
        >
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={styles.shareText}>PARTAGER MA SÉANCE</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Calories estimées (base 70kg). Précision ±20 %.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SubKpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.subKpi}>
      <Text style={styles.subKpiValue}>{value}</Text>
      <Text style={styles.subKpiLabel}>{label}</Text>
    </View>
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

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  subKpiRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  subKpi: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  exHead: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  exIdxBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  exIdx: { color: colors.brandSecondary, fontWeight: "800" },
  exName: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  exMode: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  exSummary: { color: colors.brand, fontWeight: "700", fontSize: 13 },
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
  shareBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shareText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  disclaimer: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});
