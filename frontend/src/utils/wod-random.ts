import { Plan } from "@/src/utils/gym-storage";

/**
 * Choisit un WOD au hasard parmi `plans` (déjà filtrés aux WODs sauvegardés,
 * `p.wodSource` truthy — voir `getPlans()` filtré par appelant) — extrait de
 * `launchRandom` (`WodLibraryView`, `app/(tabs)/training.tsx`) pour que le
 * widget "WOD aléatoire" du Dashboard et l'onglet Entraînements partagent une
 * seule implémentation.
 */
export function pickRandomWod(plans: Plan[], desiredIntensity: number | null = null): Plan | null {
  const pool = desiredIntensity == null ? plans : plans.filter((p) => p.wodSource?.intensity === desiredIntensity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
