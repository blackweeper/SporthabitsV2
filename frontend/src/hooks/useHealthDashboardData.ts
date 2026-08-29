import { useCallback, useEffect, useState } from "react";
import {
  getHealthSyncState,
  getImportedActiveCaloriesForDate,
  getImportedDistanceKmForDate,
  getImportedStepsForDate,
  getLatestMetricSample,
  getLatestSleepHours,
  getRecentDailyAverage,
  getRecentMetricAverage,
  localDateYYYYMMDD,
  sleepHoursFromRaw,
  subscribeHealthDataChanged,
  HRV_METRIC_NAMES,
  RESPIRATORY_RATE_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  SLEEP_METRIC_NAMES,
  SPO2_METRIC_NAMES,
} from "@/src/utils/health-data-storage";
import { computeRecoveryScore, RecoveryScoreResult } from "@/src/utils/health-recovery-score";

export type HealthDashboardData = {
  loading: boolean;
  recovery: RecoveryScoreResult | null;
  sleepHours: number | null;
  sleepAvg7d: number | null;
  hrv: number | null;
  hrvAvg7d: number | null;
  restingHr: number | null;
  restingHrAvg7d: number | null;
  respiratoryRate: number | null;
  respiratoryRateAvg7d: number | null;
  spo2: number | null;
  spo2Avg7d: number | null;
  steps: number;
  distanceKm: number;
  activeCalories: number;
  lastSyncedAt: string | null;
};

const EMPTY: HealthDashboardData = {
  loading: true,
  recovery: null,
  sleepHours: null,
  sleepAvg7d: null,
  hrv: null,
  hrvAvg7d: null,
  restingHr: null,
  restingHrAvg7d: null,
  respiratoryRate: null,
  respiratoryRateAvg7d: null,
  spo2: null,
  spo2Avg7d: null,
  steps: 0,
  distanceKm: 0,
  activeCalories: 0,
  lastSyncedAt: null,
};

/** SpO2 est parfois envoyé en fraction (0.97) au lieu de pourcentage (97)
 * selon la version de Health Auto Export — normalise vers un pourcentage
 * pour l'affichage et le calcul du score. */
function normalizeSpo2(value: number | null): number | null {
  if (value == null) return null;
  return value <= 1 ? value * 100 : value;
}

/** Charge toutes les données Santé (Health Auto Export) nécessaires à
 * l'écran Santé — score de récupération + les 5 indicateurs + activité du
 * jour — recalculées à chaque synchronisation (`subscribeHealthDataChanged`). */
export function useHealthDashboardData() {
  const [data, setData] = useState<HealthDashboardData>(EMPTY);

  const reload = useCallback(async () => {
    const today = localDateYYYYMMDD();
    // Le sommeil "du jour" désigne la nuit précédente, souvent encore datée
    // d'hier côté Health Auto Export (voir `getLatestSleepHours`) — résolu
    // à part pour que la moyenne 7 jours exclue la bonne date de référence
    // (celle de la nuit affichée, pas nécessairement "aujourd'hui").
    const latestSleep = await getLatestSleepHours();
    const [
      sleepAvg7d,
      hrvSample,
      hrvAvg7d,
      restingHrSample,
      restingHrAvg7d,
      respSample,
      respAvg7d,
      spo2Sample,
      spo2Avg7d,
      steps,
      distanceKm,
      activeCalories,
      syncState,
    ] = await Promise.all([
      latestSleep
        ? getRecentDailyAverage(SLEEP_METRIC_NAMES, 7, latestSleep.dateYYYYMMDD, "sum", undefined, (m) => sleepHoursFromRaw(m.raw))
        : Promise.resolve(null),
      getLatestMetricSample(HRV_METRIC_NAMES),
      getRecentMetricAverage(HRV_METRIC_NAMES, 7, today),
      getLatestMetricSample(RESTING_HR_METRIC_NAMES),
      getRecentMetricAverage(RESTING_HR_METRIC_NAMES, 7, today),
      getLatestMetricSample(RESPIRATORY_RATE_METRIC_NAMES),
      getRecentMetricAverage(RESPIRATORY_RATE_METRIC_NAMES, 7, today),
      getLatestMetricSample(SPO2_METRIC_NAMES),
      getRecentMetricAverage(SPO2_METRIC_NAMES, 7, today),
      getImportedStepsForDate(today),
      getImportedDistanceKmForDate(today),
      getImportedActiveCaloriesForDate(today),
      getHealthSyncState(),
    ]);

    const sleepHours = latestSleep?.hours ?? null;
    const hrv = hrvSample?.qty ?? null;
    const restingHr = restingHrSample?.qty ?? null;
    const respiratoryRate = respSample?.qty ?? null;
    const spo2 = normalizeSpo2(spo2Sample?.qty ?? null);
    const spo2Avg = normalizeSpo2(spo2Avg7d);

    const recovery = computeRecoveryScore({
      sleep: { value: sleepHours, baseline: sleepAvg7d, higherIsBetter: true },
      hrv: { value: hrv, baseline: hrvAvg7d, higherIsBetter: true },
      restingHr: { value: restingHr, baseline: restingHrAvg7d, higherIsBetter: false },
      respiratoryRate: { value: respiratoryRate, baseline: respAvg7d, higherIsBetter: false },
      spo2: { value: spo2, baseline: spo2Avg, higherIsBetter: true },
    });

    setData({
      loading: false,
      recovery,
      sleepHours,
      sleepAvg7d,
      hrv,
      hrvAvg7d,
      restingHr,
      restingHrAvg7d,
      respiratoryRate,
      respiratoryRateAvg7d: respAvg7d,
      spo2,
      spo2Avg7d: spo2Avg,
      steps,
      distanceKm,
      activeCalories,
      lastSyncedAt: syncState.lastSyncedAt,
    });
  }, []);

  useEffect(() => {
    reload();
    return subscribeHealthDataChanged(reload);
  }, [reload]);

  return { ...data, reload };
}
