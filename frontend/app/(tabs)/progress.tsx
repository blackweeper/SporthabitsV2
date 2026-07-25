import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import {
  deletePR,
  estimateOneRepMax,
  getMeasurements,
  getPRs,
  Measurement,
  PersonalRecord,
} from "@/src/utils/gym-storage";

type SubTab = "measurements" | "records";

type MetricKey = 'weight_kg' | 'waist_cm' | 'thigh_cm' | 'chest_cm';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'weight_kg', label: 'Poids', unit: 'kg' },
  { key: 'waist_cm', label: 'Taille', unit: 'cm' },
  { key: 'chest_cm', label: 'Poitrine', unit: 'cm' },
  { key: 'thigh_cm', label: 'Cuisse', unit: 'cm' },
];

export default function ProgressScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SubTab>("measurements");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [selectedPR, setSelectedPR] = useState<PersonalRecord | null>(null);
  const [metric, setMetric] = useState<MetricKey>('weight_kg');

  const load = useCallback(async () => {
    setMeasurements(await getMeasurements());
    setPrs(await getPRs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const chartData = useMemo(() => {
    const sorted = [...measurements]
      .filter((m) => m[metric] != null)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    return sorted.map((m) => ({
      value: m[metric] as number,
      label: shortDate(m.date),
    }));
  }, [measurements, metric]);

  const currentMetric = METRICS.find((m) => m.key === metric)!;
  const withPhotos = useMemo(
    () => measurements.filter((m) => !!m.photoBase64),
    [measurements],
  );

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 32;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Progrès</Text>
      </View>

      <View style={styles.segment}>
        <Pressable
          testID="tab-measurements"
          style={[styles.segBtn, tab === "measurements" && styles.segBtnActive]}
          onPress={() => setTab("measurements")}
        >
          <Text
            style={[
              styles.segText,
              tab === "measurements" && styles.segTextActive,
            ]}
          >
            MESURES
          </Text>
        </Pressable>
        <Pressable
          testID="tab-records"
          style={[styles.segBtn, tab === "records" && styles.segBtnActive]}
          onPress={() => setTab("records")}
        >
          <Text
            style={[
              styles.segText,
              tab === "records" && styles.segTextActive,
            ]}
          >
            RECORDS
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === "measurements" ? (
          <>
            {/* Metric selector chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricChipsRow}
            >
              {METRICS.map((m) => {
                const active = metric === m.key;
                return (
                  <Pressable
                    key={m.key}
                    testID={`metric-${m.key}`}
                    style={[
                      styles.metricChip,
                      active && styles.metricChipActive,
                    ]}
                    onPress={() => setMetric(m.key)}
                  >
                    <Text
                      style={[
                        styles.metricChipText,
                        active && { color: "#fff" },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {chartData.length >= 2 ? (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>
                    {currentMetric.label} ({currentMetric.unit})
                  </Text>
                  <View style={styles.chartDelta}>
                    <Ionicons
                      name={
                        chartData[chartData.length - 1].value >=
                        chartData[0].value
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={14}
                      color={colors.brand}
                    />
                    <Text style={styles.chartDeltaText}>
                      {(
                        chartData[chartData.length - 1].value -
                        chartData[0].value
                      ).toFixed(1)}{" "}
                      {currentMetric.unit}
                    </Text>
                  </View>
                </View>
                <LineChart
                  data={chartData}
                  color={colors.brand}
                  thickness={3}
                  hideDataPoints={false}
                  dataPointsColor={colors.brand}
                  dataPointsRadius={4}
                  areaChart
                  startFillColor={colors.brand}
                  startOpacity={0.5}
                  endFillColor={colors.brand}
                  endOpacity={0.05}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  yAxisTextStyle={{
                    color: colors.onSurfaceTertiary,
                    fontSize: 10,
                  }}
                  xAxisLabelTextStyle={{
                    color: colors.onSurfaceTertiary,
                    fontSize: 9,
                  }}
                  hideRules
                  width={chartW}
                  isAnimated
                  curved
                />
              </View>
            ) : (
              <View style={styles.chartHint}>
                <Ionicons
                  name="information-circle"
                  size={14}
                  color={colors.brand}
                />
                <Text style={styles.chartHintText}>
                  Ajoute au moins 2 mesures pour voir le graphique de progression.
                </Text>
              </View>
            )}

            {/* Photo comparator button */}
            {withPhotos.length >= 2 && (
              <Pressable
                testID="open-compare"
                style={styles.compareBtn}
                onPress={() => router.push("/compare")}
              >
                <Ionicons name="git-compare" size={18} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.compareTitle}>
                    Comparer avant / après
                  </Text>
                  <Text style={styles.compareSub}>
                    {withPhotos.length} photos disponibles
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.onSurfaceTertiary}
                />
              </Pressable>
            )}

            {measurements.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="analytics"
                  size={40}
                  color={colors.onSurfaceTertiary}
                />
                <Text style={styles.emptyText}>
                  Aucune mesure encore.{"\n"}Ajoute ta première mesure pour suivre ton évolution.
                </Text>
              </View>
            ) : (
              measurements.map((m) => (
                <Pressable
                  key={m.id}
                  testID={`measurement-${m.id}`}
                  style={styles.mCard}
                  onPress={() => router.push(`/measurement/${m.id}`)}
                >
                  <View style={styles.mLeft}>
                    <Text style={styles.mDate}>{formatDate(m.date)}</Text>
                    <View style={styles.mMetricsRow}>
                      {m.weight_kg != null && (
                        <MetricPill icon="body" value={`${m.weight_kg} kg`} />
                      )}
                      {m.waist_cm != null && (
                        <MetricPill icon="resize" value={`Taille ${m.waist_cm}`} />
                      )}
                      {m.chest_cm != null && (
                        <MetricPill icon="man" value={`Poitrine ${m.chest_cm}`} />
                      )}
                      {m.thigh_cm != null && (
                        <MetricPill icon="footsteps" value={`Cuisse ${m.thigh_cm}`} />
                      )}
                    </View>
                  </View>
                  {m.photoBase64 && (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${m.photoBase64}` }}
                      style={styles.mPhoto}
                    />
                  )}
                </Pressable>
              ))
            )}

            <Pressable
              testID="add-measurement"
              style={styles.fab}
              onPress={() => router.push("/measurement/new")}
            >
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.fabText}>NOUVELLE MESURE</Text>
            </Pressable>
          </>
        ) : (
          <>
            {prs.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="trophy"
                  size={40}
                  color={colors.onSurfaceTertiary}
                />
                <Text style={styles.emptyText}>
                  Aucun record encore.{"\n"}Enregistre tes maxs pour calculer tes pourcentages.
                </Text>
              </View>
            ) : (
              prs.map((pr) => {
                const oneRM = estimateOneRepMax(pr.weight_kg, pr.reps);
                return (
                  <Pressable
                    key={pr.id}
                    testID={`pr-${pr.id}`}
                    style={styles.prCard}
                    onPress={() => setSelectedPR(pr)}
                  >
                    <View style={styles.prTop}>
                      <Ionicons name="trophy" size={18} color={colors.brand} />
                      <Text style={styles.prName}>{pr.exerciseName}</Text>
                    </View>
                    <View style={styles.prStatsRow}>
                      <View style={styles.prStat}>
                        <Text style={styles.prStatVal}>{pr.weight_kg}</Text>
                        <Text style={styles.prStatLabel}>KG</Text>
                      </View>
                      <View style={styles.prStatSep} />
                      <View style={styles.prStat}>
                        <Text style={styles.prStatVal}>×{pr.reps}</Text>
                        <Text style={styles.prStatLabel}>REPS</Text>
                      </View>
                      <View style={styles.prStatSep} />
                      <View style={styles.prStat}>
                        <Text
                          style={[styles.prStatVal, { color: colors.brand }]}
                        >
                          {oneRM.toFixed(1)}
                        </Text>
                        <Text style={styles.prStatLabel}>1RM est.</Text>
                      </View>
                    </View>
                    <Text style={styles.prCalcHint}>
                      Tape pour calculer les % →
                    </Text>
                  </Pressable>
                );
              })
            )}
            <Pressable
              testID="add-pr"
              style={styles.fab}
              onPress={() => router.push("/pr/new")}
            >
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.fabText}>AJOUTER UN RECORD</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: spacing.xl2 }} />
      </ScrollView>

      {/* PR % calculator sheet */}
      <PRCalculator
        pr={selectedPR}
        onClose={() => setSelectedPR(null)}
        onDelete={async () => {
          if (selectedPR) {
            await deletePR(selectedPR.id);
            setSelectedPR(null);
            load();
          }
        }}
      />
    </SafeAreaView>
  );
}

function PRCalculator({
  pr,
  onClose,
  onDelete,
}: {
  pr: PersonalRecord | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [percent, setPercent] = useState("70");
  const oneRM = pr ? estimateOneRepMax(pr.weight_kg, pr.reps) : 0;
  const pctNum = Math.max(0, Math.min(120, parseFloat(percent) || 0));
  const targetWeight = (oneRM * pctNum) / 100;

  if (!pr) return null;
  return (
    <Modal transparent animationType="slide" visible={!!pr} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{pr.exerciseName}</Text>
          <Text style={styles.sheetSub}>
            Max : {pr.weight_kg} kg × {pr.reps} reps · 1RM estimé{" "}
            <Text style={{ color: colors.brand, fontWeight: "800" }}>
              {oneRM.toFixed(1)} kg
            </Text>
          </Text>

          <Text style={styles.calcLabel}>POURCENTAGE DE MON 1RM</Text>
          <View style={styles.percentInputRow}>
            <TextInput
              testID="pr-percent-input"
              style={styles.percentInput}
              value={percent}
              keyboardType="number-pad"
              onChangeText={(t) => setPercent(t.replace(/[^0-9]/g, ""))}
            />
            <Text style={styles.percentSuffix}>%</Text>
          </View>

          <View style={styles.chipsPresetRow}>
            {[50, 60, 70, 80, 90, 100].map((p) => (
              <Pressable
                key={p}
                testID={`preset-${p}`}
                style={[
                  styles.presetChip,
                  pctNum === p && styles.presetChipActive,
                ]}
                onPress={() => setPercent(String(p))}
              >
                <Text
                  style={[
                    styles.presetText,
                    pctNum === p && { color: "#fff" },
                  ]}
                >
                  {p}%
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>POIDS À CHARGER</Text>
            <Text style={styles.resultBig}>
              {targetWeight.toFixed(1)} kg
            </Text>
            <Text style={styles.resultSub}>
              {pctNum}% de {oneRM.toFixed(1)} kg
            </Text>
          </View>

          <Pressable
            testID="delete-pr"
            style={styles.deletePR}
            onPress={onDelete}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
            <Text style={styles.deletePRText}>Supprimer ce record</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function MetricPill({ icon, value }: { icon: any; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={11} color={colors.brand} />
      <Text style={styles.metricPillText}>{value}</Text>
    </View>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
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
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  segment: {
    flexDirection: "row",
    margin: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  segBtnActive: { backgroundColor: colors.brand },
  segText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  segTextActive: { color: "#fff" },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  chartDelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  chartDeltaText: {
    color: colors.brandSecondary,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  chartHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  chartHintText: {
    color: colors.brandSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  metricChipsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  metricChip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  metricChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  metricChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareTitle: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 14,
  },
  compareSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  chartTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  mCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "center",
  },
  mLeft: { flex: 1, gap: spacing.sm },
  mDate: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "capitalize",
  },
  mMetricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  metricPillText: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  mPhoto: {
    width: 60,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  fab: {
    marginTop: spacing.lg,
    flexDirection: "row",
    backgroundColor: colors.brand,
    padding: spacing.md,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  fabText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 1,
  },
  prCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  prTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  prName: { color: colors.onSurface, fontWeight: "700", fontSize: 16 },
  prStatsRow: { flexDirection: "row", alignItems: "center" },
  prStat: { flex: 1, alignItems: "center" },
  prStatSep: { width: 1, height: 28, backgroundColor: colors.border },
  prStatVal: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  prStatLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  prCalcHint: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "right",
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
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  sheetSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  calcLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  percentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  percentInput: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 24,
    color: colors.onSurface,
    fontWeight: "800",
    textAlign: "center",
  },
  percentSuffix: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "800",
  },
  chipsPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.md,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  presetText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  resultCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
  },
  resultLabel: {
    color: "#fff",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.85,
  },
  resultBig: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "800",
    marginTop: 8,
  },
  resultSub: { color: "#fff", opacity: 0.85, marginTop: 4, fontSize: 12 },
  deletePR: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  deletePRText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: 13,
  },
});
