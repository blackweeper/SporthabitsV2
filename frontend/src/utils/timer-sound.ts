import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * Vrais bips (tonalités, pas de synthèse vocale) pour le nouveau moteur EMOM
 * premium — voir `EmomLiveOverlay`. Distinct de `audio.ts` (voix `expo-speech`,
 * utilisée par le chemin EMOM historique, jamais modifié). Deux sons courts
 * générés par `scripts/gen-emom-sounds.js` (aucun téléchargement externe).
 */

let tickPlayer: AudioPlayer | null = null;
let chimePlayer: AudioPlayer | null = null;
let audioModeConfigured = false;

async function ensureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    // Les bips doivent sortir même si l'iPhone est en mode silencieux —
    // comportement attendu d'un timer d'intervalle.
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // Non bloquant (ex. web n'a pas de notion de mode silencieux natif).
  }
}

function getTickPlayer(): AudioPlayer {
  if (!tickPlayer) {
    tickPlayer = createAudioPlayer(require("../../assets/sounds/emom-tick.wav"));
  }
  return tickPlayer;
}

function getChimePlayer(): AudioPlayer {
  if (!chimePlayer) {
    chimePlayer = createAudioPlayer(require("../../assets/sounds/emom-chime.wav"));
  }
  return chimePlayer;
}

function replay(player: AudioPlayer) {
  try {
    player.seekTo(0).finally(() => player.play());
  } catch {
    // Lecture audio indisponible (permissions, environnement de test...) —
    // ne jamais faire échouer le timer pour un bip manqué.
  }
}

/** Bip bref et discret — décompte 3, 2, 1. */
export function playCountdownTick() {
  void ensureAudioMode();
  if (Platform.OS === "web") {
    // Comme pour expo-speech (voir audio.ts), la lecture web doit suivre un
    // vrai geste utilisateur récent — la séance est toujours lancée par un
    // tap, donc déjà dans la bonne fenêtre ; le setTimeout(0) évite un souci
    // de timing sur le tout premier appel juste après ce geste.
    setTimeout(() => replay(getTickPlayer()), 0);
    return;
  }
  replay(getTickPlayer());
}

/** Signal distinct et plus marqué — changement de minute. */
export function playRoundChime() {
  void ensureAudioMode();
  if (Platform.OS === "web") {
    setTimeout(() => replay(getChimePlayer()), 0);
    return;
  }
  replay(getChimePlayer());
}
