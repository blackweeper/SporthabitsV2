/**
 * Transforme un export JSON "workouts_normalized" (catalogue d'exercices +
 * liste de WODs, format libre fourni par l'utilisateur) en `WOD_LIBRARY:
 * Plan[]` pour `src/data/wod-library.ts`. Purement un outil de génération —
 * n'écrit jamais directement dans le stockage utilisateur.
 *
 * Convention de sortie (cohérente avec le reste de la session) :
 *  - AMRAP / AMRAP_BLOCKS -> une seule Exercise composite (mode:'amrap',
 *    nom "AMRAP N min : mvt1 → mvt2 → ...").
 *  - EMOM_SAME / EMOM_CYCLE -> nouvelles entrées `emomBlock` (une Exercise
 *    par round, mode:'emom', sets:1) — moteur premium.
 *  - MULTI_ROUND (FOR_TIME/CHIPPER à rounds répétés ou en échelle) ->
 *    round-robin réel (une Exercise par passage, mode:'reps', sets:1).
 *  - INTERVAL (blocs à durée fixe) -> round-robin mode:'time' (convention
 *    déjà utilisée par "The Comeback").
 *
 * Usage (depuis frontend/) : node scripts/import-wod-json.js <chemin.json>
 */
const fs = require('fs');
const path = require('path');

// Ce module est aussi importé par build-wod-library.js pour ses seules
// fonctions utilitaires (sans avoir besoin du JSON source) — `wod` reste
// `null` dans ce cas, seul l'usage en CLI direct l'exige.
const SRC = process.argv[2];
let wod = null;
if (require.main === module) {
  if (!SRC) {
    console.error('Usage: node import-wod-json.js <chemin-vers-json>');
    process.exit(1);
  }
  wod = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
}

// ---------------------------------------------------------------------
// 1. Catalogue -> bibliothèque réelle (correspondance exacte uniquement,
//    vérifiée manuellement contre exercise-library/versions/v3/exercises.json)
// ---------------------------------------------------------------------
const CATALOG_MAP = {
  pull_up: 'wx_0652',
  strict_pull_up: 'sys_tractions_strictes',
  push_up: 'wx_0662',
  hand_release_push_up: null,
  air_squat: 'sys_air_squat',
  squat_jump: 'wx_0514',
  walking_lunge: 'wx_1460',
  alternating_lunge: 'wx_1460',
  weighted_lunge: null,
  sandbag_lunge: 'sys_fente_avec_sac_de_sable_sandbag_lunge',
  sit_up: 'wx_0001',
  abmat_sit_up: 'wx_0001',
  burpee: 'wx_1160',
  burpee_broad_jump: null,
  bar_facing_burpee: null,
  burpee_box_jump: null,
  box_jump: 'sys_box_jump_box_jump_over',
  box_jump_over: 'sys_box_jump_box_jump_over',
  medball_box_step_over: 'sys_step_over_sur_boite_avec_medecine_ball',
  lateral_box_step_over: null,
  wall_walk: null,
  wall_sit: 'sys_wall_sit_chaise',
  mountain_climber: 'wx_0630',
  toes_to_bar: null,
  ring_muscle_up: null,
  run: 'wx_0685',
  swim: null,
  rowing: 'sys_rameur',
  skierg: 'sys_skierg',
  air_bike: 'sys_assault_bike',
  bike_erg: 'sys_bikeerg',
  double_under: 'sys_double_under_corde_a_sauter_double_passage',
  single_under: 'sys_single_under_corde_a_sauter_simple_passage',
  kettlebell_swing_russian: 'wx_0549',
  kettlebell_swing_american: 'wx_0549',
  kettlebell_snatch: null,
  kettlebell_goblet_squat: 'wx_0534',
  kettlebell_front_squat: null,
  wall_ball: 'sys_wall_balls',
  dumbbell_snatch: 'sys_dumbbell_snatches_alternes',
  dumbbell_row: null,
  push_press: 'sys_push_press_barre',
  back_squat: 'sys_squat_avec_barre',
  squat_clean: null,
  farmers_carry: 'wx_2133',
  sandbag_carry: null,
  sled_push: 'sys_sled_push_poussee_de_traineau',
  sled_pull: 'sys_sled_pull_tirage_de_traineau',
  rest: null,
};

/**
 * Nom affiché EXACT tel qu'il apparaît (nameFr ou un alias) sur le vrai
 * enregistrement `exercise-library` — vérifié un par un contre
 * `exercise-library/versions/v3/exercises.json`. Indispensable : `name`
 * doit matcher `matchExerciseRecord` (correspondance exacte, jamais
 * approximative) pour que la vraie vignette se résolve — un `SHORT_FR`
 * "plausible" mais pas identique au libellé réel (ex. "Tractions" au lieu
 * de "Traction") ne matche jamais, même avec un `exerciseRecordId` valide.
 * Prioritaire sur `SHORT_FR` quand un id réel existe.
 */
const DISPLAY_NAME_OVERRIDE = {
  pull_up: 'Traction',
  push_up: 'Pompe',
  air_squat: 'Squats',
  squat_jump: 'Squat sauté',
  walking_lunge: 'Fente en marchant',
  alternating_lunge: 'Fentes alternées',
  sandbag_lunge: 'Fente avec sac de sable (Sandbag Lunge)',
  sit_up: 'Sit-ups',
  abmat_sit_up: 'AbMat Sit-Ups',
  burpee: 'Burpee',
  box_jump: 'Box Jump / Box Jump-Over',
  box_jump_over: 'Box Jump-Overs',
  medball_box_step_over: 'Medicine-Ball Box Step-Overs',
  wall_sit: 'Wall Sit (Chaise)',
  mountain_climber: 'Mountain Climber',
  run: 'Course',
  double_under: 'Double unders',
  single_under: 'Single-Unders',
  kettlebell_swing_russian: 'Swing avec kettlebell',
  kettlebell_swing_american: 'Swing avec kettlebell',
  kettlebell_goblet_squat: 'Squat goblet avec kettlebell',
  dumbbell_snatch: 'Dumbbell Snatches alternés',
  push_press: 'Push Press',
  back_squat: 'Back Squats',
  farmers_carry: "Farmer's Walk",
  sled_push: 'Sled push',
  sled_pull: 'Sled Pull',
};

const SHORT_FR = {
  pull_up: 'Tractions', strict_pull_up: 'Tractions strictes', push_up: 'Pompes',
  hand_release_push_up: 'Pompes Hand Release', air_squat: 'Squats', squat_jump: 'Squats sautés',
  walking_lunge: 'Fentes marchées', alternating_lunge: 'Fentes alternées', weighted_lunge: 'Fentes lestées',
  sandbag_lunge: 'Fentes sac de sable', sit_up: 'Sit-ups', abmat_sit_up: 'Sit-ups AbMat',
  burpee: 'Burpees', burpee_broad_jump: 'Burpees saut en longueur', bar_facing_burpee: 'Burpees face à la barre',
  burpee_box_jump: 'Burpee Box Jumps', box_jump: 'Box Jumps', box_jump_over: 'Box Jump-Overs',
  medball_box_step_over: 'Step-Overs medball', lateral_box_step_over: 'Step-Overs latéraux',
  wall_walk: 'Wall Walks', wall_sit: 'Wall Sit', mountain_climber: 'Grimpeurs', toes_to_bar: 'Toes-to-Bar',
  ring_muscle_up: 'Muscle-Ups anneaux', run: 'Course', swim: 'Natation', rowing: 'Rameur',
  skierg: 'SkiErg', air_bike: 'Assault Bike', bike_erg: 'BikeErg', double_under: 'Double-Unders',
  single_under: 'Single-Unders', kettlebell_swing_russian: 'Swings KB russes',
  kettlebell_swing_american: 'Swings KB américains', kettlebell_snatch: 'KB Snatch',
  kettlebell_goblet_squat: 'Goblet Squats', kettlebell_front_squat: 'KB Front Squats',
  wall_ball: 'Wall Balls', dumbbell_snatch: 'Snatch haltère', dumbbell_row: 'Rowing haltères',
  push_press: 'Push Press', back_squat: 'Back Squats', squat_clean: 'Squat Clean',
  farmers_carry: "Farmer's Carry", sandbag_carry: 'Sandbag Carry', sled_push: 'Sled Push',
  sled_pull: 'Sled Pull', rest: 'Repos',
};

function fr(cat) {
  const f = DISPLAY_NAME_OVERRIDE[cat] || SHORT_FR[cat];
  if (!f) throw new Error('Missing SHORT_FR for ' + cat);
  return f;
}
function recId(cat) {
  return CATALOG_MAP[cat] ?? null;
}
function label(cat, qty) {
  return qty ? `${qty} ${fr(cat)}` : fr(cat);
}

let counter = 0;
function nextId(planId) {
  counter += 1;
  return `${planId}-ex-${counter}`;
}

function baseExercise(planId, name, mode, overrides) {
  return Object.assign(
    {
      id: nextId(planId),
      name,
      mode,
      sets: 1,
      reps: '',
      weight: null,
      rest_seconds: 0,
      duration_seconds: null,
      notes: null,
      exerciseRecordId: null,
      matchConfidence: null,
    },
    overrides,
  );
}

/** AMRAP -> une seule Exercise composite. */
function buildAmrap(planId, durationSec, items, prefix) {
  const mm = Math.round(durationSec / 60);
  const title = prefix || `AMRAP ${mm} min`;
  const parts = items.map((it) => label(it.cat, it.qty));
  const name = `${title} : ${parts.join(' → ')}`;
  const first = items[0];
  return [
    baseExercise(planId, name, 'amrap', {
      sets: 1,
      reps: String(items.length),
      duration_seconds: durationSec,
      exerciseRecordId: recId(first.cat),
      matchConfidence: recId(first.cat) ? 'exact' : 'unmatched',
    }),
  ];
}

/** Round-robin réel : une Exercise par round/passage, jamais sets:N.
 * `name` reste le nom PUR du mouvement (jamais de quantité en tête) — la
 * quantité vit uniquement dans `reps`, condition nécessaire pour que
 * `matchExerciseRecord` (correspondance exacte, utilisée partout dans
 * l'app pour résoudre la vraie vignette) reconnaisse le mouvement. */
function buildMultiRound(planId, roundsList, mode, opts) {
  mode = mode || 'reps';
  opts = opts || {};
  const out = [];
  for (const round of roundsList) {
    for (const it of round) {
      const rid = recId(it.cat);
      out.push(
        baseExercise(planId, fr(it.cat), mode, {
          reps: mode === 'reps' ? String(it.qty ?? '') : '',
          duration_seconds: mode === 'time' ? it.durationSec ?? opts.durationSec ?? null : null,
          rest_seconds: it.restSec ?? opts.restSec ?? 0,
          exerciseRecordId: rid,
          matchConfidence: rid ? 'exact' : 'unmatched',
          notes: it.notes || null,
        }),
      );
    }
  }
  return out;
}

/** Répète une même liste de rounds N fois (round-robin uniforme). */
function repeatRound(items, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(items);
  return out;
}

/** Échelle : mêmes items, valeurs différentes par palier (tiers = tableau de tableaux qty). */
function ladderRounds(items, tiers) {
  return tiers.map((tierQtys) => items.map((it, i) => ({ cat: it.cat, qty: tierQtys[i] })));
}

/** EMOM (nouveau moteur premium) : une Exercise par round avec emomBlock.
 * `name` reste pur (jamais de quantité en tête) pour les rounds à un seul
 * mouvement — l'écrasante majorité — afin que `matchExerciseRecord` puisse
 * résoudre la vraie vignette ; la quantité vit dans `reps`, exactement comme
 * `EmomLiveOverlay` l'affiche (nom en grand, cible en dessous). Seuls les
 * rounds à VRAI complexe multi-mouvements gardent le nom composite en
 * flèches (convention `composite-exercise.ts`), auquel cas aucune vignette
 * unique n'a de sens — `EmomLiveOverlay` s'affiche alors sans vignette. */
function buildEmomRounds(planId, blockTitle, roundsContent, durationSecPerRound) {
  const blockId = `${planId}-emom`;
  const totalRounds = roundsContent.length;
  const out = [];
  roundsContent.forEach((items, i) => {
    const isRest = items.length === 1 && items[0].cat === 'rest';
    const name = isRest
      ? 'Repos'
      : items.length === 1
        ? fr(items[0].cat)
        : items.map((it) => label(it.cat, it.qty)).join(' → ');
    const first = items[0];
    const rid = isRest ? null : recId(first.cat);
    const notes = items.map((it) => it.notes).filter(Boolean).join(' · ') || null;
    out.push(
      baseExercise(planId, name, 'emom', {
        sets: 1,
        reps: isRest ? '' : String(items.length > 1 ? items.map((it) => it.qty ?? '').join('/') : first.qty ?? ''),
        duration_seconds: (items[0] && items[0].durationSec) || durationSecPerRound || 60,
        exerciseRecordId: rid,
        matchConfidence: rid ? 'exact' : 'unmatched',
        notes,
        emomBlock: { blockId, roundIndex: i, totalRounds, title: blockTitle },
      }),
    );
  });
  return out;
}

/** Repos explicite entre rounds (mode:'time', pas de reps). */
function restExercise(planId, sec, note) {
  return baseExercise(planId, 'Repos', 'time', {
    duration_seconds: sec,
    notes: note || null,
  });
}

/** Construit des rounds round-robin (mode:'reps') avec un repos (mode:'time')
 * inséré après chaque round sauf le dernier. */
function buildRoundsWithRest(planId, roundsList, restSec, mode, opts) {
  const out = [];
  roundsList.forEach((round, i) => {
    out.push(...buildMultiRound(planId, [round], mode || 'reps', opts));
    if (i < roundsList.length - 1) out.push(restExercise(planId, restSec));
  });
  return out;
}

function plan(id, title, kind, exercises, opts) {
  opts = opts || {};
  return {
    id: `wod-${id}`,
    title,
    type: opts.type || 'hiit',
    category: 'workout',
    createdAt: new Date().toISOString(),
    exercises,
    wodSource: {
      collection: 'classics',
      number: opts.number,
      intensity: opts.intensity || 3,
      intensitySource: 'estimated',
      format: opts.format,
    },
  };
}

module.exports = {
  wod, CATALOG_MAP, SHORT_FR, fr, recId, label, baseExercise,
  buildAmrap, buildMultiRound, repeatRound, ladderRounds, buildEmomRounds,
  restExercise, buildRoundsWithRest, plan,
  resetCounter: () => { counter = 0; },
};
