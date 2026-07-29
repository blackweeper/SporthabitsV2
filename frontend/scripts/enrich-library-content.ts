/**
 * Phase B5 — enriches `ExerciseRecord` entries (source: "workoutx") with
 * IronFlow's own professional French coaching content via the Claude API:
 * natural name, description, step-by-step instructions, execution tips,
 * common mistakes, verified muscles/difficulty, movement/training
 * classification, coach notes, etc. See `ExerciseEnrichment` in
 * src/utils/exercise-records.ts for the full field list, the
 * display-priority rule, and the `verifiedBy` protection rule enforced
 * below.
 *
 * Usage (from frontend/):
 *   ANTHROPIC_API_KEY=xxx node --env-file=.env -r ts-node/register \
 *     scripts/enrich-library-content.ts \
 *     [--limit=20] [--ids=wx_0001,wx_0002] [--locale=fr] \
 *     [--batch-size=5] [--model=claude-sonnet-5] [--dry-run]
 *
 * --dry-run   Generates and prints the fiches (with real token/cost
 *             metrics) without writing anything to disk — this is the mode
 *             used for the mandatory 20-representative-exercise validation
 *             pass before any full run.
 * --ids       Comma-separated explicit ExerciseRecord ids — lets a caller
 *             hand-pick a representative sample instead of taking whatever
 *             is first in the file.
 * --limit     Caps how many (still-incomplete) exercises are processed.
 * --locale    ISO locale to generate for (default "fr" — the only one
 *             IronFlow ships today; the whole pipeline is locale-agnostic).
 *
 * Writes directly into the CURRENT official version's exercises.json
 * (exercise-library/current.json → versions/vN/exercises.json) — enrichment
 * is additive metadata on existing records, not a new library version, so
 * there is nothing to "commit" the way scripts/commit-library-version.ts
 * commits a WorkoutX import. The file is rewritten after every batch (not
 * only at the end), so an interruption only loses the batch in flight, and
 * re-running resumes automatically (already-complete fiches cost 0 API
 * calls). A timestamped backup of that file is written once, before the
 * first write.
 *
 * Skip rules (checked before anything else, in this order):
 *  1. `record.source !== "workoutx"` — system/custom records are untouched.
 *  2. `record.enrichment.verifiedBy` is "human" or "coach" — never touched
 *     again, regardless of `templateVersion`. Absolute rule.
 *  3. The requested locale's required fields are already all filled — no
 *     regeneration, 0 API calls, per-field (not per-exercise) incremental.
 *
 * When an exercise IS processed, the model is asked for every field, but
 * `mergeEnrichment` only ever writes fields that were previously null —
 * anything already present (from a prior run, or a human edit) is kept
 * byte-for-byte.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord, ExerciseEnrichment } from "../src/utils/exercise-records";
import {
  ENRICHMENT_JSON_SCHEMA,
  GeneratedFiche,
  buildSystemPrompt,
  buildUserPrompt,
  isEnrichmentComplete,
  mergeEnrichment,
  validateGenerated,
} from "./lib/enrichment-shared";

// Source: https://platform.claude.com/docs/en/about-claude/pricing, checked
// 2026-07-29. Sonnet 5 shows introductory pricing through 2026-08-31 — real
// cost is always computed from the API's own reported token usage, this
// table only converts tokens → USD. cacheWrite/cacheRead are the 5-minute
// ephemeral multipliers (1.25x / 0.1x of base input) applied to the shared
// system prompt cached across every call in a run.
const PRICING_USD_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

// ---------- Anthropic API plumbing (mirrors the pacing/retry pattern already
// built for WorkoutX in import-workoutx.ts, adapted to this API's headers
// and rate-limit signalling). ----------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const REQUEST_INTERVAL_MS = 350;
let lastRequestAt = 0;
async function paceRequest(): Promise<void> {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 4): Promise<Response> {
  let lastErr: unknown;
  let rateLimitRetries = 0;
  const MAX_RATE_LIMIT_RETRIES = 10;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await paceRequest();
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status === 401 || res.status === 403) return res;

      if (res.status === 429 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries++;
        attempt--;
        const header = res.headers.get("retry-after");
        const waitSec = header ? parseInt(header, 10) : 30;
        console.log(`  rate limited — waiting ${waitSec + 2}s...`);
        await sleep((waitSec + 2) * 1000);
        continue;
      }

      if (attempt === attempts) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) throw lastErr;
    }
    await sleep(500 * 2 ** (attempt - 1));
  }
  throw lastErr;
}

const ENRICHMENT_TOOL = {
  name: "submit_exercise_fiche",
  description: "Soumet la fiche de coaching IronFlow générée pour cet exercice, au format strict demandé.",
  input_schema: ENRICHMENT_JSON_SCHEMA,
};

async function callClaude(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ fiche: GeneratedFiche; usage: Record<string, number> }> {
  const res = await fetchWithRetry(
    ANTHROPIC_API_URL,
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
        tools: [ENRICHMENT_TOOL],
        tool_choice: { type: "tool", name: ENRICHMENT_TOOL.name },
      }),
    },
    4,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    content: { type: string; input?: unknown }[];
    usage: Record<string, number>;
  };
  const toolUse = data.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("réponse Claude sans bloc tool_use — sortie inattendue");

  const fiche = toolUse.input as GeneratedFiche;
  validateGenerated(fiche);
  return { fiche, usage: data.usage ?? {} };
}

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — export it before running this script.");
  }

  const dryRun = args.includes("--dry-run");
  const locale = args.find((a) => a.startsWith("--locale="))?.split("=")[1] ?? "fr";
  const model = args.find((a) => a.startsWith("--model="))?.split("=")[1] ?? "claude-sonnet-5";
  const batchSize = parseInt(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ?? "5", 10);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
  const idsArg = args.find((a) => a.startsWith("--ids="));
  const explicitIds = idsArg ? new Set(idsArg.split("=")[1].split(",").map((s) => s.trim())) : null;

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
  if (limit != null) toProcess = toProcess.slice(0, limit);

  console.log(`Bibliothèque : ${exercises.length} exercice(s), version ${current.version}.`);
  console.log(`Candidats (source workoutx, non verrouillés humain/coach) : ${candidates.length}`);
  console.log(`  déjà complets (locale "${locale}") : ${alreadyComplete} — ignorés, 0 appel API`);
  console.log(`  à traiter cette exécution : ${toProcess.length}${limit != null ? ` (--limit=${limit})` : ""}`);
  console.log(`Modèle : ${model}${dryRun ? " — DRY RUN (aucune écriture disque)" : ""}\n`);

  if (toProcess.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  const pricing = PRICING_USD_PER_MTOK[model];
  if (!pricing) {
    console.log(`⚠ Tarification inconnue pour le modèle "${model}" — le coût ne pourra pas être calculé.\n`);
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
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheWrite = 0;
  let totalCacheRead = 0;
  let totalCostUsd = 0;
  const errors: string[] = [];
  const samples: { id: string; nameFr: string; enrichment: ExerciseEnrichment }[] = [];

  for (const record of toProcess) {
    processed++;
    try {
      const userPrompt = buildUserPrompt(record);
      const { fiche, usage } = await callClaude(model, apiKey, systemPrompt, userPrompt);

      totalInput += usage.input_tokens ?? 0;
      totalOutput += usage.output_tokens ?? 0;
      totalCacheWrite += usage.cache_creation_input_tokens ?? 0;
      totalCacheRead += usage.cache_read_input_tokens ?? 0;
      if (pricing) {
        totalCostUsd +=
          ((usage.input_tokens ?? 0) / 1e6) * pricing.input +
          ((usage.output_tokens ?? 0) / 1e6) * pricing.output +
          ((usage.cache_creation_input_tokens ?? 0) / 1e6) * pricing.cacheWrite +
          ((usage.cache_read_input_tokens ?? 0) / 1e6) * pricing.cacheRead;
      }

      const nextEnrichment = mergeEnrichment(record.enrichment, fiche, locale, "claude");
      record.enrichment = nextEnrichment;
      succeeded++;
      samples.push({ id: record.id, nameFr: record.nameFr, enrichment: nextEnrichment });
    } catch (err) {
      failed++;
      errors.push(`${record.nameFr} (${record.id}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (processed % batchSize === 0 || processed === toProcess.length) {
      if (!dryRun) writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2), "utf-8");
      console.log(
        `[${processed}/${toProcess.length}] traités · ${succeeded} réussis · ${failed} erreurs · ` +
          `coût cumulé ${formatUsd(totalCostUsd)}${dryRun ? " (dry-run, non écrit)" : ""}`,
      );
    }
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;

  console.log(`\n=== Rapport final ===`);
  console.log(`Traités : ${processed} · Réussis : ${succeeded} · Erreurs : ${failed}`);
  console.log(
    `Temps total : ${elapsedSec.toFixed(1)}s (${(elapsedSec / Math.max(processed, 1)).toFixed(2)}s/exercice)`,
  );
  console.log(
    `Tokens : ${totalInput} input · ${totalOutput} output · ${totalCacheWrite} cache-write · ${totalCacheRead} cache-read`,
  );
  if (pricing) {
    console.log(
      `Coût réel de cette exécution : ${formatUsd(totalCostUsd)} (${formatUsd(
        totalCostUsd / Math.max(succeeded, 1),
      )}/exercice réussi)`,
    );
    const remaining = candidates.length - alreadyComplete - succeeded;
    if (remaining > 0) {
      const perExercise = totalCostUsd / Math.max(succeeded, 1);
      const perExerciseSec = elapsedSec / Math.max(processed, 1);
      console.log(
        `Estimation pour les ${remaining} exercice(s) restant(s) de la bibliothèque : ` +
          `~${formatUsd(perExercise * remaining)} · ~${((perExerciseSec * remaining) / 60).toFixed(0)} min`,
      );
    }
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
