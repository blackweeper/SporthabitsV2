/**
 * Phase B3 — one-off admin script that fetches the WorkoutX exercise
 * catalogue, cleans/normalizes it into IronFlow's `ExerciseRecord` shape,
 * and writes the result to a local JSON file. It never runs inside the app
 * and never touches AsyncStorage — per the agreed architecture, there is no
 * permanent import server: this script is run by hand whenever the library
 * needs to be (re)generated, and its output is later loaded by the app.
 *
 * Usage:
 *   WORKOUTX_API_KEY=xxx node --env-file=.env -r ts-node/register scripts/import-workoutx.ts [--limit=20] [--mock]
 *   (or transpile first: npx tsc scripts/import-workoutx.ts ... && node ...)
 *
 * --mock   Skips the network call entirely and uses the small embedded
 *          sample (the real WorkoutX response shape, 5 exercises) instead —
 *          useful to dry-run/validate the whole pipeline without spending
 *          API calls or needing a key at hand.
 * --limit  Caps how many exercises are fetched from the real API — always
 *          start small ("petit jeu de test") before importing everything.
 * --lang   Requests WorkoutX's own translated fields (e.g. --lang=fr) —
 *          confirmed real, free, and reliable via a live test call (name
 *          sometimes falls back to English per-exercise; instructions/
 *          description/category/muscles/equipment/difficulty are
 *          translated). Populates `nameFr`/`descriptionFr`/`instructionsFr`
 *          on `WorkoutXExercise`, already read by `mapWorkoutXToExerciseRecord`
 *          — no other change needed. Switches auth to `?api-key=` (query
 *          param) instead of the `X-WorkoutX-Key` header, since the header
 *          is rejected by WorkoutX specifically when `lang` is present.
 * --skip-media  Skips downloading GIFs (fast iteration on the data mapping
 *          itself); `media.primaryImage.remoteUrl` is left pointing at the
 *          original WorkoutX URL in that case, unchanged.
 *
 * Media: truly incremental (Phase B5). Before any network call, each
 * exercise's GIF is checked against the OFFICIAL shared pool
 * (`../exercise-library/media/<id>.gif`) — if it's already there it's never
 * re-fetched, re-written, or deleted, and `media.primaryImage.remoteUrl` is
 * just pointed at the relative path `media/<id>.gif`. Only genuinely
 * missing media is downloaded, into `scripts/output/media/<id>.gif` (merged
 * into the shared pool later by `commit-library-version.ts`). A failed
 * download sets `remoteUrl` to `null` (never left pointing at a live
 * WorkoutX URL) so it's automatically retried on the next import. WebP
 * conversion is still out of scope here (`raw` keeps the original GIF
 * around for whenever that lands).
 *
 * What this script does NOT do (intentionally, out of scope for this pass):
 *  - Merge the result into the official IronFlow library — that's
 *    `scripts/generate-library-version.ts`, which compares this output
 *    against `exercise-library/current.json` (see exercise-library/README.md).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mapWorkoutXToExerciseRecord, WorkoutXExercise } from "../src/utils/workoutx-mapping";
import { ExerciseRecord } from "../src/utils/exercise-records";

const BASE_URL = process.env.WORKOUTX_BASE_URL ?? "https://api.workoutxapp.com/v1";
const API_KEY = process.env.WORKOUTX_API_KEY;

// Real sample response (5 exercises) provided during architecture planning —
// used verbatim as --mock data so the pipeline can be validated end-to-end
// without a live key.
const MOCK_PAGE: { total: number; count: number; data: WorkoutXExercise[] } = {
  total: 1327,
  count: 5,
  data: [
    {
      id: "0001",
      name: "3/4 Sit-up",
      bodyPart: "Waist",
      equipment: "Body Weight",
      target: "Abs",
      secondaryMuscles: ["Hip Flexors", "Lower Back"],
      instructions: [
        "Lie flat on your back with your knees bent and feet flat on the ground.",
        "Place your hands behind your head with your elbows pointing outwards.",
        "Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.",
        "Pause for a moment at the top, then slowly lower your upper body back down to the starting position.",
        "Repeat for the desired number of repetitions.",
      ],
      gifUrl: "https://api.workoutxapp.com/v1/gifs/0001.gif",
      category: "strength",
      difficulty: "beginner",
      mechanic: "isolation",
      force: "push",
      description:
        "3/4 Sit-up is a beginner single-joint isolation pushing exercise targeting the Abs in the Waist region.",
      recommendedSets: "3",
      recommendedReps: "10-15",
    },
    {
      id: "0002",
      name: "45° Side Bend",
      bodyPart: "Waist",
      equipment: "Body Weight",
      target: "Abs",
      secondaryMuscles: ["Obliques"],
      instructions: [
        "Stand with your feet shoulder-width apart and your arms extended straight down by your sides.",
        "Keeping your back straight and your core engaged, slowly bend your torso to one side, lowering your hand towards your knee.",
        "Pause for a moment at the bottom, then slowly return to the starting position.",
        "Repeat on the other side.",
      ],
      gifUrl: "https://api.workoutxapp.com/v1/gifs/0002.gif",
      category: "strength",
      difficulty: "beginner",
      mechanic: "isolation",
      force: "push",
      description: "45° Side Bend is a beginner single-joint isolation pushing exercise targeting the Abs.",
      recommendedSets: "3",
      recommendedReps: "10-15",
    },
    {
      id: "0003",
      name: "Air Bike",
      bodyPart: "Waist",
      equipment: "Body Weight",
      target: "Abs",
      secondaryMuscles: ["Hip Flexors"],
      instructions: [
        "Lie flat on your back with your hands placed behind your head.",
        "Lift your legs off the ground and bend your knees at a 90-degree angle.",
        "Bring your right elbow towards your left knee while simultaneously straightening your right leg.",
      ],
      gifUrl: "https://api.workoutxapp.com/v1/gifs/0003.gif",
      category: "strength",
      difficulty: "beginner",
      mechanic: "isolation",
      force: "push",
      description: "Air Bike is a beginner single-joint isolation pushing exercise targeting the Abs.",
      recommendedSets: "3",
      recommendedReps: "10-15",
    },
    {
      id: "0006",
      name: "Alternate Heel Touchers",
      bodyPart: "Waist",
      equipment: "Body Weight",
      target: "Abs",
      secondaryMuscles: ["Obliques"],
      instructions: [
        "Lie flat on your back with your knees bent and feet flat on the ground.",
        "Extend your arms straight out to the sides, parallel to the ground.",
      ],
      gifUrl: "https://api.workoutxapp.com/v1/gifs/0006.gif",
      category: "strength",
      difficulty: "beginner",
      mechanic: "isolation",
      force: "push",
      description: "Alternate Heel Touchers is a beginner single-joint isolation pushing exercise targeting the Abs.",
      recommendedSets: "3",
      recommendedReps: "10-15",
    },
    {
      id: "0007",
      name: "Alternate Lateral Pulldown",
      bodyPart: "Back",
      equipment: "Cable",
      target: "Lats",
      secondaryMuscles: ["Biceps", "Rhomboids"],
      instructions: [
        "Sit on the cable machine with your back straight and feet flat on the ground.",
        "Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.",
        "Lean back slightly and pull the handles towards your chest, squeezing your shoulder blades together.",
      ],
      gifUrl: "https://api.workoutxapp.com/v1/gifs/0007.gif",
      category: "strength",
      difficulty: "intermediate",
      mechanic: "compound",
      force: "pull",
      description:
        "Alternate Lateral Pulldown is an intermediate multi-joint compound pulling exercise targeting the Lats in the Back region.",
      recommendedSets: "3-4",
      recommendedReps: "6-10",
    },
  ],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The real API enforces 30 requests/60s across the whole key (confirmed by
// a 429 mid-run) — pace every request (pagination AND media) to stay under
// that, rather than relying only on reactive retries.
const REQUEST_INTERVAL_MS = 2200; // ~27 req/min, safely under 30/60s
let lastRequestAt = 0;
async function paceRequest(): Promise<void> {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/** A real ~1300-exercise import means hundreds of sequential HTTP calls —
 * transient network blips or a rate-limit response shouldn't kill the whole
 * run. Retries with exponential backoff on generic failures; on a 429 it
 * reads the API's own `retryAfter` (seconds) from the JSON body and waits
 * that long instead of guessing — rate limits are always recoverable given
 * enough patience, so they get far more attempts than other errors. Gives
 * up immediately on 401/403 (retrying won't fix bad credentials). */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 4,
): Promise<Response> {
  let lastErr: unknown;
  let rateLimitRetries = 0;
  const MAX_RATE_LIMIT_RETRIES = 20;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await paceRequest();
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status === 401 || res.status === 403) return res; // auth error — no point retrying

      if (res.status === 429 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries++;
        attempt--; // rate-limit waits don't count against the normal attempt budget
        let retryAfterSec = 30;
        try {
          const body = (await res.clone().json()) as { retryAfter?: number };
          if (typeof body.retryAfter === "number") retryAfterSec = body.retryAfter;
        } catch {
          // no JSON body / no retryAfter field — fall back to the default above
        }
        console.log(`  rate limited — waiting ${retryAfterSec + 2}s...`);
        await sleep((retryAfterSec + 2) * 1000);
        continue;
      }

      if (attempt === attempts) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) throw lastErr;
    }
    await sleep(500 * 2 ** (attempt - 1)); // 0.5s, 1s, 2s, ...
  }
  throw lastErr;
}

/** `lang` (e.g. "fr") requests WorkoutX's own translated fields (name*,
 * instructions, description, bodyPart, equipment, target, category,
 * difficulty, mechanic, force — confirmed by a real test call; `name` falls
 * back to English per-exercise when WorkoutX has no translation for it).
 * Confirmed by a real test call: the `X-WorkoutX-Key` header is rejected
 * specifically when `lang` is present (a WorkoutX-side quirk) — the
 * `?api-key=` query param is the only combination that works with `lang`,
 * so auth switches to it whenever `lang` is requested. Without `lang`, the
 * original header-based auth is used unchanged. */
async function fetchPage(offset: number, limit: number, lang: string | null) {
  if (!API_KEY) {
    throw new Error("WORKOUTX_API_KEY is not set — export it or pass --mock to dry-run.");
  }
  const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : "";
  const url = lang
    ? `${BASE_URL}/exercises?offset=${offset}&limit=${limit}${langParam}&api-key=${encodeURIComponent(API_KEY)}`
    : `${BASE_URL}/exercises?offset=${offset}&limit=${limit}`;
  const res = await fetchWithRetry(url, {
    headers: lang ? {} : { "X-WorkoutX-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`WorkoutX API error ${res.status}: ${await res.text()}`);
  return (await res.json()) as { total: number; count: number; data: WorkoutXExercise[] };
}

async function fetchAllRaw(maxCount: number | null, lang: string | null): Promise<WorkoutXExercise[]> {
  const PAGE_SIZE = 50;
  let offset = 0;
  const all: WorkoutXExercise[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await fetchPage(offset, PAGE_SIZE, lang);
    all.push(...page.data);
    offset += page.data.length;
    console.log(`  fetched ${all.length}/${page.total}${lang ? ` (${lang})` : ""}...`);
    if (page.data.length === 0) break;
    if (offset >= page.total) break;
    if (maxCount != null && all.length >= maxCount) break;
  }
  return maxCount != null ? all.slice(0, maxCount) : all;
}

/** WorkoutX's `lang` param translates EVERYTHING in the response, including
 * the taxonomy fields (`category`/`equipment`/`target`/`bodyPart`) that
 * `workoutx-mapping.ts` matches against English keyword dictionaries
 * (confirmed by a real test call: `category: "force"` instead of
 * `"strength"` etc. made every exercise fall through to "unmapped"). Rather
 * than teach the mapping dictionaries French too (fragile — breaks again if
 * WorkoutX's wording changes), fetch English (for classification, exactly
 * as before) and the requested `lang` (for the pedagogical text) as two
 * separate passes, then copy only `name`/`description`/`instructions` from
 * the translated pass onto the English-classified record, matched by `id`
 * (confirmed identical across languages). Doubles the number of paginated
 * requests when `lang` is set — still well within the free-tier quota. */
async function fetchAll(maxCount: number | null, lang: string | null): Promise<WorkoutXExercise[]> {
  if (lang && lang !== "fr") {
    throw new Error(`--lang=${lang} is not supported yet — only "fr" has a mapped field (nameFr/descriptionFr/instructionsFr).`);
  }
  const english = await fetchAllRaw(maxCount, null);
  if (!lang) return english;

  const translated = await fetchAllRaw(maxCount, lang);
  const byId = new Map(translated.map((t) => [t.id, t]));

  return english.map((e) => {
    const t = byId.get(e.id);
    if (!t) return e;
    return {
      ...e,
      nameFr: lang === "fr" ? t.name : e.nameFr,
      descriptionFr: lang === "fr" ? (t.description ?? null) : e.descriptionFr,
      instructionsFr: lang === "fr" ? (t.instructions ?? null) : e.instructionsFr,
    };
  });
}

export type MediaReport = {
  alreadyPresent: number;
  newlyDownloaded: number;
  stillMissing: number;
  totalReferenced: number;
  completionPct: number;
  errors: string[];
};

/** Truly incremental (Phase B5): checks the OFFICIAL shared media pool
 * (`exercise-library/media/`, not just this run's own staging output)
 * before ever making a network call — an exercise whose GIF is already
 * there is never re-fetched, re-written, or deleted. Only genuinely
 * missing media triggers a download, written to the staging dir (merged
 * into the shared pool later by `commit-library-version.ts`).
 *
 * On failure (WorkoutX 403s a lot of media on this plan), `remoteUrl` is
 * set to `null` — never left pointing at the live WorkoutX URL, since the
 * app must never be told to call WorkoutX directly. `null` also means "try
 * again next import", satisfying the "retried automatically" requirement
 * without any separate bookkeeping. Requests are paced globally (see
 * `paceRequest`) to stay under WorkoutX's rate limit. */
async function downloadMedia(
  mapped: ExerciseRecord[],
  officialMediaDir: string,
  stagingMediaDir: string,
): Promise<MediaReport> {
  if (!existsSync(stagingMediaDir)) mkdirSync(stagingMediaDir, { recursive: true });
  let alreadyPresent = 0;
  let newlyDownloaded = 0;
  let stillMissing = 0;
  let totalReferenced = 0;
  const errors: string[] = [];

  for (const r of mapped) {
    const originalUrl = r.media?.primaryImage?.remoteUrl;
    if (!originalUrl) continue;
    totalReferenced++;
    const filename = `${r.id}.gif`;

    if (existsSync(`${officialMediaDir}/${filename}`)) {
      r.media!.primaryImage!.remoteUrl = `media/${filename}`;
      alreadyPresent++;
      continue;
    }

    try {
      const res = await fetchWithRetry(originalUrl, { headers: { "X-WorkoutX-Key": API_KEY ?? "" } }, 3);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(`${stagingMediaDir}/${filename}`, buf);
      r.media!.primaryImage!.remoteUrl = `media/${filename}`;
      newlyDownloaded++;
    } catch (err) {
      r.media!.primaryImage!.remoteUrl = null;
      stillMissing++;
      errors.push(`${r.nameFr} (${r.id}): ${err instanceof Error ? err.message : String(err)}`);
    }
    if (totalReferenced % 50 === 0) console.log(`  media ${totalReferenced}/${mapped.length}...`);
  }

  const completionPct =
    totalReferenced > 0 ? Math.round(((alreadyPresent + newlyDownloaded) / totalReferenced) * 1000) / 10 : 100;

  return { alreadyPresent, newlyDownloaded, stillMissing, totalReferenced, completionPct, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const mock = args.includes("--mock");
  const skipMedia = args.includes("--skip-media");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
  const versionArg = args.find((a) => a.startsWith("--version="));
  // Defaults to a Unix timestamp so re-running the script always produces a
  // strictly increasing version even if you forget to pass one explicitly.
  const version = versionArg ? parseInt(versionArg.split("=")[1], 10) : Math.floor(Date.now() / 1000);
  const lang = args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? null;

  const raw = mock ? MOCK_PAGE.data.slice(0, limit ?? undefined) : await fetchAll(limit, lang);

  const mapped = raw.map(mapWorkoutXToExerciseRecord);

  const warnings = mapped.flatMap(
    (r) => ((r.raw as any)?._mappingWarnings as string[] | undefined) ?? [],
  );

  let mediaResult: MediaReport = {
    alreadyPresent: 0,
    newlyDownloaded: 0,
    stillMissing: 0,
    totalReferenced: 0,
    completionPct: 100,
    errors: [],
  };
  if (!skipMedia) {
    mediaResult = await downloadMedia(mapped, "../exercise-library/media", "scripts/output/media");
  }

  const exercisesFile = "workoutx-exercises.json";
  const outPath = `scripts/output/${exercisesFile}`;
  writeFileSync(outPath, JSON.stringify(mapped, null, 2), "utf-8");

  // Written alongside the exercises so the app can compare its installed
  // version against whatever gets hosted, once this bundle is deployed as a
  // static file next to the Render site (see src/utils/exercise-library-source-config.ts).
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    count: mapped.length,
    exercisesUrl: exercisesFile,
  };
  const manifestPath = "scripts/output/manifest.json";
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(
    `Imported ${mapped.length} exercise(s)${mock ? " (mock data)" : ""} → ${outPath} (version ${version}) + ${manifestPath}`,
  );
  if (!skipMedia) {
    console.log(`\nMédia — rapport incrémental :`);
    console.log(`  déjà présents (pool officiel)   : ${mediaResult.alreadyPresent}`);
    console.log(`  nouveaux téléchargements         : ${mediaResult.newlyDownloaded}`);
    console.log(`  toujours manquants                : ${mediaResult.stillMissing}`);
    console.log(`  complétion                        : ${mediaResult.completionPct}% (${mediaResult.alreadyPresent + mediaResult.newlyDownloaded}/${mediaResult.totalReferenced})`);
    if (mediaResult.errors.length > 0) {
      console.log(`\n${mediaResult.errors.length} erreur(s) de téléchargement média :`);
      for (const e of mediaResult.errors) console.log(` - ${e}`);
    }
  } else {
    console.log("Media download skipped (--skip-media).");
  }
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} mapping warning(s):`);
    for (const w of warnings) console.log(` - ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
