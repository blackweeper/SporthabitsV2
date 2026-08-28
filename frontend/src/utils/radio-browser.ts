/**
 * Client minimal pour l'API publique radio-browser.info (aucune clé
 * nécessaire, CORS ouvert `Access-Control-Allow-Origin: *`, vérifié). Utilisé
 * uniquement pour rafraîchir le statut "en ligne"/favicon des 7 stations
 * pré-sélectionnées (`radio-stations.ts`) à l'ouverture de l'écran Radio —
 * jamais pour résoudre le flux de lecture lui-même (déjà connu et testé),
 * donc un échec réseau ici n'empêche jamais d'écouter une station.
 */

const API_BASE = "https://de1.api.radio-browser.info";
const REQUEST_TIMEOUT_MS = 6000;

export type StationLiveInfo = {
  favicon: string | null;
  lastCheckOk: boolean;
  clickCount: number;
};

export async function fetchStationsLiveInfo(uuids: string[]): Promise<Record<string, StationLiveInfo>> {
  if (uuids.length === 0) return {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/json/stations/byuuid?uuids=${uuids.join(",")}`, {
      signal: controller.signal,
      headers: { "User-Agent": "IronFlow/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return {};
    const data: Array<Record<string, unknown>> = await res.json();
    const result: Record<string, StationLiveInfo> = {};
    for (const s of data) {
      const uuid = s.stationuuid as string;
      if (!uuid) continue;
      result[uuid] = {
        favicon: (s.favicon as string) || null,
        lastCheckOk: s.lastcheckok === 1,
        clickCount: typeof s.clickcount === "number" ? s.clickcount : 0,
      };
    }
    return result;
  } catch {
    return {};
  }
}

/** Enregistre une écoute côté radio-browser.info — convention de leur API pour
 * leurs statistiques communautaires, purement informatif, jamais bloquant ni
 * requis pour que la lecture fonctionne. */
export function registerStationClick(stationuuid: string): void {
  fetch(`${API_BASE}/json/url/${stationuuid}`).catch(() => {});
}
