import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonalRecord, WorkoutSession } from '@/src/utils/gym-storage';
import { Achievement } from '@/src/utils/achievements';

/**
 * Système de progression IRONFLOW — refonte complète (l'ancien système,
 * dérivé en direct de `sessions.length`/`prs.length` sans aucune trace
 * persistée, ne permettait ni un vrai anti-abus ni un journal "pourquoi mon
 * niveau a augmenté ?"). Principes :
 *
 * - L'XP est un JOURNAL D'ÉVÉNEMENTS persistant (`XPLedgerEntry[]`), pas un
 *   nombre recalculé en direct : chaque entrée a un id STABLE dérivé de la
 *   donnée source (`session:{id}`, `pr:{id}`, `regularity:{lundi}:3`,
 *   `achievement:{id}`) qui garantit qu'un même événement n'est jamais
 *   crédité deux fois, même après modification/edit de la donnée d'origine
 *   (l'id ne change pas), même après un reload complet de l'app.
 * - Le total d'XP est TOUJOURS la somme du journal — jamais un compteur
 *   séparé à garder synchronisé. Déterministe par construction : mêmes
 *   événements déjà crédités + mêmes données sources → même résultat.
 * - `syncXPLedger()` est la seule fonction qui écrit : elle compare les
 *   données réelles (séances, PR, succès déjà débloqués) aux ids déjà
 *   présents dans le journal, et n'ajoute que ce qui manque. C'est aussi ce
 *   qui gère la RÉTROACTIVITÉ : un utilisateur avec 100 séances existantes
 *   reçoit tout son historique d'un coup au premier appel, sans donnée
 *   inventée (chaque entrée correspond à un événement réel déjà présent).
 */

// ---------- Stockage ----------

const XP_LEDGER_KEY = '@ironflow/xpLedger';
const XP_LAST_SEEN_LEVEL_KEY = '@ironflow/xpLastSeenLevel';

export type XPEventType = 'session' | 'pr' | 'regularity' | 'achievement' | 'challenge';

export type XPLedgerEntry = {
  /** Identifiant stable et déterministe — la clé de toute la logique
   * anti-abus. Deux appels de `syncXPLedger` sur les mêmes données produisent
   * toujours les mêmes ids, donc jamais de double-crédit. */
  id: string;
  type: XPEventType;
  amount: number;
  /** Libellé court affiché dans "Progression récente" (ex. "Séance
   * terminée", "Nouveau record"). */
  label: string;
  /** Détail optionnel (nom d'exercice, titre de séance…). */
  detail?: string | null;
  /** Date ISO de l'événement — sert à trier le journal et à calculer le
   * résumé de la semaine. */
  date: string;
};

export async function getXPLedger(): Promise<XPLedgerEntry[]> {
  const raw = await AsyncStorage.getItem(XP_LEDGER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendXPLedgerEntries(entries: XPLedgerEntry[]): Promise<XPLedgerEntry[]> {
  if (entries.length === 0) return getXPLedger();
  const existing = await getXPLedger();
  const merged = [...existing, ...entries];
  await AsyncStorage.setItem(XP_LEDGER_KEY, JSON.stringify(merged));
  return merged;
}

/** Primitive générique d'ajout idempotent — utilisée par les systèmes qui
 * créditent de l'XP en dehors de `syncXPLedger` (ex. `weekly-challenge.ts` :
 * un défi hebdomadaire complété). Vérifie elle-même que l'id n'est pas déjà
 * présent, donc jamais de double-crédit même si l'appelant oublie de
 * vérifier — un défi terminé ne peut créditer son XP qu'une seule fois,
 * quel que soit le nombre de fois où la fonction est rappelée. */
export async function awardXPOnce(entry: XPLedgerEntry): Promise<{ awarded: boolean; ledger: XPLedgerEntry[] }> {
  const existing = await getXPLedger();
  if (existing.some((e) => e.id === entry.id)) return { awarded: false, ledger: existing };
  const merged = [...existing, entry];
  await AsyncStorage.setItem(XP_LEDGER_KEY, JSON.stringify(merged));
  return { awarded: true, ledger: merged };
}

// ---------- Barème XP (uniquement des actions à vraie valeur sportive) ----------

/** Séance terminée — montant FIXE, jamais lié à la durée (une séance de
 * 20 min et une séance de 90 min rapportent la même chose : impossible de
 * "farmer" en gonflant artificiellement la durée). */
export const XP_PER_SESSION = 100;
/** Record personnel enregistré. */
export const XP_PER_PR = 100;
/** Record personnel qui est, au moment du calcul, la MEILLEURE performance
 * connue pour cet exercice (comparé aux autres PR du même exercice/type) —
 * un vrai nouveau sommet, pas juste "une performance de plus". */
export const XP_PER_PR_BEST = 150;
/** Régularité hebdomadaire — bonus, jamais de malus si la semaine est ratée. */
export const XP_REGULARITY_3 = 60;
export const XP_REGULARITY_5 = 90;
/** Séries de semaines consécutives à ≥3 séances — paliers, pas un
 * multiplicateur continu (évite qu'un très long historique ne génère un
 * nombre d'entrées disproportionné). */
export const XP_STREAK_WEEK_BONUS: Record<number, number> = { 4: 150, 8: 300, 12: 500, 26: 1000, 52: 2000 };
/** Défi (Performance → Défis) débloqué. */
export const XP_PER_ACHIEVEMENT = 80;

function estimatedOneRM(pr: PersonalRecord): number {
  const w = pr.weight_kg ?? 0;
  const r = pr.reps ?? 1;
  if (r <= 1) return w;
  return w * (1 + r / 30);
}

/** Score comparable utilisé UNIQUEMENT pour détecter si un PR est le
 * meilleur connu pour son exercice/type — même principe que `prScalar` dans
 * `progression.tsx` (1RM estimé / reps max / vitesse), dupliqué ici en
 * miniature pour ne pas faire dépendre ce module de données d'un écran. */
function prXPScore(pr: PersonalRecord): number {
  const type = pr.type ?? 'weight';
  if (type === 'weight') return estimatedOneRM(pr);
  if (type === 'reps') return pr.reps ?? 0;
  if (type === 'run') {
    const d = pr.distance_m ?? 0;
    const t = pr.time_seconds ?? 0;
    return t > 0 ? d / t : 0;
  }
  return 0;
}

/** Date locale "YYYY-MM-DD" à partir des composants du `Date` (jamais via
 * `.toISOString()` — cette conversion force un passage en UTC qui décale la
 * date d'un jour pour tout fuseau positif (ex. Europe en été) dès que
 * l'heure locale est proche de minuit : un lundi 00h30 en France devient un
 * dimanche 22h30 UTC, et "le lundi de la semaine" se retrouve daté d'un
 * dimanche. Même piège que `localDateYYYYMMDD` dans `health-data-storage.ts`,
 * corrigé ici de la même façon). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKey(iso: string): string {
  return localDateKey(new Date(iso));
}

/** Lundi (YYYY-MM-DD, heure locale) de la semaine contenant `iso` — clé de
 * semaine partagée avec `weekly-challenge.ts` (même notion de "semaine"
 * partout : régularité, défi hebdomadaire, résumé "Cette semaine"). */
export function isoWeekMonday(iso: string): string {
  const d = new Date(iso);
  const mondayOffset = (d.getDay() + 6) % 7; // getDay(): 0=dimanche..6=samedi → 0=lundi..6=dimanche
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset);
  return localDateKey(monday);
}

function mondayKey(iso: string): string {
  return isoWeekMonday(iso);
}

/** Regroupe les séances par semaine ISO (clé = lundi de la semaine) →
 * ensemble des jours distincts ayant au moins une séance cette semaine-là. */
function groupSessionsByWeek(sessions: WorkoutSession[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const s of sessions) {
    const monday = mondayKey(s.startedAt);
    const day = dayKey(s.startedAt);
    if (!map.has(monday)) map.set(monday, new Set());
    map.get(monday)!.add(day);
  }
  return map;
}

/** Longueur de la série de semaines CONSÉCUTIVES qualifiées (≥ `minDays`
 * jours actifs), pour chaque semaine qualifiée — permet de détecter le
 * moment exact où un palier (4, 8, 12… semaines de suite) est atteint. */
function consecutiveQualifyingWeeks(
  weeks: Map<string, Set<string>>,
  minDays: number,
): { monday: string; streakLength: number }[] {
  const entries = Array.from(weeks.entries())
    .map(([monday, days]) => ({ monday, count: days.size }))
    .sort((a, b) => (a.monday < b.monday ? -1 : 1));
  const results: { monday: string; streakLength: number }[] = [];
  let streak = 0;
  let prevMonday: string | null = null;
  for (const e of entries) {
    const qualifies = e.count >= minDays;
    if (!qualifies) {
      streak = 0;
      prevMonday = e.monday;
      continue;
    }
    const isConsecutive =
      prevMonday != null &&
      new Date(e.monday).getTime() - new Date(prevMonday).getTime() === 7 * 86400000;
    streak = isConsecutive ? streak + 1 : 1;
    results.push({ monday: e.monday, streakLength: streak });
    prevMonday = e.monday;
  }
  return results;
}

/**
 * Calcule les événements XP qui manquent encore au journal et les y ajoute
 * — seule fonction qui écrit. Idempotent par construction (voir les ids ci-
 * dessus) : rappelable à volonté (à chaque ouverture de l'écran Niveau) sans
 * jamais créditer deux fois le même événement.
 */
export async function syncXPLedger(input: {
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  achievements: Achievement[];
}): Promise<XPLedgerEntry[]> {
  const existing = await getXPLedger();
  const known = new Set(existing.map((e) => e.id));
  const newEntries: XPLedgerEntry[] = [];

  // 1) Séances — montant fixe, id = session.id (immunisé contre l'édition
  // d'une séance existante ; seule une VRAIE nouvelle séance a un nouvel id).
  for (const s of input.sessions) {
    const id = `session:${s.id}`;
    if (known.has(id)) continue;
    newEntries.push({
      id,
      type: 'session',
      amount: XP_PER_SESSION,
      label: 'Séance terminée',
      detail: s.planTitle || null,
      date: s.startedAt,
    });
  }

  // 2) Records — id = pr.id (immunisé contre l'édition d'un PR existant :
  // modifier un record ne recrédite jamais). Le meilleur PR connu par
  // exercice/type reçoit le bonus "nouveau record" ; les autres restent
  // valorisés mais moins (limite le farming "je rentre 10 variantes du même
  // exercice pour multiplier les bonus max").
  const byExerciseType = new Map<string, PersonalRecord[]>();
  for (const pr of input.prs) {
    const key = `${pr.exerciseName.toLowerCase().trim()}:${pr.type ?? 'weight'}`;
    if (!byExerciseType.has(key)) byExerciseType.set(key, []);
    byExerciseType.get(key)!.push(pr);
  }
  for (const group of byExerciseType.values()) {
    const scored = group.map((pr) => ({ pr, score: prXPScore(pr) }));
    const best = Math.max(...scored.map((s) => s.score));
    for (const { pr, score } of scored) {
      const id = `pr:${pr.id}`;
      if (known.has(id)) continue;
      const isBest = best > 0 && score >= best - 1e-9;
      newEntries.push({
        id,
        type: 'pr',
        amount: isBest ? XP_PER_PR_BEST : XP_PER_PR,
        label: isBest ? 'Nouveau record' : 'Record enregistré',
        detail: pr.exerciseName,
        date: pr.date,
      });
    }
  }

  // 3) Régularité hebdomadaire — bonus uniquement, jamais de retrait pour
  // une semaine ratée. Paliers 3 et 5 séances/semaine + séries de semaines
  // consécutives qualifiées (4/8/12/26/52).
  const weeks = groupSessionsByWeek(input.sessions);
  for (const [monday, days] of weeks) {
    const count = days.size;
    if (count >= 3) {
      const id = `regularity:${monday}:3`;
      if (!known.has(id)) {
        newEntries.push({
          id,
          type: 'regularity',
          amount: XP_REGULARITY_3,
          label: 'Semaine régulière',
          detail: '3 séances',
          date: monday,
        });
      }
    }
    if (count >= 5) {
      const id = `regularity:${monday}:5`;
      if (!known.has(id)) {
        newEntries.push({
          id,
          type: 'regularity',
          amount: XP_REGULARITY_5,
          label: 'Semaine très régulière',
          detail: '5 séances',
          date: monday,
        });
      }
    }
  }
  const streaks = consecutiveQualifyingWeeks(weeks, 3);
  for (const milestone of Object.keys(XP_STREAK_WEEK_BONUS).map(Number)) {
    const hit = streaks.find((w) => w.streakLength === milestone);
    if (!hit) continue;
    const id = `regularity:streak:${milestone}`;
    if (known.has(id)) continue;
    newEntries.push({
      id,
      type: 'regularity',
      amount: XP_STREAK_WEEK_BONUS[milestone],
      label: `${milestone} semaines régulières de suite`,
      date: hit.monday,
    });
  }

  // 4) Défis (Performance → Défis) — même liste que `computeAchievements()`,
  // aucun système parallèle. Crédité une seule fois par défi, à la date de
  // sa première détection (aucune date de déblocage réelle n'est stockée
  // par le système de défis existant — on ne l'invente pas).
  for (const a of input.achievements) {
    if (!a.unlocked) continue;
    const id = `achievement:${a.id}`;
    if (known.has(id)) continue;
    newEntries.push({
      id,
      type: 'achievement',
      amount: XP_PER_ACHIEVEMENT,
      label: 'Défi terminé',
      detail: a.title,
      date: new Date().toISOString(),
    });
  }

  return appendXPLedgerEntries(newEntries);
}

// ---------- Niveaux ----------

/** 100 niveaux — de quoi tenir plusieurs années sans plafond ridicule (voir
 * `xpForLevel`). */
export const MAX_LEVEL = 100;

/**
 * XP cumulé nécessaire pour ATTEINDRE un niveau donné : `55 * niveau²`.
 * Écart entre deux niveaux consécutifs ≈ `55 * (2N-1)` — augmente
 * doucement et continûment, jamais un simple "100 XP = niveau suivant".
 *   N1 = 55      · N5 = 1 375   · N10 = 5 500
 *   N20 = 22 000 · N30 = 49 500 · N50 = 137 500
 *   N80 = 352 000 · N100 = 550 000
 * Pour un utilisateur régulier (~3-4 séances/semaine, quelques records et
 * semaines régulières, ~500-700 XP/semaine en moyenne) cela correspond
 * environ à : niveau 10 en ~2 mois, niveau 20 en ~8-9 mois, niveau 30 en
 * ~1,5 an, niveau 50 en ~4-5 ans — les rangs les plus prestigieux (voir
 * plus bas) restent un objectif de plusieurs années, pas un palier
 * franchissable en quelques semaines.
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  const L = Math.min(level, MAX_LEVEL);
  return Math.round(55 * L * L);
}

export function levelFromXP(xp: number): number {
  let n = 0;
  while (n < MAX_LEVEL && xp >= xpForLevel(n + 1)) n++;
  return n;
}

// ---------- Rangs IRONFLOW ----------

/** Couleur d'un rang — toujours une clé vers un token de thème existant,
 * jamais une valeur hexadécimale en dur (cohérence Classique/Sunset
 * garantie automatiquement, voir `rankAccentColor` dans le composant). */
export type RankColorKey =
  | 'neutral'
  | 'cardio'
  | 'strength'
  | 'energy'
  | 'performance'
  | 'achievement'
  | 'success'
  | 'progress'
  | 'brand';

export type RankDef = {
  key: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  /** 1 = pas de sous-rang affiché (bande trop courte pour que I/II/III aient
   * un sens) ; 3 = trois sous-rangs (I/II/III) répartis sur la bande. */
  subRanks: 1 | 3;
  colorKey: RankColorKey;
};

/**
 * 9 rangs IRONFLOW — identité sportive/métallique, pas "jeu vidéo" :
 * NOVICE → INITIÉ → FER → ACIER → TITAN → ELITE → MAÎTRE → LÉGENDE →
 * IRONFLOW (le rang éponyme, sommet absolu, niveau 100 seul). Les deux
 * premiers rangs sont volontairement courts et sans sous-rang (la
 * progression y est déjà rapide en soi) ; à partir de FER, chaque rang est
 * assez large pour porter trois sous-paliers (I/II/III) qui multiplient les
 * moments de satisfaction avant le changement de rang complet.
 */
export const RANKS: RankDef[] = [
  { key: 'novice', name: 'NOVICE', minLevel: 1, maxLevel: 4, subRanks: 1, colorKey: 'neutral' },
  { key: 'initie', name: 'INITIÉ', minLevel: 5, maxLevel: 9, subRanks: 1, colorKey: 'cardio' },
  { key: 'fer', name: 'FER', minLevel: 10, maxLevel: 18, subRanks: 3, colorKey: 'strength' },
  { key: 'acier', name: 'ACIER', minLevel: 19, maxLevel: 27, subRanks: 3, colorKey: 'energy' },
  { key: 'titan', name: 'TITAN', minLevel: 28, maxLevel: 39, subRanks: 3, colorKey: 'performance' },
  { key: 'elite', name: 'ELITE', minLevel: 40, maxLevel: 54, subRanks: 3, colorKey: 'achievement' },
  { key: 'maitre', name: 'MAÎTRE', minLevel: 55, maxLevel: 72, subRanks: 3, colorKey: 'success' },
  { key: 'legende', name: 'LÉGENDE', minLevel: 73, maxLevel: 99, subRanks: 3, colorKey: 'progress' },
  { key: 'ironflow', name: 'IRONFLOW', minLevel: 100, maxLevel: 100, subRanks: 1, colorKey: 'brand' },
];

const SUB_RANK_NUMERALS = ['I', 'II', 'III'];

export type RankProgress = {
  rank: RankDef;
  /** 0-based (0=I, 1=II, 2=III), `null` si le rang n'a pas de sous-rang. */
  subIndex: number | null;
  /** "TITAN II", ou juste "NOVICE" si pas de sous-rang. */
  label: string;
};

export function rankForLevel(level: number): RankProgress {
  const rank =
    RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel) ??
    (level < RANKS[0].minLevel ? RANKS[0] : RANKS[RANKS.length - 1]);
  if (rank.subRanks === 1) return { rank, subIndex: null, label: rank.name };
  const span = rank.maxLevel - rank.minLevel + 1;
  const sizePerSub = Math.ceil(span / rank.subRanks);
  const subIndex = Math.min(rank.subRanks - 1, Math.floor((level - rank.minLevel) / sizePerSub));
  return { rank, subIndex, label: `${rank.name} ${SUB_RANK_NUMERALS[subIndex]}` };
}

/** Premier niveau (> `level`) où le libellé de rang change — le "prochain
 * palier" affiché à l'utilisateur. `null` si déjà au niveau maximum. */
export function nextMilestone(level: number): { level: number; label: string } | null {
  if (level >= MAX_LEVEL) return null;
  const currentLabel = rankForLevel(level).label;
  for (let l = level + 1; l <= MAX_LEVEL; l++) {
    const p = rankForLevel(l);
    if (p.label !== currentLabel) return { level: l, label: p.label };
  }
  return null;
}

export type LevelState = {
  xp: number;
  level: number;
  isMaxLevel: boolean;
  xpIntoLevel: number;
  xpForThisLevel: number;
  xpToNext: number;
  progress: number; // 0..1
  rank: RankProgress;
  milestone: { level: number; label: string; xpNeeded: number } | null;
};

export function computeLevelState(xp: number): LevelState {
  const level = levelFromXP(xp);
  const isMaxLevel = level >= MAX_LEVEL;
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpForThisLevel = Math.max(1, nextThreshold - currentThreshold);
  const xpToNext = Math.max(0, nextThreshold - xp);
  const progress = isMaxLevel ? 1 : Math.max(0, Math.min(1, xpIntoLevel / xpForThisLevel));
  const rank = rankForLevel(level);
  const nm = nextMilestone(level);
  const milestone = nm ? { ...nm, xpNeeded: Math.max(0, xpForLevel(nm.level) - xp) } : null;

  return { xp, level, isMaxLevel, xpIntoLevel, xpForThisLevel, xpToNext, progress, rank, milestone };
}

// ---------- Détection de montée de niveau (pour l'animation) ----------

/** Compare le niveau actuel au dernier niveau vu et persisté. Renvoie
 * `null` la toute première fois (pas d'animation pour tout l'historique
 * rétroactif d'un utilisateur existant) puis le delta réel à chaque
 * progression ultérieure. Met à jour la valeur stockée dans tous les cas. */
export async function checkLevelUp(currentLevel: number): Promise<{ from: number; to: number } | null> {
  const raw = await AsyncStorage.getItem(XP_LAST_SEEN_LEVEL_KEY);
  await AsyncStorage.setItem(XP_LAST_SEEN_LEVEL_KEY, String(currentLevel));
  if (raw == null) return null; // premier calcul jamais effectué sur cet appareil
  const previous = Number(raw);
  if (!Number.isFinite(previous) || currentLevel <= previous) return null;
  return { from: previous, to: currentLevel };
}
