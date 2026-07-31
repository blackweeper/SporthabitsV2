/**
 * Phase 2 (local IA plan) — same enrichment pipeline as
 * `enrich-library-content.ts`, but calling a local Ollama model instead of
 * the (paid) Claude API. Free, fully offline once the model is pulled. See
 * `scripts/lib/enrichment-shared.ts` for the prompt, schema, completeness
 * check, quality scoring, and merge logic shared with the Claude version —
 * this file only differs in how it actually calls a model.
 *
 * Prerequisite: Ollama installed and running (`ollama serve`, or the
 * auto-started service depending on your install), with a model pulled,
 * e.g. `ollama pull mistral`. See exercise-library/README.md.
 *
 * Usage (from frontend/):
 *   node --env-file=.env -r ts-node/register scripts/enrich-library-content-ollama.ts \
 *     [--limit=20] [--ids=wx_0001,wx_0002] [--locale=fr] [--batch-size=5] \
 *     [--model=mistral] [--ollama-url=http://localhost:11434] \
 *     [--priority=popularity] [--dry-run]
 *
 * --dry-run    Generates and prints the fiches (with real time/token
 *              metrics) without writing anything to disk — the mode used
 *              for the mandatory 20-representative-exercise validation
 *              pass before any full run.
 * --ids        Comma-separated explicit ExerciseRecord ids — hand-pick a
 *              representative sample instead of taking the default order.
 * --limit      Caps how many (still-incomplete) exercises are processed.
 * --priority=popularity  Sorts candidates by WorkoutX's own
 *              `raw.popularityRank` (descending) first, then by a small
 *              list of foundational-movement keywords, then the rest — has
 *              no effect when `--ids` is set. Meant for the real progressive
 *              rollout (Phase 5), not the representative test (Phase 3).
 *
 * Writes directly into the CURRENT official version's exercises.json, same
 * as the Claude script: rewritten after every batch (never only at the
 * end), a timestamped backup written once before the first write, resumes
 * automatically on a later run (already-complete fiches cost 0 calls).
 *
 * Skip rules (checked before anything else, in this order):
 *  1. `record.source !== "workoutx"` — system/custom records are untouched.
 *  2. `record.enrichment.verifiedBy` is "human" or "coach" — never touched
 *     again, regardless of `templateVersion`. Absolute rule.
 *  3. The requested locale's required fields are already all filled — no
 *     regeneration, 0 calls, per-field (not per-exercise) incremental.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord, ExerciseEnrichment } from "../src/utils/exercise-records";
import {
  GeneratedFiche,
  ENRICHMENT_JSON_SCHEMA,
  FOUNDATIONAL_MOVEMENT_KEYWORDS,
  buildSystemPrompt,
  buildUserPrompt,
  isEnrichmentComplete,
  mergeEnrichment,
  validateGenerated,
} from "./lib/enrichment-shared";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** No rate limiting needed — this is localhost. A generous retry budget
 * covers the one real local-model failure mode: malformed/incomplete JSON
 * despite the imposed schema (more common on smaller quantized models),
 * and the occasional connection hiccup while Ollama is loading the model
 * into memory on the first call. */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (attempt === attempts) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) throw lastErr;
    }
    await sleep(1000 * attempt);
  }
  throw lastErr;
}

type OllamaChatResponse = {
  message: { role: string; content: string };
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
};

async function callOllama(
  ollamaUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ fiche: GeneratedFiche; promptTokens: number; outputTokens: number; durationMs: number }> {
  const res = await fetchWithRetry(
    `${ollamaUrl}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        format: ENRICHMENT_JSON_SCHEMA,
        stream: false,
        options: { temperature: 0 },
      }),
    },
    3,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  let fiche: GeneratedFiche;
  try {
    fiche = JSON.parse(data.message.content) as GeneratedFiche;
  } catch {
    throw new Error("réponse Ollama non-JSON malgré le schéma imposé");
  }
  validateGenerated(fiche);

  return {
    fiche,
    promptTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
    durationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : 0,
  };
}

function isFoundational(record: ExerciseRecord): boolean {
  const name = (record.nameEn ?? record.nameFr ?? "").toLowerCase();
  return FOUNDATIONAL_MOVEMENT_KEYWORDS.some((k) => name.includes(k));
}

function sortByPriority(records: ExerciseRecord[]): ExerciseRecord[] {
  return records.slice().sort((a, b) => {
    const rankA = (a.raw as Record<string, unknown> | null)?.popularityRank as number | undefined;
    const rankB = (b.raw as Record<string, unknown> | null)?.popularityRank as number | undefined;
    if ((rankA ?? 0) !== (rankB ?? 0)) return (rankB ?? 0) - (rankA ?? 0);
    const foundA = isFoundational(a);
    const foundB = isFoundational(b);
    if (foundA !== foundB) return foundA ? -1 : 1;
    return 0;
  });
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}min`;
}

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");
  const locale = args.find((a) => a.startsWith("--locale="))?.split("=")[1] ?? "fr";
  const model = args.find((a) => a.startsWith("--model="))?.split("=")[1] ?? "mistral";
  const ollamaUrl = args.find((a) => a.startsWith("--ollama-url="))?.split("=")[1] ?? DEFAULT_OLLAMA_URL;
  const batchSize = parseInt(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? "5", 10);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
  const idsArg = args.find((a) => a.startsWith("--ids="));
  const explicitIds = idsArg ? new Set(idsArg.split("=")[1].split(",").map((s) => s.trim())) : null;
  const priority = args.find((a) => a.startsWith("--priority="))?.split("=")[1] ?? null;

  const currentPath = "../exercise-library/current.json";
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable — aucune version officielle publiée.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  const candidates = exercises.filter((r) => {
    if (r.source !== "workoutx") return false;
    if (r.enrichment?.verifiedBy === "human" || r.enrichment?.verifiedBy === "coach") return false;
    if (explicitIds && !explicitIds.has(r.id)) return false;
    return true;
  });

  const alreadyComplete = candidates.filter((r) => isEnrichmentComplete(r.enrichment, locale)).length;
  let toProcess = candidates.filter((r) => !isEnrichmentComplete(r.enrichment, locale));
  if (priority === "popularity" && !explicitIds) toProcess = sortByPriority(toProcess);
  if (limit != null) toProcess = toProcess.slice(0, limit);

  console.log(`Bibliothèque : ${exercises.length} exercice(s), version ${current.version}.`);
  console.log(`Candidats (source workoutx, non verrouillés humain/coach) : ${candidates.length}`);
  console.log(`  déjà complets (locale "${locale}") : ${alreadyComplete} — ignorés, 0 appel Ollama`);
  console.log(`  à traiter cette exécution : ${toProcess.length}${limit != null ? ` (--limit=${limit})` : ""}`);
  console.log(`Modèle : ${model} (${ollamaUrl})${dryRun ? " — DRY RUN (aucune écriture disque)" : ""}\n`);

  if (toProcess.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  if (!dryRun) {
    const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
    copyFileSync(exercisesPath, backupPath);
    console.log(`Sauvegarde créée : ${backupPath}\n`);
  }

  const systemPrompt = buildSystemPrompt();
  const startedAt = Date.now();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let totalPromptTokens = 0;
  let totalOutputTokens = 0;
  const errors: string[] = [];
  const samples: { id: string; nameFr: string; enrichment: ExerciseEnrichment }[] = [];

  for (const record of toProcess) {
    processed++;
    try {
      const userPrompt = buildUserPrompt(record);
      const { fiche, promptTokens, outputTokens } = await callOllama(ollamaUrl, model, systemPrompt, userPrompt);

      totalPromptTokens += promptTokens;
      totalOutputTokens += outputTokens;

      const nextEnrichment = mergeEnrichment(record.enrichment, fiche, locale, "ollama");
      record.enrichment = nextEnrichment;
      succeeded++;
      samples.push({ id: record.id, nameFr: record.nameFr, enrichment: nextEnrichment });
    } catch (err) {
      failed++;
      errors.push(`${record.nameFr} (${record.id}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (processed % batchSize === 0 || processed === toProcess.length) {
      if (!dryRun) writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2), "utf-8");
      const elapsedSoFar = (Date.now() - startedAt) / 1000;
      console.log(
        `[${processed}/${toProcess.length}] traités · ${succeeded} réussis · ${failed} erreurs · ` +
          `${formatDuration(elapsedSoFar)} écoulées${dryRun ? " (dry-run, non écrit)" : ""}`,
      );
    }
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;

  console.log(`\n=== Rapport final ===`);
  console.log(`Traités : ${processed} · Réussis : ${succeeded} · Erreurs : ${failed}`);
  console.log(
    `Temps total : ${formatDuration(elapsedSec)} (${(elapsedSec / Math.max(processed, 1)).toFixed(1)}s/exercice)`,
  );
  console.log(`Tokens (si exposés par Ollama) : ${totalPromptTokens} prompt · ${totalOutputTokens} output`);
  console.log(`Coût : 0€ (local)`);

  const remaining = candidates.length - alreadyComplete - succeeded;
  if (remaining > 0) {
    const perExerciseSec = elapsedSec / Math.max(processed, 1);
    console.log(
      `Estimation pour les ${remaining} exercice(s) restant(s) de la bibliothèque : ` +
        `~${formatDuration(perExerciseSec * remaining)}`,
    );
  }
  if (errors.length > 0) {
    console.log(`\n${errors.length} erreur(s) :`);
    for (const e of errors) console.log(` - ${e}`);
  }

  if (dryRun) {
    console.log(`\n=== Fiches générées (dry-run, aucune écriture) ===`);
    for (const s of samples) {
      console.log(`\n--- ${s.nameFr} (${s.id}) ---`);
      console.log(JSON.stringify(s.enrichment, null, 2));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
