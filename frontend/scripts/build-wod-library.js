const fs = require('fs');
const path = require('path');
const {
  buildAmrap, buildMultiRound, repeatRound, ladderRounds, buildEmomRounds,
  restExercise, buildRoundsWithRest, plan,
} = require('./import-wod-json.js');

const plans = [];
let n = 0;
function add(p) { n += 1; plans.push(p); }

// 1. Cindy
add(plan('cindy', 'Cindy', null,
  buildAmrap('cindy', 1200, [
    { cat: 'pull_up', qty: '5' }, { cat: 'push_up', qty: '10' }, { cat: 'air_squat', qty: '15' },
  ]), { number: n + 1, format: 'AMRAP 20 min', intensity: 3 }));

// 2. Mikko's Triangle (EMOM cycle: Row/Ski/Bike/Rest x10)
{
  const cycle = [
    [{ cat: 'rowing', notes: 'Vise le même nombre de calories à chaque round' }],
    [{ cat: 'skierg', notes: 'Vise le même nombre de calories à chaque round' }],
    [{ cat: 'air_bike', notes: 'Vise le même nombre de calories à chaque round' }],
    [{ cat: 'rest' }],
  ];
  const rounds = [];
  for (let c = 0; c < 10; c++) cycle.forEach((r) => rounds.push(r));
  add(plan('mikkos_triangle', "Mikko's Triangle", null,
    buildEmomRounds('mikkos_triangle', "Mikko's Triangle", rounds, 60),
    { number: n + 1, format: 'EMOM 39 min', intensity: 4 }));
}

// 3. Loredo
add(plan('loredo', 'Loredo', null,
  buildMultiRound('loredo', repeatRound([
    { cat: 'air_squat', qty: '24' }, { cat: 'push_up', qty: '24' },
    { cat: 'walking_lunge', qty: '24' }, { cat: 'run', qty: '400m' },
  ], 6), 'reps'), { number: n + 1, format: '6 Rounds For Time', intensity: 3 }));

// 4. Cooper
add(plan('cooper', 'Cooper', null,
  buildMultiRound('cooper', repeatRound([
    { cat: 'burpee', qty: '10' }, { cat: 'air_squat', qty: '10' },
    { cat: 'push_up', qty: '10' }, { cat: 'sit_up', qty: '10' },
  ], 10), 'reps'), { number: n + 1, format: '10 Rounds For Time', intensity: 3 }));

// 5. Helen
add(plan('helen', 'Helen', null,
  buildMultiRound('helen', repeatRound([
    { cat: 'run', qty: '400m' }, { cat: 'kettlebell_swing_russian', qty: '21 (24/16 kg)' },
    { cat: 'pull_up', qty: '12' },
  ], 3), 'reps'), { number: n + 1, format: '3 Rounds For Time', intensity: 3 }));

// 6. Annie (ladder 50-40-30-20-10)
add(plan('annie', 'Annie', null,
  buildMultiRound('annie', ladderRounds(
    [{ cat: 'double_under' }, { cat: 'sit_up' }],
    [[50, 50], [40, 40], [30, 30], [20, 20], [10, 10]],
  ), 'reps'), { number: n + 1, format: '50-40-30-20-10', intensity: 2 }));

// 7. The Happening (ladder ascending lunges + fixed burpees)
add(plan('the_happening', 'The Happening', null,
  buildMultiRound('the_happening', ladderRounds(
    [{ cat: 'alternating_lunge' }, { cat: 'burpee' }],
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => [v, 10]),
  ), 'reps'), { number: n + 1, format: 'For Time', intensity: 4 }));

// 8. Wyck (single pass pyramidal chipper)
add(plan('wyck', 'Wyck', null,
  buildMultiRound('wyck', [[
    { cat: 'run', qty: '400m' }, { cat: 'burpee', qty: '20' }, { cat: 'run', qty: '600m' },
    { cat: 'wall_ball', qty: '40 (20/14 lb)' }, { cat: 'run', qty: '800m' },
    { cat: 'sandbag_lunge', qty: '60 (60/40 lb)' }, { cat: 'run', qty: '1000m' },
    { cat: 'sandbag_lunge', qty: '60 (60/40 lb)' }, { cat: 'run', qty: '800m' },
    { cat: 'wall_ball', qty: '40 (20/14 lb)' }, { cat: 'run', qty: '600m' },
    { cat: 'burpee', qty: '20' }, { cat: 'run', qty: '400m' },
  ]], 'reps'), { number: n + 1, format: 'For Time', intensity: 4 }));

// 9. Jennifer
add(plan('jennifer', 'Jennifer', null,
  buildAmrap('jennifer', 1560, [
    { cat: 'pull_up', qty: '10' }, { cat: 'kettlebell_swing_russian', qty: '15 (1.5/1 pood)' },
    { cat: 'box_jump', qty: '20 (24/20 in)' },
  ]), { number: n + 1, format: 'AMRAP 26 min', intensity: 4 }));

// 10. Barbara (5 rounds + 3min rest between)
add(plan('barbara', 'Barbara', null,
  buildRoundsWithRest('barbara', repeatRound([
    { cat: 'pull_up', qty: '20' }, { cat: 'push_up', qty: '30' },
    { cat: 'sit_up', qty: '40' }, { cat: 'air_squat', qty: '50' },
  ], 5), 180), { number: n + 1, format: '5 Rounds For Time', intensity: 4 }));

// 11. Bordesley (single pass chipper, 8 stations)
add(plan('bordesley', 'Bordesley', null,
  buildMultiRound('bordesley', [[
    { cat: 'rowing', qty: '400m' }, { cat: 'wall_ball', qty: '30 (20/14 lb)' },
    { cat: 'run', qty: '400m' }, { cat: 'burpee', qty: '30' },
    { cat: 'rowing', qty: '400m' }, { cat: 'sandbag_lunge', qty: '30 (60/40 lb)' },
    { cat: 'run', qty: '400m' }, { cat: 'hand_release_push_up', qty: '30' },
    { cat: 'rowing', qty: '400m' }, { cat: 'farmers_carry', qty: '100m (2x50/35 lb)' },
    { cat: 'run', qty: '400m' }, { cat: 'sit_up', qty: '100' },
  ]], 'reps'), { number: n + 1, format: 'For Time', intensity: 4 }));

// 12. Orbison (EMOM, same 3-movement complex every minute, 20 rounds)
add(plan('orbison', 'Orbison', null,
  buildEmomRounds('orbison', 'Orbison', repeatRound([
    { cat: 'burpee', qty: '4' }, { cat: 'air_squat', qty: '6' }, { cat: 'sit_up', qty: '8' },
  ], 20), 60), { number: n + 1, format: 'EMOM 20 min', intensity: 3 }));

// 13. Whitten
add(plan('whitten', 'Whitten', null,
  buildMultiRound('whitten', repeatRound([
    { cat: 'kettlebell_swing_russian', qty: '22 (2/1.5 pood)' }, { cat: 'box_jump', qty: '22 (24/20 in)' },
    { cat: 'run', qty: '400m' }, { cat: 'burpee', qty: '22' }, { cat: 'wall_ball', qty: '22 (20/14 lb)' },
  ], 5), 'reps'), { number: n + 1, format: '5 Rounds For Time', intensity: 4 }));

// 14. Flint (INTERVALS: 5 rounds of 3x2min blocks with rest)
add(plan('flint', 'Flint', null,
  buildRoundsWithRest('flint', repeatRound([
    { cat: 'skierg', qty: '20 cal' }, { cat: 'burpee', qty: '20' }, { cat: 'rowing', qty: '20 cal' },
  ], 5), 30), { number: n + 1, format: '5 x 6 min (intervalles)', intensity: 3 }));

// 15. Triple 3
add(plan('triple_3', 'Triple 3', null,
  buildMultiRound('triple_3', [[
    { cat: 'rowing', qty: '3000m' }, { cat: 'double_under', qty: '300' }, { cat: 'run', qty: '4.8km (3 miles)' },
  ]], 'reps'), { number: n + 1, format: 'For Time', intensity: 4 }));

// 16. Maupin
add(plan('maupin', 'Maupin', null,
  buildMultiRound('maupin', repeatRound([
    { cat: 'run', qty: '800m' }, { cat: 'push_up', qty: '49' },
    { cat: 'sit_up', qty: '49' }, { cat: 'air_squat', qty: '49' },
  ], 4), 'reps'), { number: n + 1, format: '4 Rounds For Time', intensity: 4 }));

// 17. Nicole
add(plan('nicole', 'Nicole', null,
  buildAmrap('nicole', 1200, [
    { cat: 'run', qty: '400m' }, { cat: 'pull_up', qty: 'max' },
  ]), { number: n + 1, format: 'AMRAP 20 min', intensity: 3 }));

// 18. Swole-Tel (4 blocks: 3 EMOM blocks + 1 AMRAP block) -> AMRAP_BLOCKS: encode as
// 4 composite Exercise entries (one per block), mode 'amrap' for all (3-min blocks).
add(plan('swole_tel', 'Swole-Tel', null, [
  ...buildAmrap('swole_tel', 180, [{ cat: 'dumbbell_row', qty: '15 (2x30 lb)' }, { cat: 'push_up', qty: '10' }], 'Bloc 1 (3 min)'),
  ...buildAmrap('swole_tel', 180, [{ cat: 'dumbbell_row', qty: '10 (2x40 lb)' }, { cat: 'push_up', qty: '10' }], 'Bloc 2 (3 min)'),
  ...buildAmrap('swole_tel', 180, [{ cat: 'dumbbell_row', qty: '5 (2x45 lb)' }, { cat: 'push_up', qty: '10' }], 'Bloc 3 (3 min)'),
  ...buildAmrap('swole_tel', 180, [{ cat: 'dumbbell_row', qty: 'max (2x30 lb)' }], 'Bloc 4 — AMRAP (3 min)'),
], { number: n + 1, format: '4 blocs de 3 min', intensity: 3 }));

// 19. Death Row (EMOM cycle odd/even, 20 rounds)
{
  const cycle = [[{ cat: 'rowing', qty: '20 cal' }], [{ cat: 'burpee', qty: '15' }]];
  const rounds = [];
  for (let c = 0; c < 10; c++) cycle.forEach((r) => rounds.push(r));
  add(plan('death_row', 'Death Row', null,
    buildEmomRounds('death_row', 'Death Row', rounds, 60),
    { number: n + 1, format: 'EMOM 20 min', intensity: 4 }));
}

// 20. Row Cindy Row
add(plan('row_cindy_row', 'Row Cindy Row', null,
  buildAmrap('row_cindy_row', 1200, [
    { cat: 'pull_up', qty: '5' }, { cat: 'push_up', qty: '10' },
    { cat: 'air_squat', qty: '15' }, { cat: 'rowing', qty: '20 cal' },
  ]), { number: n + 1, format: 'AMRAP 20 min', intensity: 3 }));

// 21. The Ghost (1min Row / 1min Burpees / 1min DU / 1min Rest, x6)
add(plan('the_ghost', 'The Ghost', null,
  buildMultiRound('the_ghost', repeatRound([
    { cat: 'rowing', notes: 'Maximum de calories en 1 minute', durationSec: 60 },
    { cat: 'burpee', notes: 'Maximum de répétitions en 1 minute', durationSec: 60 },
    { cat: 'double_under', notes: 'Maximum de répétitions en 1 minute', durationSec: 60 },
    { cat: 'rest', durationSec: 60 },
  ], 6), 'time', { durationSec: 60 }), { number: n + 1, format: '6 Rounds (intervalles 1 min)', intensity: 3 }));

// 22. Recovery Day (interval, 3 rounds x 3 machines, 2min work/2min rest)
{
  const machines = ['air_bike', 'rowing', 'skierg'];
  const roundsList = [];
  for (let round = 0; round < 3; round++) {
    for (const cat of machines) roundsList.push([{ cat, qty: '2 min', durationSec: 120 }]);
  }
  add(plan('recovery_day', 'Recovery Day', null,
    buildRoundsWithRest('recovery_day', roundsList, 120, 'time'),
    { number: n + 1, format: '3 Rounds (intervalles 2 min)', intensity: 2, type: 'cardio' }));
}

// 23. Jenkins (partner AMRAP)
add(plan('jenkins', 'Jenkins', null,
  buildAmrap('jenkins', 2400, [
    { cat: 'burpee', qty: '50' }, { cat: 'run', qty: '400m' },
    { cat: 'kettlebell_swing_russian', qty: '50 (24/16 kg)' }, { cat: 'run', qty: '400m' },
    { cat: 'pull_up', qty: '50' }, { cat: 'run', qty: '400m' },
    { cat: 'push_up', qty: '50' }, { cat: 'run', qty: '400m' },
  ]), { number: n + 1, format: 'AMRAP 40 min (Partenaire)', intensity: 4 }));

// 24. Grinder (3 parts x3 rounds each, AMRAP 40 total) -> 3 composite AMRAP blocks (13'20 each, approx)
add(plan('grinder', 'Grinder', null, [
  ...buildAmrap('grinder', 800, [
    { cat: 'air_bike', qty: '30/20 cal' }, { cat: 'wall_ball', qty: '20 (20/14 lb)' }, { cat: 'burpee', qty: '10' },
  ], 'Partie 1 (3 rounds)'),
  ...buildAmrap('grinder', 800, [
    { cat: 'rowing', qty: '30/20 cal' }, { cat: 'lateral_box_step_over', qty: '40 (24/20 in)' }, { cat: 'farmers_carry', qty: '100m (70/55 lb)' },
  ], 'Partie 2 (3 rounds)'),
  ...buildAmrap('grinder', 800, [
    { cat: 'double_under', qty: '50' }, { cat: 'wall_sit', qty: '1 min' }, { cat: 'mountain_climber', qty: '50' },
  ], 'Partie 3 (3 rounds)'),
], { number: n + 1, format: 'AMRAP 40 min (3 parties)', intensity: 4 }));

// 25. Expecto Squatronum (EMOM, same complex every minute, 24 rounds)
add(plan('expecto_squatronum', 'Expecto Squatronum', null,
  buildEmomRounds('expecto_squatronum', 'Expecto Squatronum', repeatRound([
    { cat: 'air_squat', qty: '5' }, { cat: 'burpee', qty: '4' }, { cat: 'pull_up', qty: '3' },
    { cat: 'kettlebell_swing_russian', qty: '2 (53/35 lb)' }, { cat: 'push_up', qty: '1' },
  ], 24), 60), { number: n + 1, format: 'EMOM 24 min', intensity: 3 }));

// 26. The Lou (partner 44 rounds YGIG)
add(plan('the_lou', 'The Lou', null,
  buildMultiRound('the_lou', repeatRound([
    { cat: 'wall_ball', qty: '4 (20/14 lb)' }, { cat: 'pull_up', qty: '4' },
    { cat: 'burpee', qty: '4' }, { cat: 'dumbbell_snatch', qty: '4 (50/35 lb)' },
  ], 44), 'reps'), { number: n + 1, format: '44 Rounds (Partenaire, YGIG)', intensity: 4, type: 'mixte' }));

// 27. CrossFit Open 22.1
add(plan('open_22_1', 'CrossFit Open 22.1', null,
  buildAmrap('open_22_1', 900, [
    { cat: 'wall_walk', qty: '3' }, { cat: 'dumbbell_snatch', qty: '12 (50/35 lb)' },
    { cat: 'box_jump_over', qty: '15 (24/20 in)' },
  ]), { number: n + 1, format: 'AMRAP 15 min', intensity: 3 }));

// 28. Holly (ascending ladder AMRAP)
add(plan('holly', 'Holly', null,
  buildAmrap('holly', 1200, [
    { cat: 'rowing', qty: '5→10→15→20→25 cal' }, { cat: 'wall_ball', qty: '10→20→30→40→50 (20/14 lb)' },
  ]), { number: n + 1, format: 'AMRAP 20 min (échelle ascendante)', intensity: 3 }));

// 29. Johnson
add(plan('johnson', 'Johnson', null,
  buildAmrap('johnson', 2700, [
    { cat: 'run', qty: '1000m' }, { cat: 'burpee_broad_jump', qty: '20' }, { cat: 'rowing', qty: '1000m' },
    { cat: 'walking_lunge', qty: '40' }, { cat: 'skierg', qty: '1000m' }, { cat: 'hand_release_push_up', qty: '20' },
  ]), { number: n + 1, format: 'AMRAP 45 min', intensity: 4 }));

// 30. Coach Ivan 03/09/24 Hyrox (5x8' AMRAP blocks)
add(plan('coach_ivan_030924_hyrox', 'Coach Ivan 03/09/24 Hyrox', null, [
  ...buildAmrap('coach_ivan_030924_hyrox', 480, [{ cat: 'rowing', qty: '100m' }, { cat: 'wall_ball', qty: '10 (9/6 kg)' }], 'Bloc 1 (8 min)'),
  ...buildAmrap('coach_ivan_030924_hyrox', 480, [{ cat: 'rowing', qty: '100m' }, { cat: 'burpee', qty: '10' }], 'Bloc 2 (8 min)'),
  ...buildAmrap('coach_ivan_030924_hyrox', 480, [{ cat: 'rowing', qty: '100m' }, { cat: 'pull_up', qty: '10' }], 'Bloc 3 (8 min)'),
  ...buildAmrap('coach_ivan_030924_hyrox', 480, [{ cat: 'rowing', qty: '100m' }, { cat: 'kettlebell_goblet_squat', qty: '10 (24/16 kg)' }], 'Bloc 4 (8 min)'),
  ...buildAmrap('coach_ivan_030924_hyrox', 480, [{ cat: 'rowing', qty: '100m' }, { cat: 'push_up', qty: '10' }], 'Bloc 5 (8 min)'),
], { number: n + 1, format: '5 x AMRAP 8 min', intensity: 4 }));

// 31. Coach Ivan 24/09/24 Hyrox (5x10' AMRAP blocks, I GO YOU GO)
add(plan('coach_ivan_240924_hyrox', 'Coach Ivan 24/09/24 Hyrox', null, [
  ...buildAmrap('coach_ivan_240924_hyrox', 600, [{ cat: 'rowing', qty: '10 cal' }, { cat: 'wall_ball', qty: '10' }, { cat: 'push_up', qty: '10' }], 'Bloc 1 (10 min)'),
  ...buildAmrap('coach_ivan_240924_hyrox', 600, [{ cat: 'rowing', qty: '10 cal' }, { cat: 'burpee', qty: '10' }, { cat: 'air_squat', qty: '10' }], 'Bloc 2 (10 min)'),
  ...buildAmrap('coach_ivan_240924_hyrox', 600, [{ cat: 'rowing', qty: '10 cal' }, { cat: 'sandbag_lunge', qty: '10m' }, { cat: 'pull_up', qty: '10' }], 'Bloc 3 (10 min)'),
  ...buildAmrap('coach_ivan_240924_hyrox', 600, [{ cat: 'rowing', qty: '10 cal' }, { cat: 'farmers_carry', qty: '10m' }, { cat: 'toes_to_bar', qty: '10' }], 'Bloc 4 (10 min)'),
  ...buildAmrap('coach_ivan_240924_hyrox', 600, [{ cat: 'rowing', qty: '10 cal' }, { cat: 'sled_push', qty: '10m' }, { cat: 'sled_pull', qty: '10m' }], 'Bloc 5 (10 min)'),
], { number: n + 1, format: '5 x AMRAP 10 min (I go, you go)', intensity: 4, type: 'mixte' }));

// 32. Death by Cardio (EMOM escalating, no fixed rounds -> 3-move cycle, treat as EMOM_SAME
// with a representative 12-round block since no fixed duration in source; user adjusts live).
add(plan('death_by_cardio', 'Death by Cardio', null,
  buildEmomRounds('death_by_cardio', 'Death by Cardio', repeatRound([
    { cat: 'rowing', qty: '10+ cal' }, { cat: 'skierg', qty: '10+ cal' },
    { cat: 'air_bike', qty: '10+ cal' }, { cat: 'rest', notes: 'Calories manquées = burpees de pénalité' },
  ], 6), 60), { number: n + 1, format: 'EMOM jusqu’à l’échec', intensity: 4 }));

// 33. Cardio Complex (4 rounds, descending distance per round)
add(plan('cardio_complex', 'Cardio Complex', null,
  buildMultiRound('cardio_complex', ladderRounds(
    [{ cat: 'rowing' }, { cat: 'air_bike' }, { cat: 'single_under' }],
    [
      ['1000m', '1.0 mile', '200'],
      ['750m', '0.8 mile', '150'],
      ['500m', '0.6 mile', '100'],
      ['250m', '0.4 mile', '50'],
    ],
  ), 'reps'), { number: n + 1, format: '4 Rounds For Time', intensity: 4, type: 'cardio' }));

// 34. Candy
add(plan('candy', 'Candy', null,
  buildMultiRound('candy', repeatRound([
    { cat: 'pull_up', qty: '20' }, { cat: 'push_up', qty: '40' }, { cat: 'air_squat', qty: '60' },
  ], 5), 'reps'), { number: n + 1, format: '5 Rounds For Time', intensity: 4 }));

// 35. CrossFit Open 26.1 (pyramid wall ball/box)
add(plan('open_26_1', 'CrossFit Open 26.1', null,
  buildMultiRound('open_26_1', [[
    { cat: 'wall_ball', qty: '20 (20/14 lb)' }, { cat: 'box_jump_over', qty: '18 (24/20 in)' },
    { cat: 'wall_ball', qty: '30' }, { cat: 'box_jump_over', qty: '18' },
    { cat: 'wall_ball', qty: '40' }, { cat: 'medball_box_step_over', qty: '18' },
    { cat: 'wall_ball', qty: '66' }, { cat: 'medball_box_step_over', qty: '18' },
    { cat: 'wall_ball', qty: '40' }, { cat: 'box_jump_over', qty: '18' },
    { cat: 'wall_ball', qty: '30' }, { cat: 'box_jump_over', qty: '18' },
    { cat: 'wall_ball', qty: '20' },
  ]], 'reps'), { number: n + 1, format: 'For Time (cap 12 min)', intensity: 4 }));

// 36. Mini Murph
add(plan('mini_murph', 'Mini Murph', null,
  [
    ...buildMultiRound('mini_murph', [[{ cat: 'run', qty: '400m' }]], 'reps'),
    ...buildMultiRound('mini_murph', repeatRound([
      { cat: 'pull_up', qty: '10' }, { cat: 'push_up', qty: '20' }, { cat: 'air_squat', qty: '30' },
    ], 5), 'reps'),
    ...buildMultiRound('mini_murph', [[{ cat: 'run', qty: '400m' }]], 'reps'),
  ], { number: n + 1, format: 'For Time', intensity: 3 }));

// 37. Elliott (descending burpee ladder + run each round)
add(plan('elliott', 'Elliott', null,
  buildMultiRound('elliott', ladderRounds(
    [{ cat: 'burpee' }, { cat: 'run' }],
    [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((v) => [v, '400m']),
  ), 'reps'), { number: n + 1, format: 'For Time (cap 35 min)', intensity: 4 }));

// 38. Sting (50-40-30-20-10 triple)
add(plan('sting', 'Sting', null,
  buildMultiRound('sting', ladderRounds(
    [{ cat: 'rowing' }, { cat: 'burpee' }, { cat: 'alternating_lunge' }],
    [[50, 50, 50], [40, 40, 40], [30, 30, 30], [20, 20, 20], [10, 10, 10]].map((t) => [`${t[0]} cal`, t[1], t[2]]),
  ), 'reps'), { number: n + 1, format: '50-40-30-20-10 (cap 45 min)', intensity: 4 }));

// 39. Time to Get Chipper
add(plan('time_to_get_chipper', 'Time to Get Chipper', null,
  buildMultiRound('time_to_get_chipper', [[
    { cat: 'air_squat', qty: '50' }, { cat: 'burpee', qty: '10' }, { cat: 'sit_up', qty: '40' },
    { cat: 'burpee', qty: '10' }, { cat: 'walking_lunge', qty: '30' }, { cat: 'burpee', qty: '10' },
    { cat: 'push_up', qty: '20' }, { cat: 'burpee', qty: '10' }, { cat: 'pull_up', qty: '10' },
    { cat: 'burpee', qty: '10' }, { cat: 'push_up', qty: '20' }, { cat: 'burpee', qty: '10' },
    { cat: 'walking_lunge', qty: '30' }, { cat: 'burpee', qty: '10' }, { cat: 'sit_up', qty: '40' },
    { cat: 'burpee', qty: '10' }, { cat: 'air_squat', qty: '50' },
  ]], 'reps'), { number: n + 1, format: 'For Time (Chipper)', intensity: 4 }));

// 40. Bare Cove Travel WOD 32
add(plan('bare_cove_travel_32', 'Bare Cove Travel WOD 32', null,
  buildAmrap('bare_cove_travel_32', 540, [
    { cat: 'sit_up', qty: '15' }, { cat: 'air_squat', qty: '10' }, { cat: 'burpee', qty: '5' },
  ]), { number: n + 1, format: 'AMRAP 9 min', intensity: 2 }));

// 41. Brock (300 cal chipper + EMOM burpee tax)
add(plan('brock', 'Brock', null,
  [
    ...buildMultiRound('brock', [[
      { cat: 'rowing', qty: '100 cal' }, { cat: 'skierg', qty: '100 cal' }, { cat: 'air_bike', qty: '100 cal' },
    ]], 'reps'),
  ].map((ex, i) => (i === 0 ? { ...ex, notes: 'Toutes les 2 minutes (à partir de la 2e min) : 7 Burpees en pénalité' } : ex)),
  { number: n + 1, format: 'For Time + taxe EMOM', intensity: 4 }));

// 42. The 555 Standard
add(plan('the_555_standard', 'The 555 Standard', null,
  buildMultiRound('the_555_standard', repeatRound([
    { cat: 'air_squat', qty: '15' }, { cat: 'burpee', qty: '15' }, { cat: 'hand_release_push_up', qty: '15' },
  ], 5), 'reps'), { number: n + 1, format: '5 Rounds For Time', intensity: 3 }));

// 43. Double Trouble
add(plan('double_trouble', 'Double Trouble', null,
  buildMultiRound('double_trouble', ladderRounds(
    [{ cat: 'air_bike' }, { cat: 'rowing' }],
    [[21, 21], [15, 15], [9, 9]].map((t) => [`${t[0]} cal`, `${t[1]} cal`]),
  ), 'reps'), { number: n + 1, format: '21-15-9 (calories)', intensity: 3 }));

// 44. Invisible Fran
add(plan('invisible_fran', 'Invisible Fran', null,
  buildMultiRound('invisible_fran', ladderRounds(
    [{ cat: 'air_squat' }, { cat: 'push_up' }],
    [[21, 21], [15, 15], [9, 9]],
  ), 'reps'), { number: n + 1, format: '21-15-9', intensity: 3 }));

// 45. Ship
add(plan('ship', 'Ship', null,
  buildMultiRound('ship', repeatRound([
    { cat: 'squat_clean', qty: '7 (185/135 lb)' }, { cat: 'burpee_box_jump', qty: '8 (36/30 in)' },
  ], 9), 'reps'), { number: n + 1, format: '9 Rounds For Time', intensity: 4 }));

// 46. Lucy
add(plan('lucy', 'Lucy', null,
  buildMultiRound('lucy', repeatRound([
    { cat: 'pull_up', qty: '5' }, { cat: 'burpee', qty: '10' }, { cat: 'run', qty: '400m' },
  ], 5), 'reps'), { number: n + 1, format: '5 Rounds For Time', intensity: 3 }));

// 47. Mind Games (50 identical micro-rounds)
add(plan('mind_games', 'Mind Games', null,
  buildMultiRound('mind_games', repeatRound([
    { cat: 'burpee', qty: '1' }, { cat: 'push_up', qty: '2' }, { cat: 'air_squat', qty: '3' },
    { cat: 'walking_lunge', qty: '4' }, { cat: 'sit_up', qty: '5' },
  ], 50), 'reps'), { number: n + 1, format: '50 Rounds For Time', intensity: 3 }));

// 48. Stimulus Travel WOD 7 (EMOM same, 15 rounds)
add(plan('stimulus_travel_7', 'Stimulus Travel WOD 7', null,
  buildEmomRounds('stimulus_travel_7', 'Stimulus Travel WOD 7', repeatRound([
    { cat: 'push_up', qty: '3' }, { cat: 'burpee', qty: '3' },
  ], 15), 60), { number: n + 1, format: 'EMOM 15 min', intensity: 2 }));

// 49. Hotel Workout 3
add(plan('hotel_workout_3', 'Hotel Workout 3', null,
  buildMultiRound('hotel_workout_3', ladderRounds(
    [{ cat: 'push_up' }, { cat: 'air_squat' }],
    [[50, 100], [40, 80], [30, 60], [20, 40], [10, 20]],
  ), 'reps'), { number: n + 1, format: 'For Time', intensity: 3 }));

// 50. Rocket
add(plan('rocket', 'Rocket', null,
  buildAmrap('rocket', 1800, [
    { cat: 'swim', qty: '50m' }, { cat: 'push_up', qty: '10' }, { cat: 'air_squat', qty: '15' },
  ]), { number: n + 1, format: 'AMRAP 30 min', intensity: 3, type: 'cardio' }));

// 51. The Eagle (8 rounds, KB front squat sandwiching farmer's carry, load carried throughout)
add(plan('the_eagle', 'The Eagle', null,
  buildMultiRound('the_eagle', repeatRound([
    { cat: 'kettlebell_front_squat', qty: '8 (2x24/12 kg)' },
    { cat: 'farmers_carry', qty: '20m (2x24/12 kg)' },
    { cat: 'kettlebell_front_squat', qty: '8 (2x24/12 kg)' },
  ], 8), 'reps'), { number: n + 1, format: '8 Rounds For Time', intensity: 3 }));

// 52. Bolger (sandbag carried throughout)
add(plan('bolger', 'Bolger', null,
  buildMultiRound('bolger', repeatRound([
    { cat: 'run', qty: '400m (avec sandbag 25/15 kg)' }, { cat: 'air_squat', qty: '25 (avec sandbag)' },
  ], 5), 'reps'), { number: n + 1, format: '5 Rounds For Time', intensity: 4 }));

// 53. The Coyote (20 rounds)
add(plan('the_coyote', 'The Coyote', null,
  buildMultiRound('the_coyote', repeatRound([
    { cat: 'kettlebell_swing_russian', qty: '15 (24/16 kg)' },
    { cat: 'kettlebell_goblet_squat', qty: '5 (24/16 kg)' }, { cat: 'push_up', qty: '3' },
  ], 20), 'reps'), { number: n + 1, format: '20 Rounds For Time', intensity: 4 }));

// 54. Nelson (5-station EMOM repeated 6x = 30 rounds)
{
  const cycle = [
    [{ cat: 'wall_ball', qty: '15 (20/14 lb)' }], [{ cat: 'burpee_broad_jump', qty: '10' }],
    [{ cat: 'skierg', qty: '15 cal' }], [{ cat: 'walking_lunge', qty: '20' }], [{ cat: 'rest' }],
  ];
  const rounds = [];
  for (let c = 0; c < 6; c++) cycle.forEach((r) => rounds.push(r));
  add(plan('nelson', 'Nelson', null,
    buildEmomRounds('nelson', 'Nelson', rounds, 60),
    { number: n + 1, format: 'EMOM 30 min', intensity: 3 }));
}

// 55. Cindy with a Twist
add(plan('cindy_with_a_twist', 'Cindy with a Twist', null,
  buildMultiRound('cindy_with_a_twist', repeatRound([
    { cat: 'rowing', qty: '20/15 cal' }, { cat: 'pull_up', qty: '5' },
    { cat: 'push_up', qty: '10' }, { cat: 'air_squat', qty: '15' },
  ], 20), 'reps'), { number: n + 1, format: '20 Rounds For Time', intensity: 4 }));

// 56. C2 Triathlon
add(plan('c2_triathlon', 'C2 Triathlon', null,
  buildMultiRound('c2_triathlon', [[
    { cat: 'bike_erg', qty: '6000m' }, { cat: 'rowing', qty: '4000m' }, { cat: 'skierg', qty: '2000m' },
  ]], 'reps'), { number: n + 1, format: 'For Time (cap 35 min)', intensity: 4, type: 'cardio' }));

// 57. The Swedish Mile (25 rounds)
add(plan('the_swedish_mile', 'The Swedish Mile', null,
  buildMultiRound('the_swedish_mile', repeatRound([
    { cat: 'burpee', qty: '10' }, { cat: 'run', qty: '100m' }, { cat: 'air_squat', qty: '10' },
    { cat: 'run', qty: '100m' }, { cat: 'push_up', qty: '10' }, { cat: 'run', qty: '100m' },
    { cat: 'sit_up', qty: '10' }, { cat: 'run', qty: '100m' },
  ], 25), 'reps'), { number: n + 1, format: '25 Rounds For Time', intensity: 4 }));

// 58. Hetfield (2 parts: strength then pyramid) -> part1 as 5 heavy rounds (reps), part2 as ladder
add(plan('hetfield', 'Hetfield', null, [
  ...buildMultiRound('hetfield', repeatRound([{ cat: 'back_squat', qty: '5 (charge croissante)' }], 5), 'reps'),
  ...buildMultiRound('hetfield', ladderRounds(
    [{ cat: 'skierg' }, { cat: 'air_squat' }, { cat: 'burpee' }],
    [[30, 30, 30], [20, 20, 20], [10, 10, 10], [20, 20, 20], [30, 30, 30]].map((t) => [`${t[0]} cal`, t[1], t[2]]),
  ), 'reps'),
], { number: n + 1, format: 'Force puis 30-20-10-20-30 (cap 30 min)', intensity: 4 }));

// 59. Shaky Legs
add(plan('shaky_legs', 'Shaky Legs', null,
  buildMultiRound('shaky_legs', [[
    { cat: 'wall_ball', qty: '50' }, { cat: 'run', qty: '800m' },
    { cat: 'wall_ball', qty: '50' }, { cat: 'run', qty: '800m' },
    { cat: 'wall_ball', qty: '50' }, { cat: 'run', qty: '800m' },
  ]], 'reps'), { number: n + 1, format: 'For Time', intensity: 3 }));

// 60. Hamilton
add(plan('hamilton', 'Hamilton', null,
  buildMultiRound('hamilton', repeatRound([
    { cat: 'rowing', qty: '1000m' }, { cat: 'push_up', qty: '50' },
    { cat: 'run', qty: '1000m' }, { cat: 'pull_up', qty: '50' },
  ], 3), 'reps'), { number: n + 1, format: '3 Rounds For Time', intensity: 4 }));

// 61. Aplin (20 rounds)
add(plan('aplin', 'Aplin', null,
  buildMultiRound('aplin', repeatRound([
    { cat: 'strict_pull_up', qty: '6' }, { cat: 'push_up', qty: '20' },
  ], 20), 'reps'), { number: n + 1, format: '20 Rounds For Time', intensity: 3 }));

// 62. Nash (3 x 10min EMOM blocks + 2min rest)
add(plan('nash', 'Nash', null, [
  ...buildEmomRounds('nash', 'Nash — bloc 1', repeatRound([{ cat: 'wall_ball', qty: '15 (20/14 lb)' }], 10), 60),
  restExercise('nash', 120),
  ...buildEmomRounds('nash', 'Nash — bloc 2', repeatRound([{ cat: 'burpee_broad_jump', qty: '10' }], 10), 60),
  restExercise('nash', 120),
  ...buildEmomRounds('nash', 'Nash — bloc 3', repeatRound([{ cat: 'rowing', qty: '12 cal' }], 10), 60),
], { number: n + 1, format: '3 x EMOM 10 min', intensity: 3 }));

// 63. Relentless (10 rounds)
add(plan('relentless', 'Relentless', null,
  buildMultiRound('relentless', repeatRound([
    { cat: 'rowing', qty: '20/16 cal' }, { cat: 'air_bike', qty: '20/16 cal' }, { cat: 'skierg', qty: '20/16 cal' },
  ], 10), 'reps'), { number: n + 1, format: '10 Rounds For Time', intensity: 4, type: 'cardio' }));

// 64. Paz (buy-in/buy-out AMRAP)
add(plan('paz', 'Paz', null, [
  ...buildMultiRound('paz', [[{ cat: 'run', qty: '1000m' }]], 'reps'),
  ...buildAmrap('paz', 1320, [
    { cat: 'air_squat', qty: '23' }, { cat: 'burpee', qty: '7' }, { cat: 'push_up', qty: '14' },
  ]),
  ...buildMultiRound('paz', [[{ cat: 'run', qty: '1000m' }]], 'reps'),
], { number: n + 1, format: 'Cash-in + AMRAP 22 min + Cash-out', intensity: 3 }));

// 65. Antenne GIGN Guyane (mirrored pyramid chipper)
add(plan('antenne_gign_guyane', 'Antenne GIGN Guyane Française', null,
  buildMultiRound('antenne_gign_guyane', [[
    { cat: 'run', qty: '2000m' }, { cat: 'pull_up', qty: '10' }, { cat: 'burpee', qty: '20' },
    { cat: 'abmat_sit_up', qty: '30' }, { cat: 'squat_jump', qty: '40' }, { cat: 'push_up', qty: '50' },
    { cat: 'squat_jump', qty: '40' }, { cat: 'abmat_sit_up', qty: '30' }, { cat: 'burpee', qty: '20' },
    { cat: 'pull_up', qty: '10' }, { cat: 'run', qty: '2000m' },
  ]], 'reps'), { number: n + 1, format: 'For Time', intensity: 4 }));

// 66. TK
add(plan('tk', 'TK', null,
  buildAmrap('tk', 1200, [
    { cat: 'strict_pull_up', qty: '8' }, { cat: 'box_jump', qty: '8 (36/30 in)' },
    { cat: 'kettlebell_swing_russian', qty: '12 (2/1.5 pood)' },
  ]), { number: n + 1, format: 'AMRAP 20 min', intensity: 3 }));

// 67. Stone
add(plan('stone', 'Stone', null,
  buildMultiRound('stone', repeatRound([
    { cat: 'rowing', qty: '400m' }, { cat: 'weighted_lunge', qty: '12' },
    { cat: 'sled_push', qty: '25m' }, { cat: 'sled_pull', qty: '25m' },
  ], 4), 'reps'), { number: n + 1, format: '4 Rounds For Time (cap 25 min)', intensity: 4 }));

// 68. East Atlanta Santa (6 rounds + 1min rest)
add(plan('east_atlanta_santa', 'East Atlanta Santa', null,
  buildRoundsWithRest('east_atlanta_santa', repeatRound([
    { cat: 'kettlebell_swing_american', qty: '25 (53/35 lb)' },
    { cat: 'kettlebell_goblet_squat', qty: '12 (53/35 lb)' }, { cat: 'rowing', qty: '250m' },
  ], 6), 60), { number: n + 1, format: '6 Rounds For Time', intensity: 3 }));

// 69. Union
add(plan('union', 'Union', null,
  buildAmrap('union', 720, [
    { cat: 'burpee', qty: '6' }, { cat: 'kettlebell_snatch', qty: '8 (24/16 kg)' }, { cat: 'walking_lunge', qty: '10' },
  ]), { number: n + 1, format: 'AMRAP 12 min', intensity: 3 }));

// 70. Partner 2 (10km partner chipper + 5-min EMOM tax)
add(plan('partner_2', 'Partner 2', null,
  buildMultiRound('partner_2', [[
    { cat: 'rowing', qty: '4000m' }, { cat: 'bike_erg', qty: '3000m' },
    { cat: 'skierg', qty: '2000m' }, { cat: 'run', qty: '1000m' },
  ]], 'reps', { }).map((ex, i) => (i === 0 ? {
    ...ex, notes: "Toutes les 5 minutes, chaque partenaire fait : 10 Burpees face à la barre, 10 Push Press (95/65 lb), 3 Muscle-Ups aux anneaux",
  } : ex)),
  { number: n + 1, format: 'For Time (Partenaire)', intensity: 4, type: 'mixte' }));

console.log(`Total workouts generated: ${plans.length}`);
const totalExercises = plans.reduce((a, p) => a + p.exercises.length, 0);
console.log(`Total exercise entries: ${totalExercises}`);

const unmatched = new Set();
for (const p of plans) {
  for (const ex of p.exercises) {
    if (ex.matchConfidence === 'unmatched') unmatched.add(ex.name);
  }
}
console.log(`Unmatched exercise names (no exerciseRecordId): ${unmatched.size}`);

fs.writeFileSync(path.join(__dirname, 'output', 'wod-library-generated.json'), JSON.stringify(plans, null, 2));
console.log('Written to scripts/output/wod-library-generated.json');
