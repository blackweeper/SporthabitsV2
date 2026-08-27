import { useCallback, useState } from "react";
import { getAppSettings } from "@/src/utils/app-settings";
import {
  getHealthSyncState,
  mergeHealthMetrics,
  mergeHealthWorkouts,
  saveHealthSyncState,
} from "@/src/utils/health-data-storage";

/**
 * Synchronisation avec le backend d'import santé (Health Auto Export) —
 * calquée sur le patron état de `useLibraryUpdate.ts` (idle/en cours/erreur/
 * terminé), mais bien plus simple : pas de fusion/migration de schéma, juste
 * un fetch paginé + une fusion locale dédupliquée.
 */
export type HealthSyncPhase = "idle" | "syncing" | "error" | "done";

type MetricsApiItem = {
  metric_name: string;
  units: string | null;
  date: string;
  qty: number | null;
  raw?: Record<string, unknown>;
};

type WorkoutsApiItem = {
  name: string;
  start: string;
  end: string | null;
  duration: number | null;
  energy_kcal: number | null;
  raw?: Record<string, unknown>;
};

type PaginatedResponse<T> = { items: T[]; next_cursor: string | null; has_more: boolean };

const PAGE_LIMIT = 1000;
const MAX_PAGES = 500; // garde-fou — ne jamais boucler indéfiniment sur une réponse inattendue

async function fetchAllPages<T>(
  url: string,
  token: string,
  cursor: string | null,
): Promise<{ items: T[]; lastCursor: string | null }> {
  const items: T[] = [];
  let since = cursor;
  let lastCursor = cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (since) qs.set("since", since);
    const res = await fetch(`${url}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(res.status === 401 ? "Token invalide." : `Erreur serveur (${res.status}).`);
    }
    const body: PaginatedResponse<T> = await res.json();
    items.push(...body.items);
    if (body.next_cursor) lastCursor = body.next_cursor;
    if (!body.has_more) break;
    since = body.next_cursor;
  }
  return { items, lastCursor };
}

export function useHealthSync() {
  const [phase, setPhase] = useState<HealthSyncPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ metricsAdded: number; workoutsAdded: number } | null>(null);

  const sync = useCallback(async () => {
    setPhase("syncing");
    setError(null);
    try {
      const settings = await getAppSettings();
      const baseUrl = settings.healthSyncBaseUrl?.trim();
      const token = settings.healthSyncToken?.trim();
      if (!baseUrl || !token) {
        throw new Error("Configure d'abord l'URL du backend et le token.");
      }
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const state = await getHealthSyncState();

      const [metricsPage, workoutsPage] = await Promise.all([
        fetchAllPages<MetricsApiItem>(`${cleanBase}/api/health-import/metrics`, token, state.metricsCursor),
        fetchAllPages<WorkoutsApiItem>(`${cleanBase}/api/health-import/workouts`, token, state.workoutsCursor),
      ]);

      const metricsAdded = await mergeHealthMetrics(
        metricsPage.items.map((m) => ({
          name: m.metric_name,
          units: m.units,
          date: m.date,
          qty: m.qty,
          raw: m.raw,
        })),
      );
      const workoutsAdded = await mergeHealthWorkouts(
        workoutsPage.items.map((w) => ({
          name: w.name,
          start: w.start,
          end: w.end,
          duration: w.duration,
          energyKcal: w.energy_kcal,
          raw: w.raw,
        })),
      );

      await saveHealthSyncState({
        lastSyncedAt: new Date().toISOString(),
        metricsCursor: metricsPage.lastCursor,
        workoutsCursor: workoutsPage.lastCursor,
      });

      setLastResult({ metricsAdded, workoutsAdded });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de synchronisation.");
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  return { phase, error, lastResult, sync, reset };
}
