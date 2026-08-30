import {
  getRawSamplesForMetric,
  parseHealthTimestamp,
  unitsToKgMultiplier,
  BMI_METRIC_NAMES,
  BODY_FAT_METRIC_NAMES,
  WEIGHT_METRIC_NAMES,
} from "@/src/utils/health-data-storage";
import { getMeasurements, saveMeasurement, Measurement } from "@/src/utils/gym-storage";

/** HealthKit encode parfois un pourcentage en fraction (0.20 = 20%) — même
 * normalisation défensive que `useHealthDashboardData.ts`/`health-metric-
 * config.ts` (jamais confirmée sur un vrai payload pour cette métrique
 * précise, posée par prudence). */
function normalizeBodyFatPercentage(value: number): number {
  return value <= 1 ? value * 100 : value;
}

type DayBucket = { isoDate: string; weight_kg?: number; bmi?: number; body_fat_pct?: number };

/**
 * Fait le pont entre les échantillons Health Auto Export déjà stockés
 * (`health-data-storage.ts`) et le système de Mensurations d'IronFlow
 * (`gym-storage.ts`) — sans nouveau système de synchronisation, nouvelle API
 * ni nouveau stockage : lit ce qui est déjà importé, écrit avec la fonction
 * d'upsert déjà existante (`saveMeasurement`).
 *
 * Idempotence : chaque mesure d'origine Santé reçoit un `id` déterministe
 * (`health-{YYYY-MM-DD}`) dérivé de la date RÉELLE du relevé (jamais la date
 * d'import) — `saveMeasurement` upserte déjà par `id`, donc rejouer cette
 * fonction sur les mêmes échantillons met simplement à jour le même
 * enregistrement au lieu d'en créer un second. Les mesures manuelles (id
 * aléatoire, jamais préfixé `health-`) ne sont donc jamais lues, modifiées
 * ni écrasées par cette fonction — les deux sources coexistent dans le même
 * tableau `Measurement[]`, et la valeur "actuelle" de chaque statistique
 * reste déterminée par la date réelle la plus récente (voir `seriesForStat`
 * dans `MeasurementsCard.tsx`), jamais par la source.
 *
 * Renvoie `true` si au moins un enregistrement a été créé/modifié — permet à
 * l'appelant de ne recharger sa liste que si quelque chose a réellement
 * changé.
 */
export async function syncHealthDerivedMeasurements(): Promise<boolean> {
  const [weightSamples, bmiSamples, bodyFatSamples] = await Promise.all([
    getRawSamplesForMetric(WEIGHT_METRIC_NAMES),
    getRawSamplesForMetric(BMI_METRIC_NAMES),
    getRawSamplesForMetric(BODY_FAT_METRIC_NAMES),
  ]);
  if (weightSamples.length === 0 && bmiSamples.length === 0 && bodyFatSamples.length === 0) return false;

  // `getRawSamplesForMetric` renvoie déjà du plus récent au plus ancien —
  // la première occurrence rencontrée pour un (jour, champ) donné est donc
  // déjà la plus récente de cette journée ; les suivantes (échantillons
  // plus anciens du même jour) sont ignorées pour ce champ.
  const byDay = new Map<string, DayBucket>();
  function addSample(
    samples: { date: string; units: string | null; qty: number | null }[],
    field: "weight_kg" | "bmi" | "body_fat_pct",
    convert?: (units: string | null) => number,
  ) {
    for (const s of samples) {
      if (s.qty == null) continue;
      const parsed = parseHealthTimestamp(s.date);
      if (!parsed) continue;
      const isoDate = parsed.toISOString();
      const dayKey = isoDate.slice(0, 10);
      const bucket = byDay.get(dayKey) ?? { isoDate };
      if (bucket[field] === undefined) {
        const raw = convert ? s.qty * convert(s.units) : s.qty;
        bucket[field] = field === "body_fat_pct" ? normalizeBodyFatPercentage(raw) : raw;
      }
      if (isoDate > bucket.isoDate) bucket.isoDate = isoDate;
      byDay.set(dayKey, bucket);
    }
  }
  addSample(weightSamples, "weight_kg", unitsToKgMultiplier);
  addSample(bmiSamples, "bmi");
  addSample(bodyFatSamples, "body_fat_pct");

  const existing = await getMeasurements();
  const existingById = new Map(existing.map((m) => [m.id, m]));
  let changed = false;

  for (const [dayKey, bucket] of byDay.entries()) {
    const id = `health-${dayKey}`;
    const prior = existingById.get(id);
    const weight_kg = bucket.weight_kg ?? prior?.weight_kg ?? null;
    const bmi = bucket.bmi ?? prior?.bmi ?? null;
    const body_fat_pct = bucket.body_fat_pct ?? prior?.body_fat_pct ?? null;
    if (prior && prior.weight_kg === weight_kg && prior.bmi === bmi && prior.body_fat_pct === body_fat_pct) {
      continue; // Rien de nouveau pour ce jour — évite une réécriture inutile.
    }
    const merged: Measurement = {
      id,
      date: bucket.isoDate,
      weight_kg,
      bmi,
      body_fat_pct,
      waist_cm: prior?.waist_cm ?? null,
      thigh_cm: prior?.thigh_cm ?? null,
      chest_cm: prior?.chest_cm ?? null,
      photoBase64: prior?.photoBase64 ?? null,
      notes: prior?.notes ?? null,
      source: "health",
    };
    await saveMeasurement(merged);
    changed = true;
  }

  return changed;
}
