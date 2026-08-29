import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonalRecord, WorkoutSession } from '@/src/utils/gym-storage';
import { awardXPOnce, isoWeekMonday } from '@/src/utils/xp';

/**
 * Défi de la semaine — un seul objectif hebdomadaire, choisi et dimensionné
 * à partir des VRAIES données de l'utilisateur (jamais un chiffre arbitraire
 * ou un type de défi que l'app ne peut pas honnêtement mesurer — voir la
 * liste des types plus bas, volontairement limitée à ce qu'IRONFLOW suit
 * déjà nativement : séances, volume soulevé, distance parcourue, records).
 *
 * Stabilité garantie par construction : la définition du défi (type +
 * objectif) est calculée UNE FOIS par semaine ISO et persistée
 * (`WEEKLY_CHALLENGE_KEY`) — un reload, une navigation ou une fermeture de
 * l'app ne la recalculent jamais tant que la semaine ISO n'a pas changé.
 * Seule la PROGRESSION est recalculée en direct à chaque affichage, à partir
 * des séances/records réels de la semaine — jamais stockée elle-même.
 */

const WEEKLY_CHALLENGE_KEY = '@ironflow/weeklyChallenge';

export type WeeklyChallengeType = 'sessions_count' | 'new_pr' | 'volume_kg' | 'distance_km';

export type WeeklyChallengeDef = {
  weekKey: string; // lundi de la semaine ISO concernée (YYYY-MM-DD)
  type: WeeklyChallengeType;
  target: number;
  xp: number;
  title: string;
  unit: string;
};

export const WEEKLY_CHALLENGE_XP = 150;

const CANONICAL_TYPES: WeeklyChallengeType[] = ['sessions_count', 'new_pr', 'volume_kg', 'distance_km'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function niceRound(value: number, step: number, minimum: number): number {
  return Math.max(minimum, Math.round(value / step) * step);
}

function weeklyVolumeKg(sessions: WorkoutSession[]): number {
  let sum = 0;
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat(st.weight?.replace(',', '.') || '0') || 0;
        const r = parseFloat(st.reps?.replace(/[^0-9.]/g, '') || '0') || 0;
        sum += w * r;
      }
    }
  }
  return sum;
}

function weeklyDistanceKm(sessions: WorkoutSession[]): number {
  let m = 0;
  for (const s of sessions) m += s.cardio_metrics?.distance_m ?? 0;
  return m / 1000;
}

/** Moyenne hebdomadaire d'une valeur sur les `weeksBack` dernières semaines
 * COMPLÈTES (la semaine en cours, forcément partielle, est exclue pour ne
 * jamais sous-estimer le rythme habituel de l'utilisateur). */
function recentWeeklyAverage(
  sessions: WorkoutSession[],
  currentWeekKey: string,
  weeksBack: number,
  valueForWeek: (weekSessions: WorkoutSession[]) => number,
): number {
  const byWeek = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const wk = isoWeekMonday(s.startedAt);
    if (wk === currentWeekKey) continue;
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(s);
  }
  const weeks = Array.from(byWeek.keys()).sort().slice(-weeksBack);
  if (weeks.length === 0) return 0;
  const total = weeks.reduce((sum, wk) => sum + valueForWeek(byWeek.get(wk)!), 0);
  return total / weeks.length;
}

function buildChallenge(type: WeeklyChallengeType, weekKey: string, sessions: WorkoutSession[]): WeeklyChallengeDef {
  const avgSessions = recentWeeklyAverage(sessions, weekKey, 4, (ws) => ws.length);
  const avgVolume = recentWeeklyAverage(sessions, weekKey, 4, weeklyVolumeKg);
  const avgDistance = recentWeeklyAverage(sessions, weekKey, 4, weeklyDistanceKm);

  switch (type) {
    case 'sessions_count': {
      const target = avgSessions < 2 ? 2 : avgSessions < 4 ? 3 : avgSessions < 6 ? 5 : 6;
      return { weekKey, type, target, xp: WEEKLY_CHALLENGE_XP, title: `${target} séances cette semaine`, unit: 'séance' };
    }
    case 'new_pr':
      return { weekKey, type, target: 1, xp: WEEKLY_CHALLENGE_XP, title: 'Un nouveau record cette semaine', unit: 'record' };
    case 'volume_kg': {
      const target = avgVolume > 0 ? niceRound(avgVolume * 1.15, 250, 500) : 2000;
      return { weekKey, type, target, xp: WEEKLY_CHALLENGE_XP, title: `${target.toLocaleString('fr-FR')} kg soulevés`, unit: 'kg' };
    }
    case 'distance_km': {
      const target = avgDistance > 0 ? niceRound(avgDistance * 1.15, 1, 5) : 5;
      return { weekKey, type, target, xp: WEEKLY_CHALLENGE_XP, title: `${target} km parcourus`, unit: 'km' };
    }
  }
}

/** Sélection déterministe : même semaine + mêmes données passées → toujours
 * le même type de défi (aucun aléatoire réel, un simple hash de la clé de
 * semaine). Seuls les types que l'utilisateur peut honnêtement honorer sont
 * éligibles (`volume_kg`/`distance_km` exigent un historique réel de
 * musculation/cardio — jamais un défi que l'app ne peut pas mesurer pour ce
 * profil précis). */
function chooseType(weekKey: string, sessions: WorkoutSession[]): WeeklyChallengeType {
  const hasVolumeHistory = sessions.some((s) => weeklyVolumeKg([s]) > 0);
  const hasDistanceHistory = sessions.some((s) => (s.cardio_metrics?.distance_m ?? 0) > 0);
  const eligible = CANONICAL_TYPES.filter((t) => {
    if (t === 'volume_kg') return hasVolumeHistory;
    if (t === 'distance_km') return hasDistanceHistory;
    return true; // sessions_count / new_pr toujours honorables
  });
  const pool = eligible.length > 0 ? eligible : (['sessions_count'] as WeeklyChallengeType[]);
  return pool[hashString(weekKey) % pool.length];
}

async function readStoredChallenge(): Promise<WeeklyChallengeDef | null> {
  const raw = await AsyncStorage.getItem(WEEKLY_CHALLENGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeeklyChallengeDef;
  } catch {
    return null;
  }
}

/** Point d'entrée unique : renvoie le défi de la semaine EN COURS, en le
 * générant et le persistant si la semaine ISO a changé depuis la dernière
 * fois (ou si c'est la toute première fois). Stable pour le reste de la
 * semaine, quel que soit le nombre de reloads/navigations entre-temps. */
export async function getOrCreateWeeklyChallenge(sessions: WorkoutSession[]): Promise<WeeklyChallengeDef> {
  const weekKey = isoWeekMonday(new Date().toISOString());
  const stored = await readStoredChallenge();
  if (stored && stored.weekKey === weekKey) return stored;
  const type = chooseType(weekKey, sessions);
  const def = buildChallenge(type, weekKey, sessions);
  await AsyncStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(def));
  return def;
}

/** Progression EN DIRECT du défi, recalculée à chaque appel à partir des
 * séances/records réels de la semaine concernée — jamais une valeur stockée
 * au moment de la création du défi (voir le principe "définition + état
 * courant de l'app = progression courante" demandé). */
export function computeWeeklyChallengeProgress(
  def: WeeklyChallengeDef,
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
): number {
  const weekSessions = sessions.filter((s) => isoWeekMonday(s.startedAt) === def.weekKey);
  switch (def.type) {
    case 'sessions_count':
      return weekSessions.length;
    case 'new_pr':
      return prs.filter((p) => isoWeekMonday(p.date) === def.weekKey).length;
    case 'volume_kg':
      return Math.round(weeklyVolumeKg(weekSessions));
    case 'distance_km':
      return Math.round(weeklyDistanceKm(weekSessions) * 10) / 10;
  }
}

export function formatWeeklyChallengeValue(type: WeeklyChallengeType, value: number): string {
  switch (type) {
    case 'sessions_count':
    case 'new_pr':
      return String(Math.round(value));
    case 'volume_kg':
      return `${Math.round(value).toLocaleString('fr-FR')} kg`;
    case 'distance_km':
      return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
  }
}

/** Crédite l'XP du défi hebdomadaire — idempotent (id = `challenge:weekly:
 * {weekKey}`, voir `awardXPOnce`) : ne credite jamais deux fois le même
 * défi, quel que soit le nombre de fois où cette fonction est rappelée
 * (reload, navigation répétée, re-synchronisation...). */
export async function awardWeeklyChallengeXPIfComplete(def: WeeklyChallengeDef, progress: number): Promise<boolean> {
  if (progress < def.target) return false;
  const { awarded } = await awardXPOnce({
    id: `challenge:weekly:${def.weekKey}`,
    type: 'challenge',
    amount: def.xp,
    label: 'Défi de la semaine terminé',
    detail: def.title,
    date: new Date().toISOString(),
  });
  return awarded;
}

export function weeklyUnitLabel(type: WeeklyChallengeType, n: number): string {
  switch (type) {
    case 'sessions_count':
      return n > 1 ? 'séances' : 'séance';
    case 'new_pr':
      return n > 1 ? 'records' : 'record';
    case 'volume_kg':
      return 'kg';
    case 'distance_km':
      return 'km';
  }
}

/** Message contextuel — uniquement aux moments qui apportent une vraie
 * information (début, mi-parcours, fin proche), jamais une phrase générée
 * pour occuper l'espace à chaque pourcentage (voir §10 du brief). `null` =
 * ne rien afficher de plus que les chiffres, déjà visibles par ailleurs. */
export function weeklyStageMessage(type: WeeklyChallengeType, progress: number, target: number): string | null {
  const pct = target > 0 ? progress / target : 0;
  if (pct >= 1) return null;
  if (pct < 0.05) return 'Le défi commence.';
  if (pct >= 0.45 && pct < 0.6) return 'Tu es à mi-chemin.';
  if (pct >= 0.75) {
    const remaining = Math.max(0, Math.round((target - progress) * 10) / 10);
    return `Plus que ${formatWeeklyChallengeValue(type, remaining)}.`;
  }
  return null;
}

/** Jours restants avant le renouvellement (dimanche inclus). */
export function daysRemainingInWeek(weekKey: string): number {
  // `weekKey` est une date locale "YYYY-MM-DD" (voir `isoWeekMonday`) —
  // reconstruite ici via les composants `new Date(y, m, d)` plutôt que
  // `new Date("...T00:00:00Z")`, pour ne jamais réintroduire le décalage
  // UTC corrigé dans `xp.ts` (`localDateKey`).
  const [y, m, d] = weekKey.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  const sunday = new Date(y, m - 1, d + 6);
  const today = new Date();
  const todayLocalMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((sunday.getTime() - todayLocalMidnight.getTime()) / 86400000) + 1);
}
