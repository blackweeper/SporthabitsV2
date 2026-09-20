import type { Program, ProgramDay, ProgramSession } from './programs';
import { buildExercises, type BuilderBlock } from './program-builder';

/**
 * "Haltères 4 jours — 12 semaines" — transcrit depuis le PDF "Programme
 * Entraînement Haltères 3 Mois" (4 séances/semaine, haltères + banc, 3 mois :
 * technique & tempo → augmentation de charge → intensité maximale).
 *
 * Structure : les 4 séances du PDF sont des gabarits (`SESSION_TEMPLATES`),
 * répétés sur 12 semaines dans le patron hebdomadaire du PDF (Jour 1 Haut du
 * corps · Jour 2 Bas du corps · Jour 3 repos · Jour 4 Full Body intensif ·
 * Jour 5 Full Body hypertrophie · Jours 6-7 repos). Les exercices, séries et
 * fourchettes de reps sont identiques toutes les semaines (le PDF ne varie que
 * l'effort, en RIR, par mois) : seule la ligne d'effort ajoutée aux consignes
 * change d'un mois à l'autre (`MONTH_EFFORT`).
 *
 * Supersets (A1 → A2 sans repos) : encodés en `RoundBlock` — voir
 * `program-builder.ts`.
 *
 * Liens bibliothèque : chaque exercice porte un `exerciseRecordId` réel de la
 * bibliothèque officielle v3 (vérifié présent dans la version publiée), sauf le
 * hip thrust surélevé unilatéral, absent de la bibliothèque — voir `if_0117`.
 */

// Identifiants bibliothèque (exercise-library/versions/v3/exercises.json).
const LIB = {
  developpeInclineHalteres: 'wx_0314',
  rowingInclineHalteres: 'wx_0327',
  pulloverHaltere: 'wx_0375',
  pompes: 'sys_pompes',
  extensionTricepsAllongeHalteres: 'wx_0351',
  curlInclineHalteres: 'wx_0318',
  souleveTerreUnilateral: 'wx_1757',
  // Le nom "Squat fendu à une jambe avec haltères" n'évoque pas le bulgare,
  // mais ses instructions décrivent bien le pied arrière posé sur un banc.
  squatFenduUneJambeHalteres: 'wx_0410',
  squatGobeletHaltere: 'wx_1760',
  mollets1JambeHaltere: 'wx_0409',
  epauleHalteres: 'wx_0295',
  souleveTerreHalteres: 'wx_0300',
  extensionTricepsUnilateralAllonge: 'wx_1735',
  souleveTerreRoumainHalteres: 'wx_1459',
  rowingBustePencheHalteres: 'wx_0293',
  elevationLateraleAllongeCote: 'wx_0408',
  dipsBanc: 'wx_0129',
  // Créé pour ce programme (absent de la bibliothèque officielle v3) : hip
  // thrust surélevé unilatéral avec haltère sur le bassin. Tant que la
  // bibliothèque n'a pas été republiée avec cet exercice, l'id ne se résout pas
  // et l'app retombe sur le nom affiché (comportement historique, sans erreur).
  hipThrustSureleveUnilateral: 'if_0117',
} as const;

type SessionTemplate = { label: string; title: string; blocks: BuilderBlock[] };

const MONTH_EFFORT: Record<1 | 2 | 3, string> = {
  1: 'Effort : 2-3 RIR, descente en 3 s.',
  2: 'Effort : 2 RIR. Monte en charge ou en reps.',
  3: 'Effort : 1-2 RIR sur la dernière série. Réduis le repos si possible.',
};

const SESSION_TEMPLATES: Record<'haut' | 'bas' | 'fullIntensif' | 'fullHypertrophie', SessionTemplate> = {
  haut: {
    label: 'Haut du corps',
    title: 'Séance 1 : Haut du corps',
    blocks: [
      {
        kind: 'superset',
        letter: 'A',
        rounds: 3,
        items: [
          { name: 'Développé incliné aux haltères', libId: LIB.developpeInclineHalteres, reps: '8-12', rest: 0, notes: 'Descente 3 s, pause 2 s en bas. Enchaîne directement avec A2.' },
          { name: 'Rowing incliné aux haltères', libId: LIB.rowingInclineHalteres, reps: '8-12', rest: 60, notes: 'Pause 2 s en haut. Repos 60 s après.' },
        ],
      },
      {
        kind: 'superset',
        letter: 'B',
        rounds: 3,
        items: [
          { name: 'Pullover aux haltères', libId: LIB.pulloverHaltere, reps: '10-15', rest: 0, notes: 'Pause 2 s en étirement. Enchaîne directement avec B2.' },
          { name: 'Pompes au sol (ou sur les genoux)', libId: LIB.pompes, reps: '10-15', rest: 60, notes: 'Buste proche du sol. Repos 60 s après.' },
        ],
      },
      {
        kind: 'superset',
        letter: 'C',
        rounds: 3,
        items: [
          { name: 'Barre au front aux haltères (triceps)', libId: LIB.extensionTricepsAllongeHalteres, reps: '10-15', rest: 0, notes: 'Coudes fixes. Enchaîne directement avec C2.' },
          { name: 'Curl biceps sur banc incliné', libId: LIB.curlInclineHalteres, reps: '10-15', rest: 60, notes: 'Étirement complet en bas. Repos 60 s après.' },
        ],
      },
    ],
  },
  bas: {
    label: 'Bas du corps',
    title: 'Séance 2 : Bas du corps',
    blocks: [
      { kind: 'single', sets: 3, item: { name: 'Soulevé de terre unilatéral jambes tendues', libId: LIB.souleveTerreUnilateral, reps: '6-10/jambe', rest: 30, notes: 'Pause 2 s en bas. Repos 30 s entre les jambes.' } },
      { kind: 'single', sets: 3, item: { name: 'Fentes bulgares (pied arrière surélevé)', libId: LIB.squatFenduUneJambeHalteres, reps: '6-10/jambe', rest: 60, notes: 'Pause 2 s en bas, en étirement. Repos 60 s après les 2 jambes.', confidence: 'manual' } },
      { kind: 'single', sets: 3, item: { name: 'Squat gobelet (Goblet Squat)', libId: LIB.squatGobeletHaltere, reps: '10-15', rest: 60, notes: 'Haltère contre le thorax. Pause 2 s en bas. Repos 60 s.' } },
      { kind: 'single', sets: 2, item: { name: 'Extensions mollets debout sur une jambe', libId: LIB.mollets1JambeHaltere, reps: '15-20/jambe', rest: 30, notes: 'Contracte fort en haut. Repos 30 s entre les côtés.' } },
    ],
  },
  fullIntensif: {
    label: 'Full Body intensif',
    title: 'Séance 3 : Full Body intensif',
    blocks: [
      {
        kind: 'superset',
        letter: 'A',
        rounds: 5,
        items: [
          { name: 'Épaulé aux haltères (Dumbbell Clean)', libId: LIB.epauleHalteres, reps: '6-10', rest: 0, notes: 'Mouvement explosif depuis les cuisses. Enchaîne directement avec A2.' },
          { name: 'Soulevé de terre aux haltères', libId: LIB.souleveTerreHalteres, reps: '6-10', rest: 60, notes: 'Garde la charge proche des jambes. Repos 60 s après.' },
        ],
      },
      {
        kind: 'superset',
        letter: 'B',
        rounds: 3,
        items: [
          { name: 'Extension triceps allongé (unilatéral)', libId: LIB.extensionTricepsUnilateralAllonge, reps: '10-12/bras', rest: 0, notes: 'Garde le coude fixe. Enchaîne directement avec B2.' },
          { name: 'Soulevé de terre roumain (RDL)', libId: LIB.souleveTerreRoumainHalteres, reps: '10-15', rest: 60, notes: 'Pause 2 s en bas. Repos 60 s après.' },
        ],
      },
      {
        kind: 'superset',
        letter: 'C',
        rounds: 3,
        items: [
          { name: 'Rowing buste penché aux haltères', libId: LIB.rowingBustePencheHalteres, reps: '10-15', rest: 0, notes: 'Tire vers les hanches. Enchaîne directement avec C2.' },
          { name: 'Pompes au sol avec arrêt en bas', libId: LIB.pompes, reps: '10-15', rest: 60, notes: 'Relâche brièvement en bas (arrêt d\'1 s). Repos 60 s après.', confidence: 'manual' },
        ],
      },
    ],
  },
  fullHypertrophie: {
    label: 'Full Body hypertrophie',
    title: 'Séance 4 : Full Body hypertrophie',
    blocks: [
      { kind: 'single', sets: 3, item: { name: 'Soulevé de terre roumain (ou Good Morning)', libId: LIB.souleveTerreRoumainHalteres, reps: '10-15', rest: 60, notes: 'Pause 2 s en étirement en bas. Repos 60 s.' } },
      {
        kind: 'superset',
        letter: 'B',
        rounds: 3,
        items: [
          { name: 'Hip thrust surélevé (haltère sur le bassin)', libId: LIB.hipThrustSureleveUnilateral, reps: '8-12/jambe', rest: 0, notes: 'Contraction 1 s en haut. Enchaîne directement avec B2.', confidence: 'manual' },
          { name: 'Élévations latérales allongé sur le côté', libId: LIB.elevationLateraleAllongeCote, reps: '8-12/côté', rest: 60, notes: 'Contrôle la descente. Repos 60 s après.' },
        ],
      },
      { kind: 'single', sets: 3, item: { name: 'Rowing incliné aux haltères (prise neutre)', libId: LIB.rowingInclineHalteres, reps: '12-15', rest: 60, notes: 'Prise neutre. Focus milieu du dos. Repos 60 s.', confidence: 'manual' } },
      { kind: 'single', sets: 3, item: { name: 'Dips sur banc (ou pompes pieds surélevés)', libId: LIB.dipsBanc, reps: '10-15', rest: 60, notes: 'Finition pectoraux et triceps. Repos 60 s.' } },
    ],
  },
};

function buildSession(week: number, key: keyof typeof SESSION_TEMPLATES): ProgramSession {
  const tpl = SESSION_TEMPLATES[key];
  const month = (week <= 4 ? 1 : week <= 8 ? 2 : 3) as 1 | 2 | 3;
  const exercises = buildExercises(tpl.blocks, `halteres-w${week}-${key}`, MONTH_EFFORT[month]);
  return { label: tpl.label, title: tpl.title, exercises };
}

const REST_DAY: ProgramDay = { rest: true, title: 'Repos complet', sessions: [] };

function buildWeek(week: number): ProgramDay[] {
  const trainingDay = (dayNumber: number, key: keyof typeof SESSION_TEMPLATES): ProgramDay => ({
    rest: false,
    title: `Semaine ${week} — Jour ${dayNumber}`,
    sessions: [buildSession(week, key)],
  });
  return [
    trainingDay(1, 'haut'),
    trainingDay(2, 'bas'),
    { ...REST_DAY },
    trainingDay(4, 'fullIntensif'),
    trainingDay(5, 'fullHypertrophie'),
    { ...REST_DAY },
    { ...REST_DAY },
  ];
}

export const HALTERES_4_JOURS_PROGRAM: Program = {
  id: 'halteres-4-jours-12-semaines',
  title: 'Haltères 4 jours — 12 semaines',
  description:
    "Programme haltères + banc, 4 séances par semaine sur 12 semaines : Haut du corps, Bas du corps, Full Body intensif et Full Body hypertrophie (supersets, tempo contrôlé). " +
    "Mois 1 : technique et tempo (2-3 RIR) · Mois 2 : augmentation des charges (2 RIR) · Mois 3 : intensité maximale (1-2 RIR). " +
    "RIR = nombre de répétitions qu'il te reste avant l'échec. Superset : enchaîne l'exercice 1 et l'exercice 2 sans repos, puis prends le repos indiqué. " +
    "Échauffement : 5 à 8 minutes de mobilité générale + 1 à 2 séries légères d'activation avant le premier exercice.",
  durationDays: 84,
  level: 'intermediaire',
  goal: 'Hypertrophie & force',
  goalTag: 'prise_de_masse',
  coverEmoji: '🏋️',
  color: '#247BFF',
  days: Array.from({ length: 12 }, (_, i) => buildWeek(i + 1)).flat(),
  isCustom: true,
  category: 'workout',
  phases: [
    { startDay: 1, endDay: 28, kind: 'volume', label: 'Mois 1 — Technique & tempo' },
    { startDay: 29, endDay: 56, kind: 'volume', label: 'Mois 2 — Augmentation des charges' },
    { startDay: 57, endDay: 84, kind: 'intensity', label: 'Mois 3 — Intensité maximale' },
  ],
};
