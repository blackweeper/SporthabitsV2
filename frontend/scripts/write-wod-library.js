const fs = require('fs');
const path = require('path');

const plans = require('./output/wod-library-generated.json');

const header = `import { Plan } from '@/src/utils/gym-storage';

/**
 * Bibliothèque de WODs curés IronFlow — 70 benchmarks/hero WODs/Hyrox WOTW
 * transcrits depuis un export JSON fourni par l'utilisateur (catalogue de
 * 49 mouvements + 70 séances, \`workouts_normalized_fr.json\`).
 *
 * Convention d'encodage par format :
 * - AMRAP (y compris les WOD à blocs multiples type "5 x 8' AMRAP") -> une
 *   seule \`Exercise\` composite, \`mode:'amrap'\`, nom "AMRAP N min : mvt1 →
 *   mvt2 → ..." (même convention que \`composite-exercise.ts\`).
 * - EMOM -> nouveau moteur premium : une \`Exercise\` par round
 *   (\`mode:'emom'\`, \`sets:1\`, champ \`emomBlock\`) — affichage en direct de
 *   l'exercice/reps/consignes + vrais bips audio (\`EmomLiveOverlay\`).
 * - FOR_TIME / CHIPPER / échelles (ladders) -> round-robin réel (une
 *   \`Exercise\` par passage, \`mode:'reps'\`, \`sets:1\`, jamais \`sets:N\`),
 *   même convention que les circuits de \`starter-programs.ts\`.
 * - INTERVALS (blocs à durée fixe, repos compris) -> round-robin
 *   \`mode:'time'\`, même convention que les blocs cardio de "The Comeback".
 *
 * Correspondance vers la bibliothèque d'exercices réelle
 * (\`exerciseRecordId\`) : uniquement les mouvements à correspondance exacte
 * (nom ou alias identique dans \`exercise-library/versions/v3/exercises.json\`)
 * — jamais de lien approximatif. Le catalogue source contenait plusieurs
 * incohérences \`exercise_id\`/\`raw_movement_name\` (ex. "Goblet Squats" tagué
 * \`air_squat\`, "Dumbbell Rows" tagué \`rowing\`, "Sandbag Lunges" tagué
 * \`alternating_lunge\`...) — corrigées manuellement en se basant sur le nom
 * réel du mouvement, jamais sur l'id fourni par la source.
 *
 * Régénéré via \`scripts/build-wod-library.js\` (+ \`import-wod-json.js\`,
 * \`write-wod-library.js\`) — à relancer si une nouvelle liste de WODs arrive.
 */
export const WOD_LIBRARY: Plan[] = `;

const body = JSON.stringify(plans, null, 2);
const out = header + body + ';\n';

const dest = path.join(__dirname, '..', 'src', 'data', 'wod-library.ts');
fs.writeFileSync(dest, out, 'utf-8');
console.log('Written to', dest, `(${(out.length / 1024).toFixed(0)} KB, ${plans.length} plans)`);
