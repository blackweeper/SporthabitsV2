import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { colors, radius, spacing } from "@/src/theme";
import {
  getHabits,
  getHabitLogs,
  getMeasurements,
  getPRs,
  getSessions,
  Habit,
  HabitLog,
  Measurement,
  PersonalRecord,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { computeIronflowScore, IronflowScore } from "@/src/utils/scoring";
import { listAllExercises } from "@/src/utils/exercise-detail";

type Tab = "overview" | "exercises" | "transformation" | "habits" | "journal";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Score", icon: "speedometer" },
  { key: "exercises", label: "Exercices", icon: "barbell" },
  { key: "transformation", label: "Corps", icon: "body" },
  { key: "habits", label: "Habitudes", icon: "checkbox" },
  { key: "journal", label: "Journal", icon: "book" },
];

export default function ProgressionHub() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSessions(await getSessions());
        setPRs(await getPRs());
        setMeasurements(await getMeasurements());
        setHabits(await getHabits());
        setLogs(await getHabitLogs());
      })();
    }, []),
  );

  const score = computeIronflowScore(sessions, habits, logs, prs.length);
  const exercises = listAllExercises(sessions);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Progression</Text>
      </View>

      <View style={styles.segWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segRow}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`prog-seg-${t.key}`}
                style={[styles.segChip, active && styles.segChipActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={active ? "#fff" : colors.onSurfaceTertiary}
                />
                <Text style={[styles.segLabel, active && { color: "#fff" }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "overview" && (
          <OverviewView score={score} onOpenStats={() => router.push("/stats")} />
        )}
        {tab === "exercises" && (
          <ExercisesView exercises={exercises} router={router} />
        )}
        {tab === "transformation" && (
          <TransformationView
            measurements={measurements}
            router={router}
          />
        )}
        {tab === "habits" && (
          <HabitsView
            habits={habits}
            router={router}
          />
        )}
        {tab === "journal" && <JournalView router={router} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={styles.scoreValueBig}>{score}</Text>
        <Text style={styles.scoreOn100}>/100</Text>
      </View>
    </View>
  );
}

function OverviewView({
  score,
  onOpenStats,
}: {
  score: IronflowScore;
  onOpenStats: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.overviewCard}>
        <Text style={styles.overLabel}>SCORE IRONFLOW</Text>
        <ScoreCircle score={score.score} />
        <Text style={styles.overHint}>
          Basé sur régularité, progression, habitudes, diversité, records et activité récente.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Détail du score</Text>
      {score.breakdown.map((b) => (
        <View key={b.label} style={styles.breakdownRow}>
          <Text style={styles.brLabel}>{b.label}</Text>
          <View style={styles.brBar}>
            <View
              style={[
                styles.brFill,
                { width: `${(b.value / b.max) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.brValue}>
            {b.value}/{b.max}
          </Text>
        </View>
      ))}

      <Pressable
        testID="open-full-stats"
        style={styles.linkBtn}
        onPress={onOpenStats}
      >
        <Ionicons name="stats-chart" size={14} color={colors.brand} />
        <Text style={styles.linkBtnText}>
          Voir toutes les statistiques avancées
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.brand} />
      </Pressable>
    </View>
  );
}

function ExercisesView({
  exercises,
  router,
}: {
  exercises: { name: string; count: number }[];
  router: any;
}) {
  if (exercises.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="barbell" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Aucun exercice</Text>
        <Text style={styles.emptySub}>
          Fais une séance pour analyser tes performances par exercice.
        </Text>
      </View>
    );
  }
  return (
    <>
      {exercises.map((e) => (
        <Pressable
          key={e.name}
          testID={`ex-detail-${e.name}`}
          style={styles.exerciseCard}
          onPress={() => router.push(`/exercise/${encodeURIComponent(e.name)}`)}
        >
          <View style={styles.exIconBox}>
            <Ionicons name="barbell" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exName} numberOfLines={1}>
              {e.name}
            </Text>
            <Text style={styles.exMeta}>
              {e.count} séance{e.count > 1 ? "s" : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
        </Pressable>
      ))}
    </>
  );
}

function TransformationView({
  measurements,
  router,
}: {
  measurements: Measurement[];
  router: any;
}) {
  const withPhotos = measurements.filter((m) => m.photoBase64);
  return (
    <>
      <View style={styles.summaryGrid}>
        <SummaryTile
          icon="camera"
          value={String(withPhotos.length)}
          label="Photos"
          onPress={() => withPhotos.length >= 2 && router.push("/compare")}
        />
        <SummaryTile
          icon="resize"
          value={String(measurements.length)}
          label="Mesures"
          onPress={() => router.push("/measurement/new")}
        />
      </View>

      <Pressable
        testID="add-measurement-btn"
        style={styles.ctaFull}
        onPress={() => router.push("/measurement/new")}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>NOUVELLE MESURE</Text>
      </Pressable>

      {withPhotos.length >= 2 && (
        <Pressable
          testID="open-compare"
          style={styles.linkBtn}
          onPress={() => router.push("/compare")}
        >
          <Ionicons name="images" size={14} color={colors.brand} />
          <Text style={styles.linkBtnText}>Comparer avant/après</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>
      )}

      {measurements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Aucune mesure</Text>
          <Text style={styles.emptySub}>
            Ajoute ta première mesure pour suivre ta transformation.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Historique</Text>
          {measurements.slice(0, 20).map((m) => (
            <Pressable
              key={m.id}
              testID={`m-item-${m.id}`}
              style={styles.mCard}
              onPress={() => router.push(`/measurement/${m.id}`)}
            >
              <Text style={styles.mDate}>{formatDate(m.date)}</Text>
              <View style={styles.mMetrics}>
                {m.weight_kg != null && (
                  <MetricChip label={`${m.weight_kg} kg`} />
                )}
                {m.body_fat_pct != null && (
                  <MetricChip label={`${m.body_fat_pct}% MG`} />
                )}
                {m.waist_cm != null && (
                  <MetricChip label={`Taille ${m.waist_cm}`} />
                )}
              </View>
            </Pressable>
          ))}
        </>
      )}
    </>
  );
}

function HabitsView({
  habits,
  router,
}: {
  habits: Habit[];
  router: any;
}) {
  return (
    <>
      <Pressable
        testID="add-habit-btn"
        style={styles.ctaFull}
        onPress={() => router.push("/habit/new")}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>AJOUTER UNE HABITUDE</Text>
      </Pressable>
      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkbox" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Aucune habitude</Text>
          <Text style={styles.emptySub}>
            Ajoute des habitudes (eau, marche, sommeil…) pour renforcer ton score.
          </Text>
        </View>
      ) : (
        habits.map((h) => (
          <Pressable
            key={h.id}
            testID={`habit-${h.id}`}
            style={styles.habitCard}
            onPress={() => router.push(`/habit/${h.id}`)}
          >
            <View style={[styles.habitIcon, { backgroundColor: colors.brandTertiary }]}>
              <Ionicons name="checkbox" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitTitle}>{h.title}</Text>
              <Text style={styles.habitMeta}>
                Cible : {h.target ?? 1} {h.unit ?? ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
          </Pressable>
        ))
      )}
    </>
  );
}

function JournalView({ router }: { router: any }) {
  return (
    <>
      <Pressable
        testID="open-daily-journal"
        style={styles.ctaFull}
        onPress={() => router.push("/daily-journal")}
      >
        <Ionicons name="book" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>NOTE DU JOUR</Text>
      </Pressable>
      <View style={styles.empty}>
        <Ionicons name="calendar" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Journal quotidien</Text>
        <Text style={styles.emptySub}>
          Note ton énergie, ton stress, tes douleurs. Revois ton évolution jour après jour.
        </Text>
      </View>
    </>
  );
}

function SummaryTile({
  icon,
  value,
  label,
  onPress,
}: {
  icon: any;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.sumTile} onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <Text style={styles.sumValue}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </Pressable>
  );
}

function MetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText}>{label}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  segWrap: { maxHeight: 48 },
  segRow: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  segChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  segLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 60 },
  overviewCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.md,
  },
  overLabel: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "800",
  },
  overHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  scoreValueBig: { color: colors.onSurface, fontSize: 42, fontWeight: "800" },
  scoreOn100: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  brLabel: { width: 110, color: colors.onSurfaceSecondary, fontSize: 12 },
  brBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  brFill: { height: "100%", backgroundColor: colors.brand },
  brValue: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
    width: 50,
    textAlign: "right",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginTop: spacing.md,
  },
  linkBtnText: {
    flex: 1,
    color: colors.brand,
    fontWeight: "700",
    fontSize: 13,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  exName: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
    textTransform: "capitalize",
  },
  exMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  summaryGrid: { flexDirection: "row", gap: 8 },
  sumTile: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sumValue: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  sumLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  ctaFull: {
    backgroundColor: colors.brand,
    padding: 14,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaFullText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  mCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  mDate: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mMetrics: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metricChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metricChipText: { color: colors.onSurface, fontSize: 11, fontWeight: "700" },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  habitMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
});
