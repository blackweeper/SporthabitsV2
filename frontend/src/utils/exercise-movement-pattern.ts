/**
 * Movement-pattern classification (Phase B3) — optional, best-effort field
 * on `ExerciseRecord`. Not required for the library to function; it exists
 * so a future feature can analyze a program's exercise mix (e.g. "too much
 * push, not enough pull") without needing a data migration to add it later.
 */
export type MovementPattern =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "carry"
  | "rotation"
  | "core"
  | "locomotion";

export const MOVEMENT_PATTERN_LABEL: Record<MovementPattern, string> = {
  push: "Poussée",
  pull: "Tirage",
  squat: "Squat",
  hinge: "Charnière de hanche",
  carry: "Portage",
  rotation: "Rotation",
  core: "Gainage",
  locomotion: "Locomotion",
};

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  "push",
  "pull",
  "squat",
  "hinge",
  "carry",
  "rotation",
  "core",
  "locomotion",
];
