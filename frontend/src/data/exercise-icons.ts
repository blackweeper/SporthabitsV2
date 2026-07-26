/**
 * Preset exercise icon library.
 * Each entry has an emoji fallback and searchable keywords for auto-suggest.
 */
export type ExerciseIcon = {
  key: string;
  emoji: string;
  label: string;
  keywords: string[];
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'stretch' | 'other';
};

export const EXERCISE_ICONS: ExerciseIcon[] = [
  // Push
  { key: 'pushup', emoji: '💪', label: 'Pompes', keywords: ['pompe', 'pushup', 'push-up'], category: 'push' },
  { key: 'bench', emoji: '🏋️', label: 'Développé couché', keywords: ['bench', 'développé couché', 'couche'], category: 'push' },
  { key: 'overhead', emoji: '🙆', label: 'Développé militaire', keywords: ['militaire', 'ohp', 'épaule', 'shoulder press', 'developpe'], category: 'push' },
  { key: 'dips', emoji: '⬇️', label: 'Dips', keywords: ['dips'], category: 'push' },
  { key: 'lateralraise', emoji: '🕴️', label: 'Élévations latérales', keywords: ['élévation', 'lateral', 'raise'], category: 'push' },
  { key: 'tricep', emoji: '🦾', label: 'Triceps', keywords: ['triceps', 'extension'], category: 'push' },

  // Pull
  { key: 'pullup', emoji: '🧗', label: 'Tractions', keywords: ['traction', 'pull-up', 'pullup', 'chin'], category: 'pull' },
  { key: 'row', emoji: '🚣', label: 'Rowing', keywords: ['rowing', 'row', 'tirage'], category: 'pull' },
  { key: 'latpulldown', emoji: '⬇️', label: 'Tirage vertical', keywords: ['tirage vertical', 'lat pulldown'], category: 'pull' },
  { key: 'curl', emoji: '💪', label: 'Curl biceps', keywords: ['curl', 'biceps', 'marteau'], category: 'pull' },
  { key: 'facepull', emoji: '🎯', label: 'Face pulls', keywords: ['face pull', 'facepull'], category: 'pull' },

  // Legs
  { key: 'squat', emoji: '🦵', label: 'Squat', keywords: ['squat'], category: 'legs' },
  { key: 'deadlift', emoji: '🏋️‍♂️', label: 'Soulevé de terre', keywords: ['soulevé', 'deadlift', 'romanian', 'terre'], category: 'legs' },
  { key: 'lunge', emoji: '🚶', label: 'Fentes', keywords: ['fente', 'lunge'], category: 'legs' },
  { key: 'legpress', emoji: '🪑', label: 'Presse à cuisses', keywords: ['presse', 'leg press'], category: 'legs' },
  { key: 'calfraise', emoji: '👣', label: 'Mollets', keywords: ['mollet', 'calf'], category: 'legs' },
  { key: 'wallsit', emoji: '🧱', label: 'Chaise au mur', keywords: ['chaise', 'wall sit', 'mur'], category: 'legs' },

  // Core
  { key: 'plank', emoji: '🧘', label: 'Planche', keywords: ['planche', 'plank', 'gainage'], category: 'core' },
  { key: 'crunch', emoji: '🌀', label: 'Crunchs', keywords: ['crunch', 'abdo', 'sit-up', 'situp'], category: 'core' },
  { key: 'mountain', emoji: '⛰️', label: 'Mountain climbers', keywords: ['mountain climber', 'climbers'], category: 'core' },
  { key: 'superman', emoji: '🦸', label: 'Superman', keywords: ['superman', 'dos'], category: 'core' },

  // Cardio
  { key: 'run', emoji: '🏃', label: 'Course', keywords: ['course', 'running', 'run', 'sprint'], category: 'cardio' },
  { key: 'bike', emoji: '🚴', label: 'Vélo', keywords: ['vélo', 'velo', 'bike', 'cycling'], category: 'cardio' },
  { key: 'jumprope', emoji: '🤸', label: 'Corde à sauter', keywords: ['corde', 'jump rope', 'rope'], category: 'cardio' },
  { key: 'burpee', emoji: '🔥', label: 'Burpees', keywords: ['burpee'], category: 'cardio' },
  { key: 'jumpingjack', emoji: '⭐', label: 'Jumping jacks', keywords: ['jumping jack'], category: 'cardio' },
  { key: 'boxing', emoji: '🥊', label: 'Boxe', keywords: ['boxe', 'boxing'], category: 'cardio' },
  { key: 'swim', emoji: '🏊', label: 'Nage', keywords: ['nage', 'swim'], category: 'cardio' },

  // Stretch
  { key: 'yoga', emoji: '🧘‍♀️', label: 'Yoga', keywords: ['yoga', 'étirement', 'etirement'], category: 'stretch' },
  { key: 'stretch_hamstring', emoji: '🦵', label: 'Étirement ischio', keywords: ['ischio', 'étirement jambe'], category: 'stretch' },
  { key: 'stretch_back', emoji: '🐈', label: 'Étirement dos', keywords: ['chat', 'dos', 'cobra'], category: 'stretch' },
  { key: 'stretch_shoulder', emoji: '🙆‍♂️', label: 'Étirement épaules', keywords: ['épaule', 'shoulder stretch'], category: 'stretch' },
  { key: 'stretch_hip', emoji: '🕺', label: 'Étirement hanches', keywords: ['hanche', 'hip'], category: 'stretch' },

  // Other
  { key: 'kettlebell', emoji: '🔔', label: 'Kettlebell', keywords: ['kettlebell', 'swing'], category: 'other' },
  { key: 'dumbbell', emoji: '🏋️‍♀️', label: 'Haltères', keywords: ['haltère', 'haltere', 'dumbbell'], category: 'other' },
  { key: 'other', emoji: '❓', label: 'Autre', keywords: [], category: 'other' },
];

export function findIconByKey(key?: string | null): ExerciseIcon | undefined {
  if (!key) return undefined;
  return EXERCISE_ICONS.find((i) => i.key === key);
}

/** Guesses an appropriate icon for an exercise name (used as a helpful default). */
export function guessIconKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (!n) return null;
  for (const icon of EXERCISE_ICONS) {
    for (const kw of icon.keywords) {
      if (n.includes(kw.toLowerCase())) return icon.key;
    }
  }
  return null;
}

export function iconEmojiForExercise(name: string, iconKey?: string | null): string {
  const icon = findIconByKey(iconKey ?? guessIconKey(name));
  return icon?.emoji ?? '💪';
}
