import { useCallback, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import { solidColor } from "@/src/theme";
import MetricGoalCard from "./MetricGoalCard";
import MetricVitalCard from "./MetricVitalCard";
import MetricRingCard from "./MetricRingCard";
import { getProfile, DEFAULT_STEPS_TARGET, DEFAULT_CALORIES_BURN_TARGET_KCAL, DEFAULT_DISTANCE_TARGET_KM } from "@/src/utils/gym-storage";
import { DailyMetricPoint, localDateYYYYMMDD } from "@/src/utils/health-data-storage";
import {
  computeMetricKpis,
  formatHealthMetricValue,
  loadHealthMetricSeries,
  HEALTH_METRIC_LABEL,
  HealthMetricKey,
  MetricKpis,
} from "@/src/utils/health-metric-config";

type Family = "goal" | "vital" | "ring";

/**
 * Corps de la fiche détail — pour toutes les métriques SAUF `sleep` (fiche
 * dédiée, voir `sleep/SleepDetailScreen.tsx`). Chaque métrique reçoit la
 * visualisation adaptée à sa nature (§8/§9 du brief) plutôt qu'un gabarit
 * unique : "goal" (Pas/Distance/Calories actives — objectif+barres),
 * "vital" (VFC/FC repos/Respiration — ligne+stats), "ring" (SpO2 —
 * anneau+stats). Un seul accent de couleur par métrique, toujours un token
 * de thème (jamais une valeur hexadécimale en dur).
 */
export default function MetricDetailScreen({ metricKey }: { metricKey: HealthMetricKey }) {
  const { theme } = useTheme();
  const [kpis, setKpis] = useState<MetricKpis | null>(null);
  const [history, setHistory] = useState<DailyMetricPoint[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const today = localDateYYYYMMDD();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [k, profile] = await Promise.all([computeMetricKpis(metricKey, 7, today), getProfile()]);
        setKpis(k);
        if (metricKey === "steps") setTarget(profile.steps_target || DEFAULT_STEPS_TARGET);
        else if (metricKey === "activeCalories") setTarget(profile.calories_burn_target_kcal || DEFAULT_CALORIES_BURN_TARGET_KCAL);
        else if (metricKey === "walkingDistance") setTarget(profile.distance_target_km || DEFAULT_DISTANCE_TARGET_KM);
        if (FAMILY[metricKey] === "goal") {
          setHistory(await loadHealthMetricSeries(metricKey, 7, today));
        }
      })();
    }, [metricKey, today]),
  );

  if (!kpis) {
    return <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>Chargement…</Text>;
  }
  if (kpis.today == null && kpis.average == null) {
    return (
      <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>
        Aucune donnée disponible pour l&apos;instant.
      </Text>
    );
  }

  const meta = METRIC_META[metricKey];
  const color = resolveColor(theme, metricKey);
  // `formatValue` (avec unité, ex. "400 kcal") sert les légendes courtes
  // (Objectif/Moyenne/Meilleur jour) où l'unité inline se lit naturellement.
  // `formatMainValue` (nombre seul) sert la grande valeur héro, dont
  // l'unité est déjà affichée séparément en plus petit à côté (typographie
  // "gros chiffre / unité" du brief) — évite un doublon du type "5 kcal kcal"
  // pour les métriques dont `formatHealthMetricValue` inclut déjà l'unité.
  const formatValue = (v: number) => formatHealthMetricValue(metricKey, v);
  const formatMainValue = (v: number) => formatValueOnly(metricKey, v);
  const loadSeries = (days: number) => loadHealthMetricSeries(metricKey, days, today);

  if (FAMILY[metricKey] === "goal") {
    return (
      <MetricGoalCard
        icon={meta.icon}
        label={HEALTH_METRIC_LABEL[metricKey]}
        color={solidColor(color)}
        todayValue={kpis.today}
        target={target ?? kpis.best ?? 1}
        unit={meta.unit}
        formatValue={formatValue}
        formatMainValue={formatMainValue}
        average={kpis.average}
        best={kpis.best}
        history={history}
      />
    );
  }

  if (FAMILY[metricKey] === "ring") {
    return (
      <MetricRingCard
        icon={meta.icon}
        label={HEALTH_METRIC_LABEL[metricKey]}
        color={color}
        todayValue={kpis.today}
        average={kpis.average}
        best={kpis.best}
        worst={kpis.worst}
        loadSeries={loadSeries}
      />
    );
  }

  return (
    <MetricVitalCard
      icon={meta.icon}
      label={HEALTH_METRIC_LABEL[metricKey]}
      color={color}
      todayValue={kpis.today}
      average={kpis.average}
      best={kpis.best}
      worst={kpis.worst}
      unit={meta.unit}
      formatValue={formatValue}
      formatMainValue={formatMainValue}
      loadSeries={loadSeries}
      note={meta.note ?? null}
    />
  );
}

/** Nombre seul, sans unité — voir le commentaire sur `formatMainValue`
 * ci-dessus. Dérivé de la même logique que `formatHealthMetricValue`, sans
 * jamais dupliquer sa normalisation (ex. `walkingDistance` en km avec
 * décimales) — juste sans le suffixe d'unité. */
function formatValueOnly(key: HealthMetricKey, v: number): string {
  if (key === "steps") return Math.round(v).toLocaleString("fr-FR");
  if (key === "walkingDistance") return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (key === "sleep") return formatHealthMetricValue(key, v);
  return String(Math.round(v));
}

const FAMILY: Record<HealthMetricKey, Family> = {
  steps: "goal",
  walkingDistance: "goal",
  activeCalories: "goal",
  sleep: "goal", // jamais rendu ici (voir SleepDetailScreen), valeur de repli inoffensive
  hrv: "vital",
  restingHr: "vital",
  respiratoryRate: "vital",
  spo2: "ring",
};

const METRIC_META: Record<HealthMetricKey, { icon: keyof typeof Ionicons.glyphMap; unit: string; note?: string }> = {
  steps: { icon: "footsteps", unit: "pas" },
  walkingDistance: { icon: "navigate", unit: "km" },
  activeCalories: { icon: "flame", unit: "kcal" },
  sleep: { icon: "moon", unit: "" },
  hrv: { icon: "pulse", unit: "ms" },
  restingHr: { icon: "heart", unit: "bpm" },
  respiratoryRate: { icon: "body", unit: "rpm", note: "Plage habituelle chez l'adulte au repos : 12 à 20 rpm." },
  spo2: { icon: "water", unit: "%" },
};

/** Une seule couleur d'accent par métrique — toujours un token `theme.*`,
 * jamais une teinte en dur (voir §2/§9 du brief) : FC en rouge/corail
 * (`error`), VFC/Respiration/SpO2 dans la famille cyan/bleu (`info`,
 * cohérente Classique/Sunset), Distance en bleu (`info`), Calories/Pas dans
 * leurs dégradés déjà établis pour tout le Dashboard. */
function resolveColor(theme: ReturnType<typeof useTheme>["theme"], key: HealthMetricKey): RingColor {
  switch (key) {
    case "steps":
      return theme.colors.metricColors.steps;
    case "walkingDistance":
      return theme.colors.info;
    case "activeCalories":
      return theme.colors.metricColors.caloriesBurn;
    case "hrv":
      return theme.colors.info;
    case "restingHr":
      return theme.colors.error;
    case "respiratoryRate":
      return theme.colors.info;
    case "spo2":
      return theme.colors.info;
    case "sleep":
      return theme.colors.metricColors.sleep;
  }
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 40 },
});
