import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import SwipeableRow from "@/src/components/SwipeableRow";
import { deleteMeasurement, Measurement, UserProfile } from "@/src/utils/gym-storage";

type StatKey =
  | "weight_kg"
  | "body_fat_pct"
  | "imc"
  | "waist_cm"
  | "chest_cm"
  | "hips_cm"
  | "arm_cm"
  | "thigh_cm"
  | "neck_cm"
  | "forearm_cm"
  | "calf_cm";

// Toutes les icônes reprennent le pictogramme "tour de mensuration"
// générique (`resize`) sauf le Poids, qui garde sa propre icône balance —
// demande explicite (le Poids est la seule vraie donnée de bascule, les 10
// autres sont toutes des tours de mesure au ruban, d'où l'icône partagée).
const MEASURE_ICON = "resize" as const;

const STAT_META: Record<StatKey, { label: string; unit: string; icon: keyof typeof Ionicons.glyphMap }> = {
  weight_kg: { label: "Poids", unit: "kg", icon: "scale" },
  body_fat_pct: { label: "Masse grasse", unit: "%", icon: MEASURE_ICON },
  imc: { label: "IMC", unit: "", icon: MEASURE_ICON },
  waist_cm: { label: "Tour de taille", unit: "cm", icon: MEASURE_ICON },
  chest_cm: { label: "Poitrine", unit: "cm", icon: MEASURE_ICON },
  hips_cm: { label: "Hanches", unit: "cm", icon: MEASURE_ICON },
  arm_cm: { label: "Bras", unit: "cm", icon: MEASURE_ICON },
  thigh_cm: { label: "Cuisses", unit: "cm", icon: MEASURE_ICON },
  neck_cm: { label: "Cou", unit: "cm", icon: MEASURE_ICON },
  forearm_cm: { label: "Avant-bras", unit: "cm", icon: MEASURE_ICON },
  calf_cm: { label: "Mollets", unit: "cm", icon: MEASURE_ICON },
};

/** Sens de la "bonne" variation par métrique — voir l'en-tête du composant
 * pour le raisonnement complet. Taille/hanches/masse grasse : toujours une
 * baisse positive. Poids/IMC/reste des circonférences : dépend de
 * `UserProfile.primaryGoal` (déjà utilisé ailleurs pour recommander des
 * programmes) — neutre si l'objectif n'est pas renseigné ou ambigu
 * (force/forme générale/mobilité), jamais une supposition arbitraire. */
type TrendDirection = "downGood" | "upGood" | "neutral";
const ALWAYS_DOWN_GOOD: StatKey[] = ["body_fat_pct", "waist_cm", "hips_cm"];

function directionForStat(key: StatKey, primaryGoal: UserProfile["primaryGoal"]): TrendDirection {
  if (ALWAYS_DOWN_GOOD.includes(key)) return "downGood";
  if (primaryGoal === "prise_de_masse") return "upGood";
  if (primaryGoal === "perte_de_poids") return "downGood";
  return "neutral";
}

// Poids/Poitrine/Taille/Hanches/Masse grasse toujours visibles (les 5
// mises en avant demandées) ; le reste se replie derrière le chevron — n'y
// apparaît de toute façon que si l'utilisateur a réellement suivi ce tour
// de mensuration, jamais une ligne vide.
const ALWAYS_VISIBLE_STATS: StatKey[] = ["weight_kg", "chest_cm", "waist_cm", "hips_cm", "body_fat_pct"];
const COLLAPSIBLE_STATS: StatKey[] = ["imc", "arm_cm", "thigh_cm", "neck_cm", "forearm_cm", "calf_cm"];

type Point = { date: string; value: number };

function statValue(m: Measurement, key: StatKey, heightM: number | null): number | null {
  if (key === "imc") return m.weight_kg != null && heightM ? m.weight_kg / (heightM * heightM) : null;
  // Le formulaire de saisie (`app/measurement/[id].tsx`, `CORE_FIELDS`) n'a
  // qu'un seul champ "Tour de taille", écrit dans `waist_navel_cm` (mesure
  // au nombril, utilisée aussi pour l'estimation de masse grasse) — il n'y
  // a pas de champ dédié pour `waist_cm` brut. Lire `waist_navel_cm` en
  // priorité est donc la correction du vrai bug (la mesure ajoutée par
  // l'utilisateur n'apparaissait jamais), `waist_cm` reste un repli pour
  // d'éventuelles anciennes données saisies autrement.
  if (key === "waist_cm") {
    const v = m.waist_navel_cm ?? m.waist_cm;
    return typeof v === "number" ? v : null;
  }
  const raw = (m as unknown as Record<string, unknown>)[key];
  return typeof raw === "number" ? raw : null;
}

function seriesForStat(measurements: Measurement[], key: StatKey, heightM: number | null): Point[] {
  return measurements
    .map((m) => {
      const v = statValue(m, key, heightM);
      return v != null ? { date: m.date, value: v } : null;
    })
    .filter((p): p is Point => p != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function formatStatValue(key: StatKey, value: number): string {
  const unit = STAT_META[key].unit;
  const rounded = key === "imc" ? value.toFixed(1) : key === "body_fat_pct" ? value.toFixed(1) : `${value}`;
  return unit ? `${rounded} ${unit}` : rounded;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

type MeasurementPeriod = "30d" | "3m" | "6m" | "1y" | "all";
const PERIOD_DAYS: Record<Exclude<MeasurementPeriod, "all">, number> = { "30d": 30, "3m": 90, "6m": 180, "1y": 365 };
const PERIOD_LABEL: Record<MeasurementPeriod, string> = { "30d": "30 j", "3m": "3 mois", "6m": "6 mois", "1y": "1 an", all: "Tout" };
const PERIODS: MeasurementPeriod[] = ["30d", "3m", "6m", "1y", "all"];

function AnimatedChevron({ open, color }: { open: boolean; color: string }) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: motion.fast });
  }, [open, rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="chevron-down" size={14} color={color} />
    </Animated.View>
  );
}

/** En-tête de section repliable générique (Historique) — même langage
 * visuel que les lignes de statistique (icône teintée, libellé, chevron
 * animé), sans valeur/tendance puisque ce n'est pas une métrique. */
function DisclosureRow({
  icon,
  label,
  open,
  onToggle,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  open: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onToggle} style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(theme.colors.brand, 12) }]}>
        <Ionicons name={icon} size={13} color={theme.colors.brand} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.colors.onSurface, flex: 1 }]}>{label}</Text>
      <AnimatedChevron open={open} color={theme.colors.onSurfaceTertiary} />
    </Pressable>
  );
}

/** Ligne d'action qui navigue immédiatement (pas d'expansion) — chevron
 * fixe pointant vers la droite plutôt que l'icône animée haut/bas de
 * `DisclosureRow`/`StatRow`, pour distinguer visuellement "ceci ouvre un
 * écran" de "ceci déplie du contenu ici". */
function ActionRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(theme.colors.brand, 12) }]}>
        <Ionicons name={icon} size={13} color={theme.colors.brand} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.colors.onSurface, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.onSurfaceTertiary} />
    </Pressable>
  );
}

function StatRow({
  statKey,
  series,
  direction,
  open,
  onToggle,
}: {
  statKey: StatKey;
  series: Point[];
  direction: TrendDirection;
  open: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const meta = STAT_META[statKey];
  const current = series[series.length - 1] ?? null;
  const previous = series.length >= 2 ? series[series.length - 2] : null;
  const delta = current && previous ? current.value - previous.value : null;
  const isGood =
    delta == null || Math.abs(delta) <= 0.05 || direction === "neutral" ? null : direction === "downGood" ? delta < 0 : delta > 0;
  const trendColor = isGood == null ? theme.colors.onSurfaceSecondary : isGood ? theme.colors.success : theme.colors.error;
  const [period, setPeriod] = useState<MeasurementPeriod>("6m");

  const now = Date.now();
  const cutoff = period === "all" ? 0 : now - PERIOD_DAYS[period] * 86400000;
  const points = series.filter((p) => new Date(p.date).getTime() >= cutoff);
  const chartData = points.map((p) => ({ value: Math.round(p.value * 100) / 100, label: formatDateShort(p.date) }));
  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 78;

  return (
    <View>
      <Pressable testID={`measurement-stat-${statKey}`} onPress={onToggle} style={styles.row}>
        <View style={[styles.iconBadge, { backgroundColor: withAlpha(theme.colors.brand, 12) }]}>
          <Ionicons name={meta.icon} size={13} color={theme.colors.brand} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{meta.label}</Text>
          <Text style={[styles.rowSub, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
            {previous ? `précédent · ${formatStatValue(statKey, previous.value)}` : "premier relevé"}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowValue, { color: theme.colors.onSurface }]}>
            {current ? formatStatValue(statKey, current.value) : "—"}
          </Text>
          {delta != null && Math.abs(delta) > 0.05 && (
            <View style={[styles.trendPill, isGood != null && { backgroundColor: withAlpha(trendColor, 14) }]}>
              <Ionicons name={delta > 0 ? "arrow-up" : "arrow-down"} size={9} color={trendColor} />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {Math.abs(delta).toFixed(1)} {meta.unit}
              </Text>
            </View>
          )}
        </View>
        <View style={{ marginLeft: 8 }}>
          <AnimatedChevron open={open} color={theme.colors.onSurfaceTertiary} />
        </View>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} style={styles.chartWrap}>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const active = p === period;
              return (
                <Pressable key={p} onPress={() => setPeriod(p)} style={styles.periodChip}>
                  <Text style={[styles.periodChipText, { color: active ? theme.colors.brand : theme.colors.onSurfaceTertiary }]}>
                    {PERIOD_LABEL[p]}
                  </Text>
                  {active && <View style={[styles.periodUnderline, { backgroundColor: theme.colors.brand }]} />}
                </Pressable>
              );
            })}
          </View>
          {chartData.length >= 2 ? (
            <LineChart
              data={chartData}
              color={theme.colors.brand}
              thickness={2}
              areaChart
              startFillColor={theme.colors.brand}
              startOpacity={0.2}
              endFillColor={theme.colors.brand}
              endOpacity={0.01}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 8 }}
              hideRules
              width={chartW}
              isAnimated
              animationDuration={500}
              curved
              dataPointsColor={theme.colors.brand}
              dataPointsRadius={2.5}
              initialSpacing={6}
            />
          ) : (
            <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]}>Pas encore assez de relevés sur cette période.</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

/**
 * "MESURATIONS" — même langage visuel que "Récupération" : une seule grande
 * surface `elevated`, un eyebrow en tête de carte, une liste de lignes (pas
 * de mosaïque de petites cartes) avec icône teintée/valeur/tendance, et le
 * graphique qui apparaît directement sous la ligne tapée.
 *
 * Affichage compact : seuls Poids/Poitrine/Taille/Hanches/Masse grasse sont
 * visibles en permanence. Un seul chevron (même mécanisme exact que le
 * chevron replié du calendrier Dashboard, `WeekCalendarView` — icône nue
 * chevron-down/chevron-up centrée, sans libellé) déplie TOUT le reste :
 * les mesures secondaires (IMC/Bras/Cuisses/Cou/Avant-bras/Mollets) puis
 * les 3 actions — Comparaison photo (navigue directement vers `/compare`),
 * Historique (déplie la liste sur place, pas de destination dédiée),
 * Ajouter une mesure (navigue vers `/measurement/new`). Rien de tout cela
 * n'est affiché en permanence — cohérent avec "peu de surfaces, beaucoup
 * d'espace" déjà appliqué au reste de l'écran.
 *
 * Tendance colorée (vert = va dans le bon sens, rouge = mauvais sens) via
 * `directionForStat` : Masse grasse/Tour de taille/Hanches sont toujours
 * "baisse = bon" (universellement vrai). Poids/IMC/autres circonférences
 * dépendent de `UserProfile.primaryGoal` (prise_de_masse → hausse bonne,
 * perte_de_poids → baisse bonne) et restent neutres (gris, sans jugement)
 * si l'objectif n'est pas renseigné ou ambigu (force/forme générale/
 * mobilité) — jamais une supposition arbitraire sur ce que l'utilisateur
 * recherche.
 *
 * Réutilise telles quelles les fonctions de stockage existantes
 * (`deleteMeasurement`) et les écrans existants (`/measurement/new`,
 * `/measurement/[id]`, `/compare`) — aucune logique de données réécrite,
 * seulement une présentation entièrement neuve.
 */
export default function MeasurementsCard({
  measurements,
  profile,
  router,
  onChanged,
}: {
  measurements: Measurement[];
  profile: UserProfile | null;
  router: any;
  onChanged: () => void;
}) {
  const { theme } = useTheme();
  const [openStat, setOpenStat] = useState<StatKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const heightM = profile?.height_cm ? profile.height_cm / 100 : null;
  // `measurements` arrive triés du plus récent au plus ancien (voir
  // `getMeasurements`) — les séries de graphique veulent l'ordre inverse,
  // géré dans `seriesForStat`.
  const chronological = measurements;

  const visibleRows = ALWAYS_VISIBLE_STATS.map((key) => ({ key, series: seriesForStat(chronological, key, heightM) })).filter(
    (r) => r.series.length > 0,
  );
  const collapsibleRows = COLLAPSIBLE_STATS.map((key) => ({ key, series: seriesForStat(chronological, key, heightM) })).filter(
    (r) => r.series.length > 0,
  );

  const historyList = measurements.slice(0, 20);

  return (
    <GlassCard
      level="elevated"
      style={[
        styles.card,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: theme.card.mode === "flat" ? theme.colors.surfaceSecondary : undefined,
          borderColor: theme.colors.border,
          borderWidth: theme.card.mode === "flat" ? StyleSheet.hairlineWidth : undefined,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.onSurface }]}>MESURATIONS</Text>

      {measurements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={30} color={theme.colors.onSurfaceTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucune mesure enregistrée</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Ajoute un premier relevé pour suivre ton poids, ta masse grasse et ton évolution dans le temps.
          </Text>
          <Pressable testID="add-measurement-btn-empty" style={styles.addPill} onPress={() => router.push("/measurement/new")}>
            <Ionicons name="add" size={15} color={theme.colors.brand} />
            <Text style={[styles.addPillText, { color: theme.colors.brand }]}>Ajouter une mesure</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.lastUpdated, { color: theme.colors.onSurfaceTertiary }]}>
            Dernière mesure · {formatDate(measurements[0].date)}
          </Text>

          <View>
            {visibleRows.map((row, i) => (
              <View key={row.key} style={i > 0 ? { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth } : undefined}>
                <StatRow
                  statKey={row.key}
                  series={row.series}
                  direction={directionForStat(row.key, profile?.primaryGoal)}
                  open={openStat === row.key}
                  onToggle={() => setOpenStat(openStat === row.key ? null : row.key)}
                />
              </View>
            ))}
          </View>

          {/* Même mécanisme exact que le chevron replié du calendrier
              Dashboard (`WeekCalendarView`) : un simple chevron centré, sans
              libellé ni icône de badge. Déplié, il donne accès à la fois aux
              mesures secondaires ET aux 3 actions (comparaison photo/
              historique/ajouter une mesure) — un seul menu déroulant pour
              "tout ce qui n'est pas dans les 5 données mises en avant". */}
          <PressableScale testID="measurements-toggle-more" style={styles.chevronRow} onPress={() => setMoreOpen((v) => !v)} hitSlop={8}>
            <Ionicons name={moreOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.onSurfaceTertiary} />
          </PressableScale>

          {moreOpen && (
            <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
              {collapsibleRows.map((row) => (
                <View key={row.key} style={{ borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }}>
                  <StatRow
                    statKey={row.key}
                    series={row.series}
                    direction={directionForStat(row.key, profile?.primaryGoal)}
                    open={openStat === row.key}
                    onToggle={() => setOpenStat(openStat === row.key ? null : row.key)}
                  />
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

              <ActionRow testID="measurement-compare" icon="images-outline" label="Comparaison photo" onPress={() => router.push("/compare")} />

              <View style={{ borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }}>
                <DisclosureRow
                  testID="measurement-history-toggle"
                  icon="time-outline"
                  label={`Historique (${measurements.length})`}
                  open={historyOpen}
                  onToggle={() => setHistoryOpen((v) => !v)}
                />
                {historyOpen && (
                  <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} style={styles.disclosureContent}>
                    {historyList.map((m) => (
                      <SwipeableRow
                        key={m.id}
                        testID={`measurement-history-${m.id}`}
                        onDelete={async () => {
                          await deleteMeasurement(m.id);
                          onChanged();
                        }}
                        deleteConfirm={{
                          title: "Supprimer cette mesure ?",
                          message: `Mesure du ${formatDate(m.date)} — cette action est définitive.`,
                          confirmLabel: "SUPPRIMER",
                          destructive: true,
                        }}
                        onEdit={() => router.push(`/measurement/${m.id}`)}
                      >
                        <Pressable testID={`measurement-history-row-${m.id}`} style={styles.historyRow} onPress={() => router.push(`/measurement/${m.id}`)}>
                          <Text style={[styles.historyDate, { color: theme.colors.onSurfaceSecondary }]}>{formatDate(m.date)}</Text>
                          <Text style={[styles.historyChips, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                            {[m.weight_kg != null ? `${m.weight_kg} kg` : null, m.body_fat_pct != null ? `${m.body_fat_pct}% MG` : null]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </Text>
                        </Pressable>
                      </SwipeableRow>
                    ))}
                  </Animated.View>
                )}
              </View>

              <View style={{ borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }}>
                <ActionRow testID="add-measurement-btn" icon="add-circle-outline" label="Ajouter une mesure" onPress={() => router.push("/measurement/new")} />
              </View>
            </Animated.View>
          )}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Titre de section — plus prononcé (taille/graisse/contraste) qu'un
  // simple libellé discret, pour s'identifier en un coup d'œil (même
  // traitement repris dans `HealthScoreCard`/`TodayActivityCard`/
  // `HealthMetricGrid`).
  eyebrow: { fontSize: 14, fontWeight: "800", letterSpacing: 1, marginBottom: 16 },
  card: { padding: 18 },
  lastUpdated: { fontSize: 11, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 11 },
  // Même style exact que `WeekCalendarView.chevronRow` (chevron replié du
  // calendrier Dashboard) — juste un padding vertical un peu plus généreux
  // ici pour une cible de tap confortable entre deux lignes de données.
  chevronRow: { alignItems: "center", paddingVertical: 10 },
  iconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 13.5, fontWeight: "700" },
  rowSub: { fontSize: 10.5, letterSpacing: 0.2 },
  rowRight: { alignItems: "flex-end", gap: 3 },
  rowValue: { fontSize: 15, fontWeight: "800" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  trendText: { fontSize: 10, fontWeight: "700" },
  chartWrap: { paddingBottom: 16, paddingTop: 2, gap: 12 },
  periodRow: { flexDirection: "row", gap: 16 },
  periodChip: { alignItems: "center", gap: 5, paddingBottom: 4 },
  periodChipText: { fontSize: 11, fontWeight: "700" },
  periodUnderline: { height: 2, width: 14, borderRadius: 1 },
  hint: { fontSize: 11, fontStyle: "italic", paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  disclosureContent: { paddingLeft: 37, paddingTop: 2, paddingBottom: 12 },
  historyRow: { paddingVertical: 9, gap: 2 },
  historyDate: { fontSize: 12.5, fontWeight: "700" },
  historyChips: { fontSize: 11 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyTitle: { fontSize: 14.5, fontWeight: "800", marginTop: 4 },
  emptySub: { fontSize: 12, textAlign: "center", lineHeight: 17, maxWidth: 260 },
  addPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 16 },
  addPillText: { fontSize: 13, fontWeight: "700" },
});
