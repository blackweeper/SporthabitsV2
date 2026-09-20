/**
 * Normalisation de la bibliothèque de WODs (`src/data/wod-library.ts`) :
 * retire des noms d'exercice et des champs `reps` les charges/hauteurs de
 * boîte (ex. "15 (20/14 lb) Wall Balls", `reps: "4 (20/14 lb)"`), pour que
 * l'exercice affiché corresponde à celui de la bibliothèque, et les reporte en
 * clair dans les consignes (`notes`), converties en kg (charges) et en cm
 * (hauteurs de boîte). Retire aussi le "max" qui précède un mouvement
 * ("max Traction" -> "Traction") en le reportant dans les consignes.
 *
 * Module pur (aucune E/S) : réutilisé par `normalize-wod-library.js` (passe
 * ponctuelle sur le fichier existant) et par `write-wod-library.js` (pour qu'une
 * régénération depuis la source JSON ne réintroduise pas les charges dans les
 * noms). Idempotent : une entrée déjà normalisée ressort inchangée.
 */

// Équivalents usuels (haltérophilie/CrossFit) plutôt qu'une conversion brute :
// 20/14 lb -> 9/6 kg, 53/35 lb -> 24/16 kg, 185/135 lb -> 84/61 kg...
const LB_TO_KG = {
  14: 6, 20: 9, 25: 11, 30: 14, 35: 16, 40: 18, 45: 20, 50: 22.5, 53: 24,
  55: 25, 60: 27, 65: 29, 70: 32, 95: 43, 135: 61, 185: 84,
};
// Paires dont l'équivalent diffère de la conversion valeur par valeur : 35 lb vaut
// 16 kg pour une kettlebell (53/35 lb -> 24/16 kg) mais 15 kg pour un haltère
// (50/35 lb -> 22,5/15 kg).
const LB_PAIR_TO_KG = { '50/35': [22.5, 15] };
const POOD_TO_KG = { 1: 16, 1.5: 24, 2: 32 };
// Hauteurs de boîte : arrondies aux 5 cm usuels (24/20 in -> 60/50 cm).
const IN_TO_CM = { 20: 50, 24: 60, 30: 75, 36: 90 };

const NUM = String.raw`\d+(?:[.,]\d+)?`;
// "(20/14 lb)", "(24/16 kg)", "(2x24/12 kg)", "(2x30 lb)", "(2/1.5 pood)", "(36/30 in)"
const SPEC_INNER = new RegExp(
  String.raw`^(?:(\d+)\s*x\s*)?(${NUM})(?:\s*\/\s*(${NUM}))?\s*(lbs?|kg|pood|in)$`,
  'i',
);
const SPEC_PAREN_G = new RegExp(
  String.raw`\(\s*(?:\d+\s*x\s*)?${NUM}(?:\s*\/\s*${NUM})?\s*(?:lbs?|kg|pood|in)\s*\)`,
  'gi',
);
// Annotations libres à reporter telles quelles dans les consignes.
const ANNOTATION_PAREN = /\((avec sandbag[^)]*|charge croissante)\)/gi;
// Conversion de distance redondante, simplement retirée.
const DROP_PAREN = /\s*\(\d+(?:[.,]\d+)?\s*miles?\)/gi;

const num = (s) => parseFloat(String(s).replace(',', '.'));
const fmt = (n) => String(n).replace('.', ',');

function convertOne(value, unit) {
  const u = unit.toLowerCase();
  if (u === 'kg') return value;
  const table = u === 'pood' ? POOD_TO_KG : u === 'in' ? IN_TO_CM : LB_TO_KG;
  if (!(value in table)) {
    throw new Error(`wod-normalize: pas d'équivalent pour ${value} ${unit} — ajouter la valeur à la table.`);
  }
  return table[value];
}

/** "20/14 lb" -> { kind: 'weight', text: '9/6 kg' } ; "24/20 in" -> { kind: 'height', text: '60/50 cm' }. */
function convertSpec(inner) {
  const m = inner.trim().match(SPEC_INNER);
  if (!m) throw new Error(`wod-normalize: spécification illisible « ${inner} »`);
  const [, count, a, b, unit] = m;
  const pair = b && unit.toLowerCase().startsWith('lb') ? LB_PAIR_TO_KG[`${num(a)}/${num(b)}`] : null;
  const values = (pair ?? [a, b].filter(Boolean).map((v) => convertOne(num(v), unit))).map(fmt);
  const isHeight = unit.toLowerCase() === 'in';
  const text = `${count ? `${count} x ` : ''}${values.join('/')} ${isHeight ? 'cm' : 'kg'}`;
  return { kind: isHeight ? 'height' : 'weight', text };
}

/** Convertit en place toutes les "(…lb/in/pood)" d'un texte libre (consignes). */
function convertSpecsInText(text) {
  return text.replace(SPEC_PAREN_G, (whole) => `(${convertSpec(whole.slice(1, -1)).text})`);
}

// Quantité en tête d'un segment ("15 ", "250m ", "20 cal ", "10+ cal ", "30/20 cal ", "1 min ",
// "5-10-15-20-25 cal ") — DOIT rester alignée sur `composite-exercise.ts`.
const QTY = new RegExp(
  String.raw`^(?:${NUM})(?:[-–/+]${NUM})*\+?[a-zA-Zàéèê]*(?:\s+(?:cal|min|sec)\b)?\s+`,
  'i',
);
const stripQty = (s) => s.replace(QTY, '').trim();

function splitSpecs(segment) {
  const specs = [];
  const annotations = [];
  let rest = segment.replace(SPEC_PAREN_G, (whole) => {
    specs.push(convertSpec(whole.slice(1, -1)));
    return ' ';
  });
  rest = rest.replace(ANNOTATION_PAREN, (_, inner) => {
    annotations.push(inner.trim());
    return ' ';
  });
  rest = rest.replace(DROP_PAREN, '').replace(/\s{2,}/g, ' ').trim();
  return { rest, specs, annotations };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Normalise une entrée d'exercice (immuable : retourne une copie). */
function normalizeExercise(ex) {
  const loads = []; // { move: string|null, kind: 'weight'|'height'|'annotation', text }
  const maxMoves = [];
  let name = ex.name;

  if (name.includes('→')) {
    // Échelles ("5→10→15→20→25 cal Rameur") : la flèche n'est pas un séparateur de
    // mouvements, on la remplace par un tiret pour ne pas fabriquer de faux segments.
    name = name.replace(/(?<=\d)\s*→\s*(?=\d)/g, '-');
    const parts = name.split('→').map((p) => p.trim());
    const out = parts.map((part, i) => {
      let prefix = '';
      let body = part;
      if (i === 0) {
        const colon = part.indexOf(' : ');
        if (colon >= 0) {
          prefix = part.slice(0, colon + 3);
          body = part.slice(colon + 3).trim();
        }
      }
      const { rest, specs, annotations } = splitSpecs(body);
      let cleaned = rest;
      const mx = cleaned.match(/^max\s+(.+)$/i);
      let move = stripQty(cleaned);
      if (mx) {
        cleaned = mx[1].trim();
        move = stripQty(cleaned);
        maxMoves.push(move);
      }
      for (const s of specs) loads.push({ move, kind: s.kind, text: s.text });
      for (const a of annotations) loads.push({ move, kind: 'annotation', text: a });
      return prefix + cleaned;
    });
    name = out.join(' → ');
  } else {
    const { rest, specs, annotations } = splitSpecs(name);
    name = rest;
    for (const s of specs) loads.push({ move: null, kind: s.kind, text: s.text });
    for (const a of annotations) loads.push({ move: null, kind: 'annotation', text: a });
  }

  let reps = ex.reps;
  if (typeof reps === 'string' && /\(/.test(reps)) {
    const { rest, specs, annotations } = splitSpecs(reps);
    reps = rest.replace(/\s*\/\s*/g, '/').replace(/\/+$/, '').trim();
    // Le nom composite porte déjà les charges de chaque mouvement : ne pas les dupliquer.
    if (loads.length === 0) {
      for (const s of specs) loads.push({ move: null, kind: s.kind, text: s.text });
      for (const a of annotations) loads.push({ move: null, kind: 'annotation', text: a });
    }
  }

  // --- consignes ---
  const parts = [];
  let notes = typeof ex.notes === 'string' ? convertSpecsInText(ex.notes) : null;
  if (notes) parts.push(notes);

  const seen = new Set();
  const unique = loads.filter((l) => {
    const k = `${l.move}|${l.kind}|${l.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return !(notes && notes.includes(l.text)); // déjà présent dans la consigne (converti en place)
  });
  if (unique.length > 0) {
    if (name.includes('→')) {
      const items = unique.map((l) => {
        const label = l.move ? `${l.move} ` : '';
        return l.kind === 'height' ? `${label}hauteur ${l.text}` : `${label}${l.text}`;
      });
      parts.push(`Charges : ${items.join(' · ')}.`);
    } else {
      for (const l of unique) {
        if (l.kind === 'weight') parts.push(`Charge : ${l.text}.`);
        else if (l.kind === 'height') parts.push(`Hauteur : ${l.text}.`);
        else parts.push(`${cap(l.text)}.`);
      }
    }
  }
  for (const m of maxMoves) parts.push(`${m} : maximum de répétitions à chaque tour.`);

  const finalNotes = parts.length > 0 ? parts.join(' ') : null;
  return { ...ex, name, reps, notes: finalNotes ?? ex.notes ?? null };
}

function normalizeWodPlans(plans) {
  return plans.map((p) => ({ ...p, exercises: p.exercises.map(normalizeExercise) }));
}

module.exports = { normalizeExercise, normalizeWodPlans, convertSpec, convertSpecsInText, stripQty };
