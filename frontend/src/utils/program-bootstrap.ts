import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteProgramPlansForIds, getCustomPrograms, saveCustomProgram } from '@/src/utils/gym-storage';
import { STARTER_PROGRAMS } from '@/src/data/starter-programs';

const SEEDED_IDS_KEY = '@ironflow/starterProgramsSeededIds';
// One-time migration flag: the-comeback/the-comeback-cardio originally shipped
// with a data bug (circuit exercises encoded as `sets:N` on one exercise,
// which the workout runner executes as N consecutive sets of that exercise
// instead of true round-robin rotation between machines). Installs that had
// already seeded the old version need the corrected data force-replaced once
// — a normal seed (id already present) would otherwise skip it forever.
// Bumped to _v2 when Semaine 8 ("Tests de Force & Hyrox") was added to
// the-comeback — same force-replace mechanism, new version so it re-applies
// even on installs that already ran _v1.
// Bumped to _v3 + the-comeback-v2 added: the exercise-library audit pass
// relinked ~90 exercise slots across these 3 programs (bodyweight/HYROX
// movements that either didn't exist in the library yet or existed under a
// different name — Air Squat, Walking Lunge, Sit-up, Push-Up...) to real
// `exerciseRecordId`s, so already-seeded installs need this force-replace
// again to actually see the new thumbnails/fiches.
const COMEBACK_CIRCUIT_FIX_KEY = '@ironflow/comebackCircuitFixApplied_v3';
const COMEBACK_PROGRAM_IDS = ['the-comeback', 'the-comeback-cardio', 'the-comeback-v2'];

/**
 * Amorce les programmes de démarrage (Flexy Series + The Comeback) dans le
 * stockage utilisateur. Chaque programme est semé une seule fois par id
 * (jamais réécrit après, l'utilisateur reste libre de le modifier/supprimer
 * sans qu'il ne réapparaisse) — mais contrairement à l'ancien flag global
 * unique, un programme ajouté à STARTER_PROGRAMS après le premier lancement
 * de l'utilisateur est bien semé au lancement suivant plutôt que d'être
 * silencieusement ignoré pour toujours.
 */
export async function seedStarterProgramsIfNeeded(): Promise<void> {
  await applyComebackCircuitFixIfNeeded();

  const seededIdsRaw = await AsyncStorage.getItem(SEEDED_IDS_KEY);
  const seededIds = new Set<string>(seededIdsRaw ? JSON.parse(seededIdsRaw) : []);
  const existing = await getCustomPrograms();
  const existingIds = new Set(existing.map((p) => p.id));

  let seededCount = 0;
  for (const program of STARTER_PROGRAMS) {
    if (seededIds.has(program.id)) continue;
    if (!existingIds.has(program.id)) {
      await saveCustomProgram(program);
      seededCount++;
    }
    seededIds.add(program.id);
  }

  if (seededCount > 0) {
    await AsyncStorage.setItem(SEEDED_IDS_KEY, JSON.stringify([...seededIds]));
    console.log(`[seedStarterProgramsIfNeeded] ${seededCount} programme(s) de démarrage amorcé(s).`);
  }
}

/**
 * One-time force-replace of the-comeback/the-comeback-cardio with the
 * corrected round-robin data, for installs that already seeded the buggy
 * version. Safe to overwrite in place: `ActiveProgram` only stores
 * `{programId, startedAt, completedSessions}` (no exercise snapshot) and
 * `SessionExerciseLog` entries capture their own name/data independently, so
 * replacing the Program's day/session content never corrupts past progress
 * — as long as the day count and order stay the same, which they do here.
 * Also purges any already-cached `Plan` for these ids (see
 * `deleteProgramPlansForIds`) — `findOrCreateProgramPlan` reuses a plan
 * forever once a day has been opened, so without this the runner would keep
 * showing the old blocked-sets data for any day already visited.
 */
async function applyComebackCircuitFixIfNeeded(): Promise<void> {
  const applied = await AsyncStorage.getItem(COMEBACK_CIRCUIT_FIX_KEY);
  if (applied) return;

  const existing = await getCustomPrograms();
  for (const id of COMEBACK_PROGRAM_IDS) {
    const fixed = STARTER_PROGRAMS.find((p) => p.id === id);
    if (!fixed) continue;
    if (existing.some((p) => p.id === id)) {
      await saveCustomProgram(fixed);
    }
  }
  await deleteProgramPlansForIds(COMEBACK_PROGRAM_IDS);

  await AsyncStorage.setItem(COMEBACK_CIRCUIT_FIX_KEY, '1');
}
