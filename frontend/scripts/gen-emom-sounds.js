/**
 * Génère les deux bips du timer EMOM premium — synthèse pure (sinusoïde +
 * enveloppe attack/decay pour éviter les clics), aucune dépendance, aucun
 * fichier externe téléchargé :
 *   - emom-tick.wav   : bip bref et discret (décompte 3-2-1)
 *   - emom-chime.wav  : signal distinct et plus marqué (changement de minute)
 *
 * Usage (depuis frontend/) : node scripts/gen-emom-sounds.js
 */
const fs = require("node:fs");
const path = require("node:path");

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, "..", "assets", "sounds");

/** One sine "note": frequency (Hz), duration (s), peak amplitude (0-1),
 * with a short linear attack/release to avoid clicks. */
function renderNote(freqHz, durationSec, amplitude) {
  const n = Math.round(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  const attack = Math.min(n, Math.round(SAMPLE_RATE * 0.008));
  const release = Math.min(n, Math.round(SAMPLE_RATE * 0.02));
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > n - release) env = (n - i) / release;
    samples[i] = Math.sin(2 * Math.PI * freqHz * t) * amplitude * env;
  }
  return samples;
}

function concat(...parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function writeWav(filePath, floatSamples) {
  const numSamples = floatSamples.length;
  const byteRate = SAMPLE_RATE * 2; // mono, 16-bit
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log(`Écrit : ${filePath} (${(buffer.length / 1024).toFixed(1)} Ko)`);
}

// Tick — bref et discret, pour ne jamais couvrir l'effort en cours.
const tick = renderNote(880, 0.09, 0.35);

// Chime — deux notes ascendantes, plus marquées, pour signaler sans
// ambiguïté le changement de minute (distinct du tick au premier bip).
const chime = concat(
  renderNote(660, 0.09, 0.55),
  renderNote(990, 0.15, 0.6),
);

writeWav(path.join(OUT_DIR, "emom-tick.wav"), tick);
writeWav(path.join(OUT_DIR, "emom-chime.wav"), chime);
