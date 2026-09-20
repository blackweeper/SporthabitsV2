#!/usr/bin/env node
/**
 * Passe de normalisation ponctuelle sur `src/data/wod-library.ts` : retire les
 * charges/hauteurs de boîte des noms d'exercice et des `reps`, les reporte en
 * kg/cm dans les consignes, retire le "max" devant un mouvement — voir
 * `scripts/lib/wod-normalize.js`. Idempotent (relancer ne change plus rien).
 *
 * Usage (depuis frontend/) :
 *   node scripts/normalize-wod-library.js --dry-run   # rapport, n'écrit rien
 *   node scripts/normalize-wod-library.js             # réécrit le fichier
 *   node scripts/normalize-wod-library.js --check     # code 1 s'il resterait des changements
 */
const fs = require('fs');
const path = require('path');
const { normalizeWodPlans } = require('./lib/wod-normalize');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const check = args.includes('--check');

const file = path.join(__dirname, '..', 'src', 'data', 'wod-library.ts');
const src = fs.readFileSync(file, 'utf-8');
const marker = 'export const WOD_LIBRARY: Plan[] = ';
const at = src.indexOf(marker);
if (at < 0) throw new Error(`Marqueur introuvable dans ${file}`);

let header = src.slice(0, at + marker.length);
const bodyText = src.slice(at + marker.length).trim();
if (!bodyText.endsWith('];')) throw new Error('Fin de tableau inattendue (attendu "];").');
const plans = JSON.parse(bodyText.slice(0, -1));

const normalized = normalizeWodPlans(plans);

// --- rapport ---
let changedEntries = 0;
const nameChanges = new Map();
let repsChanged = 0;
let notesChanged = 0;
plans.forEach((p, pi) =>
  p.exercises.forEach((e, ei) => {
    const n = normalized[pi].exercises[ei];
    if (n.name !== e.name || n.reps !== e.reps || n.notes !== e.notes) changedEntries++;
    if (n.name !== e.name) nameChanges.set(`${e.name}\n   -> ${n.name}`, (nameChanges.get(`${e.name}\n   -> ${n.name}`) || 0) + 1);
    if (n.reps !== e.reps) repsChanged++;
    if (n.notes !== e.notes) notesChanged++;
  }),
);
console.log(`WODs: ${plans.length} | entrées modifiées: ${changedEntries} (noms: ${nameChanges.size} distincts, reps: ${repsChanged}, consignes: ${notesChanged})`);
if (dryRun) {
  for (const [k, c] of nameChanges) console.log(`[${c}x] ${k}`);
}

if (check) process.exit(changedEntries > 0 ? 1 : 0);
if (dryRun || changedEntries === 0) process.exit(0);

// --- en-tête : documente la règle (une seule fois) ---
const NOTE = ` * Normalisation (\`scripts/lib/wod-normalize.js\`) : ni le nom d'un exercice ni son
 * \`reps\` ne portent de charge ou de hauteur de boîte — elles sont reportées dans
 * les consignes (\`notes\`), converties en kg/cm ("Charge : 9/6 kg.", "Hauteur :
 * 60/50 cm."), pour que le nom corresponde à l'exercice de la bibliothèque. Un
 * "max" devant un mouvement ("max Traction") est retiré du nom (consigne
 * "maximum de répétitions").
 *
`;
if (!header.includes('wod-normalize.js')) {
  header = header.replace(' * Régénéré via', NOTE + ' * Régénéré via');
}

fs.writeFileSync(file, header + JSON.stringify(normalized, null, 2) + ';\n', 'utf-8');
console.log(`Écrit: ${file}`);
