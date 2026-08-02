/**
 * Coach IronFlow — aperçu en ligne de commande, utile tant que l'écran
 * questionnaire n'existe pas encore : génère un programme avec le vrai
 * moteur (`coach-engine.ts`) sur les vraies données et l'affiche en texte,
 * pour vérifier visuellement la cohérence sans passer par l'app.
 *
 * Usage (depuis frontend/) :
 *   node -r ts-node/register scripts/coach-preview.ts [options]
 *     --goal=strength|hypertrophy|endurance|conditioning|mobility|
 *            rehabilitation|hyrox|crossfit|running|power|stability
 *     --level=debutant|intermediaire|avance
 *     --frequency=<n>          (séances/semaine, défaut 4)
 *     --duration=<n>           (minutes/séance, défaut 45)
 *     --weeks=<n>              (défaut 2, pour un aperçu court)
 *     --equipment=bodyweight,dumbbell,kettlebell (matériel dispo, défaut illimité)
 *     --pain=knees,lowerBack   (zones douloureuses, défaut aucune)
 */
import { readFileSync } from "node:fs";
import type { ExerciseRecord } from "../src/utils/exercise-records";
import type { TrainingGoal } from "../src/utils/exercise-training-goal";
import type { ExerciseEquipment } from "../src/utils/exercise-equipment";
import type { PainZone } from "../src/utils/gym-storage";
import type { ProgramLevel } from "../src/data/programs";
import { generateProgram } from "../src/utils/coach-engine";

function arg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

function main() {
  const goal = arg("goal", "hypertrophy") as TrainingGoal;
  const level = arg("level", "intermediaire") as ProgramLevel;
  const weeklyFrequency = parseInt(arg("frequency", "4"), 10);
  const sessionDurationMinutes = parseInt(arg("duration", "45"), 10);
  const totalWeeks = parseInt(arg("weeks", "2"), 10);
  const equipmentArg = arg("equipment", "");
  const painArg = arg("pain", "");
  const availableEquipment = equipmentArg ? (equipmentArg.split(",") as ExerciseEquipment[]) : null;
  const painZones = painArg ? (painArg.split(",") as PainZone[]) : null;

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const allExercises: ExerciseRecord[] = JSON.parse(
    readFileSync(`../exercise-library/${current.path}/exercises.json`, "utf-8"),
  );

  const program = generateProgram({
    allExercises,
    primaryGoal: goal,
    level,
    weeklyFrequency,
    sessionDurationMinutes,
    totalWeeks,
    availableEquipment,
    painZones,
  });

  console.log(`\n=== ${program.title} ===`);
  console.log(program.description);
  console.log(`Durée totale : ${program.durationDays} jours (${totalWeeks} semaines)`);
  console.log(`Phases : ${program.phases?.map((p) => p.label).join(" | ")}\n`);

  let restCount = 0;
  let trainingCount = 0;
  const exerciseCounts: number[] = [];
  const allUsedNames = new Set<string>();

  for (const [i, day] of program.days.entries()) {
    if (day.rest) {
      restCount++;
      if (i < 14) console.log(`Jour ${i + 1} — Repos`);
      continue;
    }
    trainingCount++;
    const session = day.sessions[0];
    exerciseCounts.push(session.exercises.length);
    for (const ex of session.exercises) allUsedNames.add(ex.name);
    if (i < 14) {
      console.log(`Jour ${i + 1} — ${day.title} (${session.exercises.length} exercices)`);
      for (const ex of session.exercises) {
        console.log(`   - ${ex.name} : ${ex.sets} × ${ex.reps} · repos ${ex.rest_seconds}s`);
      }
    }
  }

  console.log(`\n--- Résumé ---`);
  console.log(`Jours d'entraînement : ${trainingCount} · Jours de repos : ${restCount}`);
  console.log(`Exercices/séance (moyenne) : ${(exerciseCounts.reduce((a, b) => a + b, 0) / (exerciseCounts.length || 1)).toFixed(1)}`);
  console.log(`Exercices distincts utilisés sur ${totalWeeks} semaine(s) : ${allUsedNames.size}`);
}

main();
