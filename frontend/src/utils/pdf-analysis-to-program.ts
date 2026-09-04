import { Program, ProgramDay, ProgramSession, ExerciseTemplate } from '@/src/data/programs';
import { uid } from '@/src/utils/gym-storage';
import type { PdfAnalysisResult, PdfExerciseAnalysis } from '@/src/utils/pdf-import-api';

/** "90s", "2min", "1h30" → secondes. null si rien d'exploitable. */
function parseDurationToSeconds(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(h|min|minutes?|s|sec|secondes?)?/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  const unit = (match[2] || 's').toLowerCase();
  if (unit.startsWith('h')) return Math.round(amount * 3600);
  if (unit.startsWith('min')) return Math.round(amount * 60);
  return Math.round(amount);
}

function toExerciseTemplate(ex: PdfExerciseAnalysis): ExerciseTemplate {
  const hasSetsOrReps = ex.sets != null || (!!ex.reps && ex.reps.trim() !== '');
  const isTimed = !hasSetsOrReps && (ex.duration != null || ex.distance != null);
  const mode: 'reps' | 'time' = isTimed ? 'time' : 'reps';

  // L'IA ne doit jamais inventer (règle stricte côté backend, voir
  // ai/prompts/pdf_program.py) — null veut dire "absent du PDF". Le modèle
  // Exercise de l'app veut des champs non-nullables (sets/reps), donc on met
  // un minimum neutre plutôt qu'une valeur plausible, et on le signale en
  // note pour que la revue post-import (import-review/[id].tsx ou l'éditeur
  // de programme) attire l'oeil dessus au lieu de le faire passer pour une
  // vraie valeur extraite du PDF.
  const notesParts: string[] = [];
  if (ex.notes) notesParts.push(ex.notes);
  if (ex.tempo) notesParts.push(`Tempo ${ex.tempo}`);
  if (ex.distance) notesParts.push(`Distance ${ex.distance}`);
  if (ex.ambiguous) notesParts.push('Ambigu dans le PDF — à vérifier');
  if (mode === 'reps' && (ex.sets == null || !ex.reps)) {
    notesParts.push('Séries/répétitions non précisées dans le PDF');
  }

  return {
    name: ex.name.trim(),
    mode,
    sets: ex.sets ?? 1,
    reps: ex.reps || (mode === 'time' ? '1' : ''),
    weight: ex.weight ?? null,
    rest_seconds: parseDurationToSeconds(ex.rest) ?? 60,
    duration_seconds: parseDurationToSeconds(ex.duration),
    notes: notesParts.length > 0 ? notesParts.join(' · ') : null,
  };
}

/**
 * Convertit l'analyse IA renvoyée par POST /api/pdf-import/analyze en
 * `Program` local — même sortie que `parseProgramText()` (program-parser.ts),
 * pour rejoindre exactement le même pipeline en aval : auto-link exact/alias
 * → saveCustomProgram() → écran de revue si des exercices restent ambigus.
 *
 * Le backend structure en semaines > jours ; l'app n'a qu'une liste de jours
 * à plat (`Program.days`, voir src/data/programs.ts) — chaque (semaine, jour)
 * du PDF devient donc un jour du programme, titré "Semaine N — <nom ou Jour
 * M>" seulement quand il y a plus d'une semaine (sinon juste "<nom ou Jour
 * M>", pour ne pas afficher "Semaine 1 —" partout sur un programme simple).
 */
export function pdfAnalysisToProgram(analysis: PdfAnalysisResult): Program {
  const src = analysis.program;
  const days: ProgramDay[] = [];
  const hasMultipleWeeks = src.weeks.length > 1;

  for (const week of src.weeks) {
    for (const day of week.days) {
      const label = day.name?.trim() || `Jour ${day.day}`;
      const title = hasMultipleWeeks ? `Semaine ${week.week} — ${label}` : label;

      if (day.exercises.length === 0) {
        days.push({ rest: true, title, sessions: [] });
        continue;
      }

      const session: ProgramSession = {
        label: 'Séance',
        title: 'Séance',
        exercises: day.exercises.map(toExerciseTemplate),
      };
      days.push({ rest: false, title, sessions: [session] });
    }
  }

  // Garantit days.length >= 1 même si le PDF n'a produit aucune semaine/jour
  // exploitable — même invariant que parseProgramText, pour ne jamais
  // envoyer un Program vide à l'éditeur en aval.
  if (days.length === 0) {
    days.push({ rest: false, title: 'Jour 1', sessions: [{ label: 'Séance', title: 'Séance', exercises: [] }] });
  }

  return {
    id: uid(),
    title: src.name?.trim() || 'Programme importé (PDF)',
    description: src.description?.trim() || 'Importé depuis un PDF via analyse IA.',
    durationDays: days.length,
    level: 'intermediaire',
    goal: 'Importé',
    coverEmoji: '📄',
    color: '#4DA3FF',
    days,
    isCustom: true,
    category: 'workout',
  };
}
