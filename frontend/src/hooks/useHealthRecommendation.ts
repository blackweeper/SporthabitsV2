import { useCallback, useEffect, useState } from "react";
import { todayYYYYMMDD } from "@/src/utils/gym-storage";
import {
  getImportedSleepHoursForDate,
  getLatestMetricSample,
  getRecentMetricAverage,
  HRV_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  subscribeHealthDataChanged,
} from "@/src/utils/health-data-storage";
import {
  computeHealthRecommendation,
  HealthRecommendation,
} from "@/src/utils/health-recommendation";

/**
 * Extrait de `HealthRecommendationCard.tsx` pour être réutilisable ailleurs
 * (hero Sunset du Dashboard) sans dupliquer le chargement/l'abonnement —
 * `HealthRecommendationCard` consomme désormais ce hook, comportement
 * identique à avant. `undefined` = chargement initial, `null` = aucune
 * donnée santé disponible (état vide propre côté appelant).
 */
export function useHealthRecommendation(): HealthRecommendation | null | undefined {
  const [rec, setRec] = useState<HealthRecommendation | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const today = todayYYYYMMDD();
    const [sleepHours, restingHrSample, hrvSample, restingHrAvg, hrvAvg] = await Promise.all([
      getImportedSleepHoursForDate(today),
      getLatestMetricSample(RESTING_HR_METRIC_NAMES),
      getLatestMetricSample(HRV_METRIC_NAMES),
      getRecentMetricAverage(RESTING_HR_METRIC_NAMES, 7, today),
      getRecentMetricAverage(HRV_METRIC_NAMES, 7, today),
    ]);
    setRec(
      computeHealthRecommendation({
        sleepHours: sleepHours > 0 ? sleepHours : null,
        restingHr: restingHrSample?.qty ?? null,
        restingHrAvg7d: restingHrAvg,
        hrv: hrvSample?.qty ?? null,
        hrvAvg7d: hrvAvg,
      }),
    );
  }, []);

  useEffect(() => {
    reload();
    return subscribeHealthDataChanged(reload);
  }, [reload]);

  return rec;
}
