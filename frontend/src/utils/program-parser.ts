import { Program, ProgramDay, ProgramSession, ExerciseTemplate } from '@/src/data/programs';
import { uid } from '@/src/utils/gym-storage';

export type ParsedProgramResult = {
  program: Program;
  unrecognized: string[];
};

const BLOCK_KEYWORDS: { re: RegExp; label: string; mode: 'reps' | 'time' }[] = [
  { re: /^cardio\b/i, label: 'Cardio', mode: 'time' },
  { re: /^(musculation|muscu)\b/i, label: 'Musculation', mode: 'reps' },
  { re: /^hiit\b/i, label: 'HIIT', mode: 'reps' },
  { re: /^wod\b/i, label: 'WOD', mode: 'reps' },
];

const WEEK_RE = /^(semaine|week)\s*(\d+)/i;
const DAY_RE = /^(jour|day|s[ée]ance|j)\s*(\d+)/i;
const REST_RE = /^repos\b/i;
// "Squat 4x8 90kg repos 90s" — name, sets, reps, optional weight, optional rest.
const SET_REP_RE = /^(.+?)[\s:–-]*?(\d+)\s*[x×]\s*([\d\-–]+)/i;
const WEIGHT_RE = /(\d+(?:[.,]\d+)?)\s*kg/i;
const REST_INLINE_RE = /repos\s*[:=]?\s*(\d+)\s*(s|sec|secondes|min|minutes)?/i;
// Cardio-style duration line: "Rameur 20 min", "Course 5 km"
const DURATION_RE = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(min|minutes|s|sec|secondes|km|m)\b/i;

function newExercise(name: string, mode: 'reps' | 'time'): ExerciseTemplate {
  return {
    name,
    mode,
    sets: 3,
    reps: '10',
    weight: null,
    rest_seconds: 60,
    duration_seconds: null,
    notes: null,
  };
}

function parseExerciseLine(line: string, mode: 'reps' | 'time'): ExerciseTemplate {
  const setRep = line.match(SET_REP_RE);
  if (setRep) {
    const name = setRep[1].trim().replace(/[-–:]+$/, '').trim();
    const sets = parseInt(setRep[2], 10) || 3;
    const reps = setRep[3];
    const weightMatch = line.match(WEIGHT_RE);
    const restMatch = line.match(REST_INLINE_RE);
    const ex = newExercise(name || line.trim(), mode);
    ex.sets = sets;
    ex.reps = reps;
    if (weightMatch) ex.weight = `${weightMatch[1]}kg`;
    if (restMatch) {
      const n = parseInt(restMatch[1], 10);
      const unit = (restMatch[2] || 's').toLowerCase();
      ex.rest_seconds = unit.startsWith('min') ? n * 60 : n;
    }
    return ex;
  }

  if (mode === 'time') {
    const dur = line.match(DURATION_RE);
    if (dur) {
      const name = dur[1].trim();
      const amount = parseFloat(dur[2].replace(',', '.'));
      const unit = dur[3].toLowerCase();
      const ex = newExercise(name, 'time');
      if (unit.startsWith('min')) ex.duration_seconds = Math.round(amount * 60);
      else if (unit.startsWith('s')) ex.duration_seconds = Math.round(amount);
      else ex.notes = `${dur[2]}${unit}`; // km/m distance — no dedicated field, kept as a note
      ex.sets = 1;
      ex.reps = '1';
      return ex;
    }
  }

  // Fallback: nothing recognized in the line — keep it as a bare exercise
  // with sane defaults rather than silently dropping it. The verification
  // screen is where the user corrects sets/reps/etc.
  return newExercise(line.trim(), mode);
}

/**
 * Best-effort, fully local (no network) line-by-line parser for pasted
 * workout programs. Recall will be partial on unstructured text by design —
 * the caller must route the result through the existing custom-program
 * editor for verification/correction (never save it as final without review).
 */
export function parseProgramText(text: string): ParsedProgramResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Text pasted without any recognizable "Jour N" style header would
  // otherwise dump every line into titleLines and leave `days` empty —
  // the exact shape that used to crash the day editor downstream. When
  // no day header exists anywhere in the paste, treat the whole text as
  // one implicit day instead, so `days.length >= 1` always holds.
  const hasAnyDayHeader = lines.some((l) => DAY_RE.test(l));

  const titleLines: string[] = [];
  const days: ProgramDay[] = [];
  let currentWeek: number | null = null;
  let currentDay: ProgramDay | null = hasAnyDayHeader
    ? null
    : { rest: false, title: 'Jour 1', sessions: [] };
  let currentSession: ProgramSession | null = null;
  let currentMode: 'reps' | 'time' = 'reps';
  const unrecognizedSet = new Set<string>();

  const pushDay = () => {
    if (currentDay) days.push(currentDay);
    currentDay = null;
    currentSession = null;
  };

  for (const line of lines) {
    const weekMatch = line.match(WEEK_RE);
    if (weekMatch) {
      currentWeek = parseInt(weekMatch[2], 10);
      continue;
    }

    const dayMatch = line.match(DAY_RE);
    if (dayMatch) {
      pushDay();
      const title = currentWeek != null ? `Semaine ${currentWeek} — ${line}` : line;
      currentDay = { rest: false, title, sessions: [] };
      continue;
    }

    if (!currentDay) {
      // Nothing before the first "Jour" marker belongs to the program title.
      titleLines.push(line);
      continue;
    }

    if (REST_RE.test(line)) {
      currentDay.rest = true;
      currentDay.sessions = [];
      currentSession = null;
      continue;
    }

    const block = BLOCK_KEYWORDS.find((b) => b.re.test(line));
    if (block) {
      currentMode = block.mode;
      currentSession = { label: block.label, title: block.label, exercises: [] };
      currentDay.sessions.push(currentSession);
      continue;
    }

    if (!currentSession) {
      currentSession = { label: 'Séance', title: 'Séance', exercises: [] };
      currentDay.sessions.push(currentSession);
    }

    const exercise = parseExerciseLine(line, currentMode);
    currentSession.exercises.push(exercise);
    unrecognizedSet.add(exercise.name.toLowerCase().trim());
  }
  pushDay();

  // Guarantee the invariant days.length >= 1 no matter how unstructured or
  // empty the input was, so durationDays below is always truthful and the
  // day editor never has to render an out-of-bounds day.
  if (days.length === 0) {
    days.push({ rest: false, title: 'Jour 1', sessions: [{ label: 'Séance', title: 'Séance', exercises: [] }] });
  }

  const program: Program = {
    id: uid(),
    title: titleLines[0] || 'Programme importé',
    description: titleLines.slice(1).join(' ') || 'Importé depuis un texte collé.',
    durationDays: days.length,
    level: 'intermediaire',
    goal: 'Importé',
    coverEmoji: '📋',
    color: '#FF6B00',
    days,
    isCustom: true,
    category: 'workout',
  };

  return { program, unrecognized: Array.from(unrecognizedSet) };
}

/** Resolves parsed exercise names against the known library (built-in +
 * custom) so identical exercises reuse the existing entry casing instead of
 * creating near-duplicate names. Mutates nothing — returns which of the
 * `unrecognized` names truly have no match, for the "create in library?"
 * banner. */
export function findUnrecognizedNames(
  candidateNames: string[],
  knownNames: string[],
): string[] {
  const known = new Set(knownNames.map((n) => n.toLowerCase().trim()));
  return candidateNames.filter((n) => !known.has(n.toLowerCase().trim()));
}
