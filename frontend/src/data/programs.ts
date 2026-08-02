import type { Exercise } from '@/src/utils/gym-storage';

export type ProgramLevel = 'debutant' | 'intermediaire' | 'avance';

/** Objectif principal d'un programme — sert à la fois à l'affichage et,
 * couplé à `UserProfile.primaryGoal`/`experienceLevel`, à recommander les
 * programmes les plus pertinents pour le profil de l'utilisateur. */
export type ProgramGoal =
  | 'perte_de_poids'
  | 'prise_de_masse'
  | 'force'
  | 'forme_generale'
  | 'mobilite';

export const GOAL_LABEL: Record<ProgramGoal, string> = {
  perte_de_poids: 'Perte de poids',
  prise_de_masse: 'Prise de masse',
  force: 'Force',
  forme_generale: 'Forme générale',
  mobilite: 'Mobilité',
};

export type ExerciseTemplate = Omit<Exercise, 'id'>;

export type ProgramSession = {
  label: string; // 'Matin', 'Après-midi', 'Cardio', 'Muscu'…
  title: string;
  exercises: ExerciseTemplate[];
};

export type ProgramDay = {
  rest: boolean;
  title: string;
  sessions: ProgramSession[]; // empty if rest
};

/** Coach IronFlow — étiquette descriptive d'une plage de jours d'un plan
 * multi-semaines généré (ex. "Semaine 4 — Deload"). Purement informatif :
 * `days`/`sessions` restent la seule source de vérité pour ce qui se joue
 * réellement (une semaine de deload est juste des jours à volume réduit
 * dans `days`, pas une structure séparée) — `phases` ne fait qu'annoter un
 * `Program` déjà valide pour que l'UI puisse l'afficher, jamais requis pour
 * qu'un programme fonctionne (absent partout ailleurs qu'un plan généré). */
export type ProgramPhase = {
  startDay: number;
  endDay: number;
  kind: 'volume' | 'deload' | 'intensity' | 'test' | 'taper';
  label: string;
};

export type Program = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  level: ProgramLevel;
  goal: string;
  /** Objectif typé (additif à `goal`, texte libre conservé pour l'affichage) —
   * absent pour les programmes créés avant cette passe, jamais utilisé pour
   * exclure un programme, seulement pour trier par pertinence. */
  goalTag?: ProgramGoal;
  coverEmoji: string;
  color: string;
  days: ProgramDay[];
  isCustom?: boolean;
  /** 'workout' (default), 'cardio' or 'stretch' — used to route to the right tab. */
  category?: 'workout' | 'cardio' | 'stretch';
  /** Coach IronFlow — additif, absent pour tout programme importé/créé
   * manuellement. Voir `ProgramPhase`. */
  phases?: ProgramPhase[] | null;
};

export const LEVEL_LABEL: Record<ProgramLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export const COVER_EMOJIS = ['💪', '🔥', '🏋️', '⚡', '🏃', '🎯', '🥊', '🚴', '🧘'];
export const COVER_COLORS = [
  '#FF3D00',
  '#FF6B00',
  '#E53935',
  '#FF9800',
  '#00E676',
  '#00B0FF',
  '#7C4DFF',
  '#FFC400',
];
