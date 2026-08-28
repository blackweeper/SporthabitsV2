import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { RadioStation } from "@/src/data/radio-stations";
import { registerStationClick } from "@/src/utils/radio-browser";

/**
 * Lecteur radio global — un seul `AudioPlayer` (expo-audio, déjà utilisé pour
 * les bips EMOM ; sur web son backend est un `<audio>` HTML natif, exactement
 * ce que la demande précise) monté une seule fois dans un Context à la racine
 * de l'app (`app/_layout.tsx`). Comme le Provider entoure tout le `<Stack>`,
 * il ne démonte/remonte jamais au fil de la navigation entre écrans — la
 * lecture continue donc naturellement en arrière-plan, sans plomberie
 * spécifique de "garder en vie" à écrire.
 *
 * `expo-audio` n'expose aucun champ d'erreur direct sur le statut de lecture
 * (`AudioStatus` n'a pas de `error`) — un flux mort/hors-ligne se traduit par
 * "jamais `playing:true`". D'où le minuteur de connexion : si la lecture n'a
 * pas démarré sous `CONNECT_TIMEOUT_MS`, on bascule en état d'erreur plutôt
 * que de laisser l'UI en "connexion..." indéfiniment.
 */

export type RadioPlayerStatus = "idle" | "connecting" | "playing" | "paused" | "error";

type RadioPlayerContextValue = {
  station: RadioStation | null;
  status: RadioPlayerStatus;
  volume: number;
  errorMessage: string | null;
  play: (station: RadioStation) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
};

const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null);

const CONNECT_TIMEOUT_MS = 9000;

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // expo-audio (web) fires one `playing:true` status update as soon as
  // `.play()` is called, from the browser's native "play" event — which
  // fires on playback INTENT, not on confirmed data flow. A dead/offline
  // stream still gets this one event, then nothing ever again (no more
  // `ontimeupdate`, since no data is actually decoding). So the first event
  // is never trusted on its own; only once `currentTime` has genuinely
  // advanced past a previous reading do we treat the connection as real.
  const progressRef = useRef<{ seen: boolean; lastTime: number }>({ seen: false, lastTime: -1 });
  const [station, setStation] = useState<RadioStation | null>(null);
  const [status, setStatus] = useState<RadioPlayerStatus>("idle");
  const [volume, setVolumeState] = useState(0.85);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const teardownPlayer = useCallback(() => {
    clearConnectTimeout();
    if (subRef.current) {
      try {
        subRef.current.remove();
      } catch {
        // ignore
      }
      subRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // ignore
      }
      try {
        playerRef.current.remove();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
  }, [clearConnectTimeout]);

  const armConnectTimeout = useCallback(() => {
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      setStatus((prev) => {
        if (prev === "playing") return prev;
        setErrorMessage("Cette station ne répond pas. Essaie-en une autre.");
        teardownPlayer();
        return "error";
      });
    }, CONNECT_TIMEOUT_MS);
  }, [clearConnectTimeout, teardownPlayer]);

  const play = useCallback(
    (next: RadioStation) => {
      teardownPlayer();
      setErrorMessage(null);
      setStation(next);
      setStatus("connecting");
      progressRef.current = { seen: false, lastTime: -1 };

      let player: AudioPlayer;
      try {
        player = createAudioPlayer({ uri: next.streamUrl });
      } catch {
        setStatus("error");
        setErrorMessage("Impossible de charger cette station.");
        return;
      }
      playerRef.current = player;
      try {
        // Sur web, le shim `expo-audio` peut rejeter une écriture de volume
        // avant que l'élément média sous-jacent ne soit prêt ("non-finite
        // value") — non bloquant, `setVolume`/le prochain `playbackStatusUpdate`
        // rattrapent le volume voulu de toute façon.
        player.volume = Number.isFinite(volume) ? volume : 1;
      } catch {
        // ignore
      }
      subRef.current = player.addListener("playbackStatusUpdate", (s) => {
        if (!s.playing) return;
        const p = progressRef.current;
        if (!p.seen) {
          // First "playing" event — could be the spurious one fired on mere
          // play intent (see comment on `progressRef`). Record it but don't
          // trust it yet.
          p.seen = true;
          p.lastTime = s.currentTime;
          return;
        }
        if (s.currentTime > p.lastTime) {
          clearConnectTimeout();
          setStatus("playing");
        }
        p.lastTime = s.currentTime;
      });
      armConnectTimeout();
      try {
        player.play();
      } catch {
        clearConnectTimeout();
        setStatus("error");
        setErrorMessage("Impossible de lancer la lecture de cette station.");
        return;
      }
      registerStationClick(next.stationuuid);
    },
    [armConnectTimeout, clearConnectTimeout, teardownPlayer, volume],
  );

  const pause = useCallback(() => {
    clearConnectTimeout();
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // ignore
      }
    }
    setStatus("paused");
  }, [clearConnectTimeout]);

  const resume = useCallback(() => {
    if (!playerRef.current || !station) return;
    setStatus("connecting");
    setErrorMessage(null);
    armConnectTimeout();
    try {
      playerRef.current.play();
    } catch {
      clearConnectTimeout();
      setStatus("error");
      setErrorMessage("Impossible de reprendre la lecture.");
    }
  }, [armConnectTimeout, clearConnectTimeout, station]);

  const stop = useCallback(() => {
    teardownPlayer();
    setStation(null);
    setStatus("idle");
    setErrorMessage(null);
  }, [teardownPlayer]);

  const setVolume = useCallback((v: number) => {
    if (!Number.isFinite(v)) return;
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (playerRef.current) {
      try {
        playerRef.current.volume = clamped;
      } catch {
        // ignore — voir le commentaire équivalent dans `play()`
      }
    }
  }, []);

  useEffect(() => {
    // Les flux radio doivent sortir même en mode silencieux iOS — même
    // convention déjà établie pour les bips EMOM (`timer-sound.ts`).
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Ne nettoie qu'au démontage du Provider racine lui-même (jamais en
  // pratique, il entoure tout le `<Stack>`) — surtout pas à chaque
  // changement d'écran, ce qui casserait la lecture en arrière-plan.
  useEffect(() => () => teardownPlayer(), [teardownPlayer]);

  return (
    <RadioPlayerContext.Provider
      value={{ station, status, volume, errorMessage, play, pause, resume, stop, setVolume }}
    >
      {children}
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayer(): RadioPlayerContextValue {
  const ctx = useContext(RadioPlayerContext);
  if (!ctx) throw new Error("useRadioPlayer must be used within a RadioPlayerProvider");
  return ctx;
}
