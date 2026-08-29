import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonalRecord, WorkoutSession } from '@/src/utils/gym-storage';
import { awardXPOnce, isoWeekMonday } from '@/src/utils/xp';
import { localDateYYYYMMDD } from '@/src/utils/health-data-storage';
import { HEALTH_METRIC_REGISTRY, HealthMetricKey } from '@/src/utils/health-metric-registry';

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

/**
 * `health_metric` est un type GÉNÉRIQUE — un seul cas de switch pour toute
 * métrique santé présente dans `HEALTH_METRIC_REGISTRY` (voir
 * `health-metric-registry.ts`), pas un type par métrique. Ajouter un futur
 * défi "5 km parcourus" ou "500 kcal actives" ne demande qu'une nouvelle
 * entrée dans `HEALTH_CHALLENGE_TEMPLATES` ci-dessous, jamais un nouveau cas
 * de switch dans ce fichier ni dans `progression.tsx`.
 */
export type WeeklyChallengeType = 'sessions_count' | 'new_pr' | 'volume_kg' | 'distance_km' | 'health_metric';

export type WeeklyChallengeDef = {
  weekKey: string; // lundi de la semaine ISO concernée (YYYY-MM-DD)
  type: WeeklyChallengeType;
  target: number;
  xp: number;
  title: string;
  unit: string;
  /** Présent uniquement quand `type === 'health_metric'` — quelle métrique du registre ce défi suit. */
  metricKey?: HealthMetricKey;
};

export const WEEKLY_CHALLENGE_XP = 150;

const CANONICAL_TYPES: WeeklyChallengeType[] = ['sessions_count', 'new_pr', 'volume_kg', 'distance_km'];

/**
 * Gabarits des défis basés sur une métrique santé — un objectif FIXE (pas
 * dérivé d'une moyenne, contrairement aux défis séances/volume/distance,
 * faute d'un historique de référence établi pour ces métriques). Un seul
 * défi actif pour l'instant (pas), les autres exemples du brief (distance,
 * course, calories, sommeil) s'ajoutent ici sans toucher au reste du fichier
 * une fois qu'un lecteur fiable existe dans le registre pour chacun.
 */
const HEALTH_CHALLENGE_TEMPLATES: Partial<Record<HealthMetricKey, { title: string; target: number }>> = {
  steps: { title: '10 000 PAS', target: 10000 },
};

/** Identifiant stable du défi hebdomadaire dans le journal XP — un seul
 * défi actif par semaine ISO, quel que soit son type, donc un seul id
 * possible par semaine (voir `awardXPOnce`, idempotent par id). */
export function weeklyChallengeLedgerId(weekKey: string): string {
  return `challenge:weekly:${weekKey}`;
}

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

type ChallengeChoice = { type: WeeklyChallengeType; metricKey?: HealthMetricKey };

function buildChallenge(choice: ChallengeChoice, weekKey: string, sessions: WorkoutSession[]): WeeklyChallengeDef {
  if (choice.type === 'health_metric' && choice.metricKey) {
    const template = HEALTH_CHALLENGE_TEMPLATES[choice.metricKey];
    const metricDef = HEALTH_METRIC_REGISTRY[choice.metricKey];
    if (template && metricDef) {
      return {
        weekKey,
        type: 'health_metric',
        metricKey: choice.metricKey,
        target: template.target,
        xp: WEEKLY_CHALLENGE_XP,
        title: template.title,
        unit: metricDef.unit,
      };
    }
  }

  const avgSessions = recentWeeklyAverage(sessions, weekKey, 4, (ws) => ws.length);
  const avgVolume = recentWeeklyAverage(sessions, weekKey, 4, weeklyVolumeKg);
  const avgDistance = recentWeeklyAverage(sessions, weekKey, 4, weeklyDistanceKm);

  switch (choice.type) {
    case 'new_pr':
      return { weekKey, type: 'new_pr', target: 1, xp: WEEKLY_CHALLENGE_XP, title: 'Un nouveau record cette semaine', unit: 'record' };
    case 'volume_kg': {
      const target = avgVolume > 0 ? niceRound(avgVolume * 1.15, 250, 500) : 2000;
      return { weekKey, type: 'volume_kg', target, xp: WEEKLY_CHALLENGE_XP, title: `${target.toLocaleString('fr-FR')} kg soulevés`, unit: 'kg' };
    }
    case 'distance_km': {
      const target = avgDistance > 0 ? niceRound(avgDistance * 1.15, 1, 5) : 5;
      return { weekKey, type: 'distance_km', target, xp: WEEKLY_CHALLENGE_XP, title: `${target} km parcourus`, unit: 'km' };
    }
    case 'sessions_count':
    default: {
      const target = avgSessions < 2 ? 2 : avgSessions < 4 ? 3 : avgSessions < 6 ? 5 : 6;
      return { weekKey, type: 'sessions_count', target, xp: WEEKLY_CHALLENGE_XP, title: `${target} séances cette semaine`, unit: 'séance' };
    }
  }
}

/** Sélection déterministe : même semaine + mêmes données passées → toujours
 * le même type de défi (aucun aléatoire réel, un simple hash de la clé de
 * semaine). Seuls les types que l'utilisateur peut honnêtement honorer sont
 * éligibles (`volume_kg`/`distance_km` exigent un historique réel de
 * musculation/cardio, un défi `health_metric` exige qu'au moins un
 * échantillon de cette métrique ait déjà été importé — jamais un défi que
 * l'app ne peut pas honnêtement mesurer pour ce profil précis). */
function chooseType(weekKey: string, sessions: WorkoutSession[], healthEligibleKeys: HealthMetricKey[]): ChallengeChoice {
  const hasVolumeHistory = sessions.some((s) => weeklyVolumeKg([s]) > 0);
  const hasDistanceHistory = sessions.some((s) => (s.cardio_metrics?.distance_m ?? 0) > 0);
  const pool: ChallengeChoice[] = CANONICAL_TYPES.filter((t) => {
    if (t === 'volume_kg') return hasVolumeHistory;
    if (t === 'distance_km') return hasDistanceHistory;
    return true; // sessions_count / new_pr toujours honorables
  }).map((t) => ({ type: t }));
  for (const metricKey of healthEligibleKeys) {
    if (HEALTH_CHALLENGE_TEMPLATES[metricKey]) pool.push({ type: 'health_metric', metricKey });
  }
  const finalPool = pool.length > 0 ? pool : [{ type: 'sessions_count' as const }];
  return finalPool[hashString(weekKey) % finalPool.length];
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

  const healthEligibleKeys: HealthMetricKey[] = [];
  for (const key of Object.keys(HEALTH_CHALLENGE_TEMPLATES) as HealthMetricKey[]) {
    const metricDef = HEALTH_METRIC_REGISTRY[key];
    if (metricDef && (await metricDef.hasAnyData())) healthEligibleKeys.push(key);
  }

  const choice = chooseType(weekKey, sessions, healthEligibleKeys);
  const def = buildChallenge(choice, weekKey, sessions);
  await AsyncStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(def));
  return def;
}

/** Progression EN DIRECT du défi, recalculée à chaque appel à partir des
 * séances/records/données santé réelles — jamais une valeur stockée au
 * moment de la création du défi (voir le principe "définition + état
 * courant de l'app = progression courante" demandé). Un défi `health_metric`
 * suit TOUJOURS la valeur du jour LOCAL en cours (même fonction que le
 * Dashboard, voir `health-metric-registry.ts`) — pas un cumul hebdomadaire :
 * c'est ce qui permet à "aujourd'hui" de coïncider exactement entre le
 * Dashboard et le Défi (voir §13 du brief). */
export async function computeWeeklyChallengeProgress(
  def: WeeklyChallengeDef,
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
): Promise<number> {
  if (def.type === 'health_metric' && def.metricKey) {
    const metricDef = HEALTH_METRIC_REGISTRY[def.metricKey];
    if (!metricDef) return 0;
    return metricDef.getValueForDate(localDateYYYYMMDD());
  }
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
    default:
      return 0;
  }
}

/** Valeur réelle formatée — jamais plafonnée au `target` (voir §9 du brief :
 * un dépassement doit rester lisible, ex. "12 000 pas", pas être tronqué à
 * "10 000"). C'est la barre de progression (toujours `Math.min(1, ...)`,
 * calculée par l'appelant) qui reste visuellement bornée à 100 %, pas cette
 * valeur. */
export function formatWeeklyChallengeValue(def: WeeklyChallengeDef, value: number): string {
  if (def.type === 'health_metric' && def.metricKey) {
    const metricDef = HEALTH_METRIC_REGISTRY[def.metricKey];
    return metricDef ? metricDef.formatValue(value) : String(Math.round(value));
  }
  switch (def.type) {
    case 'sessions_count':
    case 'new_pr':
      return String(Math.round(value));
    case 'volume_kg':
      return `${Math.round(value).toLocaleString('fr-FR')} kg`;
    case 'distance_km':
      return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
    default:
      return String(Math.round(value));
  }
}

/** Crédite l'XP du défi hebdomadaire — idempotent (id =
 * `weeklyChallengeLedgerId(weekKey)`, voir `awardXPOnce`) : ne credite
 * jamais deux fois le même défi, quel que soit le nombre de fois où cette
 * fonction est rappelée (reload, navigation répétée, re-synchronisation
 * Health Auto Export plusieurs fois par jour...). Un seul id possible par
 * semaine ISO, quel que soit le type de défi actif cette semaine-là. */
export async function awardWeeklyChallengeXPIfComplete(def: WeeklyChallengeDef, progress: number): Promise<boolean> {
  if (progress < def.target) return false;
  const { awarded } = await awardXPOnce({
    id: weeklyChallengeLedgerId(def.weekKey),
    type: 'challenge',
    amount: def.xp,
    label: 'Défi de la semaine terminé',
    detail: def.title,
    date: new Date().toISOString(),
  });
  return awarded;
}

export function weeklyUnitLabel(def: WeeklyChallengeDef, n: number): string {
  switch (def.type) {
    case 'sessions_count':
      return n > 1 ? 'séances' : 'séance';
    case 'new_pr':
      return n > 1 ? 'records' : 'record';
    case 'volume_kg':
      return 'kg';
    case 'distance_km':
      return 'km';
    default:
      return def.unit;
  }
}

/** Message contextuel — uniquement aux moments qui apportent une vraie
 * information (début, mi-parcours, fin proche), jamais une phrase générée
 * pour occuper l'espace à chaque pourcentage (voir §10 du brief). `null` =
 * ne rien afficher de plus que les chiffres, déjà visibles par ailleurs. */
export function weeklyStageMessage(def: WeeklyChallengeDef, progress: number): string | null {
  const pct = def.target > 0 ? progress / def.target : 0;
  if (pct >= 1) return null;
  if (pct < 0.05) return 'Le défi commence.';
  if (pct >= 0.45 && pct < 0.6) return 'Tu es à mi-chemin.';
  if (pct >= 0.75) {
    const remaining = Math.max(0, Math.round((def.target - progress) * 10) / 10);
    return `Plus que ${formatWeeklyChallengeValue(def, remaining)}.`;
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
