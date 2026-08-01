import { useCallback, useRef, useState } from "react";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import { getCustomExercises } from "@/src/utils/gym-storage";
import {
  ExerciseRecord,
  appendLibraryUpdateLogEntry,
  backupCurrentLibrary,
  getExerciseRecords,
  getLibraryMeta,
  replaceAllExerciseRecords,
  saveLibraryMeta,
} from "@/src/utils/exercise-records";
import {
  MigrationReport,
  buildMigratedLibrary,
  deriveSystemBaseline,
} from "@/src/utils/exercise-library-merge";
import { EXERCISE_LIBRARY_MANIFEST_URL } from "@/src/utils/exercise-library-source-config";

/**
 * Orchestrates a full library update: download → validate → backup →
 * merge → finalize. Nothing is written to storage until validation
 * succeeds, and the current library is snapshotted right before the merge
 * — so a network error or a corrupted file always leaves the existing
 * library completely untouched, and a bad merge can always be undone via
 * `restoreLibraryBackup` (src/utils/exercise-records.ts).
 */

export type UpdateStep = "checking" | "downloading" | "validating" | "merging" | "finalizing";
export type UpdatePhase = "idle" | UpdateStep | "done" | "error";
export type UpdateProgress = { step: UpdateStep; processed: number; total: number };

type Manifest = { version: number; generatedAt: string; count: number; exercisesUrl: string };

const CANCELLED = "__cancelled__";

function isValidManifest(x: unknown): x is Manifest {
  const m = x as Partial<Manifest> | null;
  return (
    !!m &&
    typeof m.version === "number" &&
    typeof m.count === "number" &&
    typeof m.exercisesUrl === "string"
  );
}

function isValidExerciseRecordArray(x: unknown): x is ExerciseRecord[] {
  return (
    Array.isArray(x) &&
    x.every(
      (r) => r && typeof r.id === "string" && typeof r.nameFr === "string" && typeof r.source === "string",
    )
  );
}

function resolveUrl(base: string, relativeOrAbsolute: string): string {
  try {
    return new URL(relativeOrAbsolute, base).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

export function useLibraryUpdate() {
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(null);
    setReport(null);
    setError(null);
  }, []);

  const checkForUpdate = useCallback(async (): Promise<
    { available: boolean; remoteVersion: number; remoteCount: number } | { error: string }
  > => {
    if (!EXERCISE_LIBRARY_MANIFEST_URL) {
      return { error: "Aucune source de mise à jour configurée pour l'instant." };
    }
    try {
      const res = await fetch(EXERCISE_LIBRARY_MANIFEST_URL);
      if (!res.ok) return { error: `Erreur réseau (${res.status}).` };
      const manifest = await res.json();
      if (!isValidManifest(manifest)) return { error: "Fichier de version invalide." };
      const meta = await getLibraryMeta();
      // Le seed local (`seedCoreLibraryIfNeeded`, 300 exercices) écrit le
      // même numéro de version que le manifeste distant complet (1348) —
      // les deux représentent des données différentes sous le même "3".
      // Une comparaison de version seule dirait donc à tort "déjà à jour"
      // tant qu'aucun exercice `collection_only` n'a jamais été fusionné en
      // local. On déclenche donc aussi le téléchargement si le catalogue
      // complet n'est tout simplement pas encore présent, peu importe le
      // numéro de version.
      const existing = await getExerciseRecords();
      const hasFullCatalog = existing.some((r) => r.exerciseTier === "collection_only");
      return {
        available: manifest.version > meta.version || !hasFullCatalog,
        remoteVersion: manifest.version,
        remoteCount: manifest.count,
      };
    } catch {
      return { error: "Impossible de contacter la source de mise à jour (réseau)." };
    }
  }, []);

  const runUpdate = useCallback(async () => {
    if (!EXERCISE_LIBRARY_MANIFEST_URL) {
      setError("Aucune source de mise à jour configurée pour l'instant.");
      setPhase("error");
      return;
    }
    const manifestUrl = EXERCISE_LIBRARY_MANIFEST_URL;

    cancelledRef.current = false;
    setError(null);
    setReport(null);

    let attemptedVersion: number | null = null;

    try {
      setPhase("downloading");
      setProgress({ step: "downloading", processed: 0, total: 1 });
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) throw new Error(`Erreur réseau (${manifestRes.status}).`);
      const manifest = await manifestRes.json();
      if (!isValidManifest(manifest)) throw new Error("Fichier de version invalide (manifest).");
      attemptedVersion = manifest.version;
      if (cancelledRef.current) throw new Error(CANCELLED);

      const exercisesUrl = resolveUrl(manifestUrl, manifest.exercisesUrl);
      const exercisesRes = await fetch(exercisesUrl);
      if (!exercisesRes.ok) throw new Error(`Erreur réseau (${exercisesRes.status}).`);
      const incomingRaw = await exercisesRes.json();
      if (cancelledRef.current) throw new Error(CANCELLED);

      setPhase("validating");
      setProgress({ step: "validating", processed: 0, total: manifest.count });
      if (!isValidExerciseRecordArray(incomingRaw)) {
        throw new Error("Fichier d'exercices corrompu ou incomplet.");
      }
      // No per-record media URL rewriting needed here anymore — the media
      // resolver (src/hooks/useExerciseMedia.ts) computes absolute media
      // URLs itself, purely from the exercise id and EXERCISE_LIBRARY_MANIFEST_URL,
      // never from a stored `media.primaryImage.remoteUrl` (vestigial field).
      const incoming = incomingRaw;
      if (cancelledRef.current) throw new Error(CANCELLED);

      // Nothing destructive has happened yet — safe to snapshot now.
      await backupCurrentLibrary();

      setPhase("merging");
      setProgress({ step: "merging", processed: 0, total: incoming.length });
      const [existingAll, customExercises] = await Promise.all([
        getExerciseRecords(),
        getCustomExercises(),
      ]);
      const baseline =
        existingAll.length > 0
          ? existingAll.filter((r) => r.source !== "custom")
          : deriveSystemBaseline(EXERCISE_LIBRARY);
      const { merged, report: migrationReport } = buildMigratedLibrary(
        baseline,
        customExercises,
        incoming,
      );
      setProgress({ step: "merging", processed: incoming.length, total: incoming.length });
      if (cancelledRef.current) throw new Error(CANCELLED);

      setPhase("finalizing");
      setProgress({ step: "finalizing", processed: 0, total: 1 });
      await replaceAllExerciseRecords(merged);
      const now = new Date().toISOString();
      await saveLibraryMeta({
        version: manifest.version,
        lastUpdatedAt: now,
        exerciseCount: merged.length,
      });
      await appendLibraryUpdateLogEntry({
        version: manifest.version,
        date: now,
        addedCount: migrationReport.addedCount,
        replacedCount: migrationReport.replacedCount,
        warningsCount: migrationReport.warnings.length,
        status: "success",
      });

      setProgress({ step: "finalizing", processed: 1, total: 1 });
      setReport(migrationReport);
      setPhase("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      if (message === CANCELLED) {
        reset();
        return;
      }
      setError(message);
      setPhase("error");
      const meta = await getLibraryMeta().catch(() => null);
      await appendLibraryUpdateLogEntry({
        version: attemptedVersion ?? meta?.version ?? 0,
        date: new Date().toISOString(),
        addedCount: 0,
        replacedCount: 0,
        warningsCount: 0,
        status: "error",
        errorMessage: message,
      }).catch(() => {});
    }
  }, [reset]);

  return { phase, progress, report, error, checkForUpdate, runUpdate, cancel, reset };
}
