import { Exercise, ExerciseMode } from '@/src/utils/gym-storage';

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
};

// ---- Session template builders (reusable) ----
const ex = (
  name: string,
  sets: number,
  reps: string,
  rest: number,
  weight: string | null = null,
  mode: ExerciseMode = 'reps',
  duration_seconds: number | null = null,
  notes: string | null = null,
): ExerciseTemplate => ({
  name,
  mode,
  sets,
  reps,
  weight,
  rest_seconds: rest,
  duration_seconds,
  notes,
});

const day = (title: string, exercises: ExerciseTemplate[]): ProgramDay => ({
  rest: false,
  title,
  sessions: [{ label: '', title, exercises }],
});

const rest = (dayIndex: number): ProgramDay => ({
  rest: true,
  title: `Jour ${dayIndex} — Repos actif`,
  sessions: [],
});

// ---- Program 1: Full Body débutant ----
const FB_PUSH = day('Push (Pecs / Épaules / Triceps)', [
  ex('Pompes classiques', 4, '10-12', 60),
  ex('Développé militaire haltères', 4, '10', 75, '10kg'),
  ex('Dips sur chaise', 3, '12', 60),
  ex('Élévations latérales', 3, '15', 45, '5kg'),
  ex('Extensions triceps', 3, '12', 45, '8kg'),
]);
const FB_PULL = day('Pull (Dos / Biceps)', [
  ex('Rowing haltère', 4, '10', 75, '12kg'),
  ex('Tirage horizontal élastique', 4, '12', 60),
  ex('Curl biceps', 3, '10', 60, '10kg'),
  ex('Superman au sol', 3, '15', 45),
  ex('Curl marteau', 3, '12', 45, '8kg'),
]);
const FB_LEGS = day('Jambes complet', [
  ex('Squats poids du corps', 4, '15', 60),
  ex('Fentes alternées', 4, '10 par jambe', 60),
  ex('Soulevé de terre roumain', 4, '10', 75, '20kg'),
  ex('Mollets debout', 3, '20', 30),
  ex('Chaise contre le mur', 3, '45s', 45, null, 'time', 45),
]);
const FB_CORE_HIIT = day('Core + HIIT 15 min', [
  ex('Planche', 3, '45s', 30, null, 'time', 45),
  ex('Crunchs vélo', 3, '20', 30),
  ex('Mountain climbers', 3, '30s', 30, null, 'time', 30),
  ex(
    'AMRAP finisher',
    1,
    '1',
    0,
    null,
    'amrap',
    480,
    '10 burpees + 15 squats + 20 mountain climbers en tour',
  ),
]);
const FB_FULL = day('Full body cardio', [
  ex('Jumping jacks', 3, '60s', 30, null, 'time', 60),
  ex('Burpees', 3, '10', 45),
  ex('Squats sautés', 3, '15', 45),
  ex('Pompes', 3, '10-12', 45),
  ex('Gainage latéral', 3, '30s par côté', 30, null, 'time', 30),
]);

const FULLBODY_ROTATION = [FB_PUSH, FB_PULL, FB_CORE_HIIT, FB_LEGS, FB_FULL];
const buildFullBody30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    if (d % 7 === 6 || d === 30) days.push(rest(d));
    else {
      days.push({ ...FULLBODY_ROTATION[ri % FULLBODY_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

// ---- Program 2: HIIT Fat Burn ----
const HIIT_TABATA = day('Tabata cardio (20 min)', [
  ex('Jumping jacks', 8, '20s', 10, null, 'time', 20),
  ex('Burpees', 8, '20s', 10, null, 'time', 20),
  ex('Mountain climbers', 8, '20s', 10, null, 'time', 20),
  ex('Squats sautés', 8, '20s', 10, null, 'time', 20),
]);
const HIIT_EMOM = day('EMOM Fat Burner (12 min)', [
  ex(
    'Burpees',
    12,
    '8',
    0,
    null,
    'emom',
    60,
    '8 burpees au début de chaque minute',
  ),
]);
const HIIT_AMRAP = day('AMRAP 15 minutes', [
  ex(
    'Circuit AMRAP',
    1,
    '1',
    0,
    null,
    'amrap',
    900,
    '10 squats + 8 pompes + 6 burpees + 4 tractions (ou élastique)',
  ),
]);
const HIIT_CIRCUIT = day('Circuit 5 tours', [
  ex('Fentes sautées', 5, '20 total', 30),
  ex('Pompes explosives', 5, '10', 30),
  ex('Sprint sur place', 5, '30s', 45, null, 'time', 30),
  ex('Gainage bras tendus', 5, '30s', 30, null, 'time', 30),
]);
const HIIT_LOW = day('Cardio steady (30 min)', [
  ex(
    'Cardio modéré',
    1,
    '1',
    0,
    null,
    'time',
    1800,
    'Course/vélo/marche rapide à intensité modérée (65-75% FC max)',
  ),
]);

const HIIT_ROTATION = [HIIT_TABATA, HIIT_CIRCUIT, HIIT_EMOM, HIIT_AMRAP, HIIT_LOW];
const buildHIIT30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    if (d % 3 === 0) days.push(rest(d));
    else {
      days.push({ ...HIIT_ROTATION[ri % HIIT_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

// ---- Program 3: Prise de masse ----
const MASS_PUSH = day('Push (Pecs / Épaules)', [
  ex('Développé couché', 5, '5', 120, '80kg'),
  ex('Développé incliné haltères', 4, '8', 90, '25kg'),
  ex('Développé militaire barre', 4, '8', 90, '40kg'),
  ex('Écarté haltères', 3, '12', 75, '12kg'),
  ex('Élévations latérales', 3, '15', 60, '8kg'),
  ex('Dips lestés', 3, '10', 90, '10kg'),
]);
const MASS_PULL = day('Pull (Dos / Biceps)', [
  ex('Tractions', 5, '6-8', 120),
  ex('Rowing barre', 4, '8', 90, '60kg'),
  ex('Tirage vertical poulie', 4, '10', 90, '50kg'),
  ex('Curl barre', 4, '10', 75, '30kg'),
  ex('Curl marteau', 3, '12', 60, '12kg'),
  ex('Face pulls', 3, '15', 60, '20kg'),
]);
const MASS_LEGS = day('Jambes lourd', [
  ex('Squat barre', 5, '5', 150, '100kg'),
  ex('Soulevé de terre roumain', 4, '8', 120, '90kg'),
  ex('Presse à cuisses', 4, '10', 90, '160kg'),
  ex('Fentes barre', 3, '10 par jambe', 75, '30kg'),
  ex('Extensions mollets', 4, '15', 45, '60kg'),
  ex('Leg curl', 3, '12', 60, '40kg'),
]);
const MASS_ARMS = day('Bras & Épaules focus', [
  ex('Développé militaire haltères', 4, '10', 75, '20kg'),
  ex('Curl pupitre', 4, '10', 60, '25kg'),
  ex('Extensions triceps corde', 4, '12', 60, '25kg'),
  ex('Curl haltères', 3, '12', 60, '12kg'),
  ex('Pushdown triceps', 3, '15', 60, '30kg'),
  ex('Élévations frontales', 3, '15', 45, '6kg'),
]);

const MASS_ROTATION = [MASS_PUSH, MASS_PULL, MASS_LEGS, MASS_ARMS];
const buildMass30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    if (d % 5 === 0) days.push(rest(d));
    else {
      days.push({ ...MASS_ROTATION[ri % MASS_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

export const BUNDLED_PROGRAMS: Program[] = [
  {
    id: 'fullbody-30',
    title: 'Full Body 30 jours',
    description:
      "Un programme équilibré qui alterne haut du corps, bas du corps et cardio. Idéal si tu débutes ou reprends le sport.",
    durationDays: 30,
    level: 'debutant',
    goal: 'Remise en forme complète',
    goalTag: 'forme_generale',
    coverEmoji: '💪',
    color: '#FF3D00',
    days: buildFullBody30(),
  },
  {
    id: 'hiit-30',
    title: 'HIIT Fat Burn 30 jours',
    description:
      'Séances courtes et intenses (15-25 min) pour brûler un maximum de calories. Alterne Tabata, EMOM, AMRAP et cardio modéré.',
    durationDays: 30,
    level: 'intermediaire',
    goal: 'Perte de graisse',
    goalTag: 'perte_de_poids',
    coverEmoji: '🔥',
    color: '#FF6B00',
    days: buildHIIT30(),
  },
  {
    id: 'mass-30',
    title: 'Prise de masse 30 jours',
    description:
      "Split Push/Pull/Legs/Bras avec charges lourdes et volume élevé. Programme de musculation en salle, pour intermédiaires à avancés.",
    durationDays: 30,
    level: 'avance',
    goal: 'Prise de masse musculaire',
    goalTag: 'prise_de_masse',
    coverEmoji: '🏋️',
    color: '#E53935',
    days: buildMass30(),
  },
];

// ---- Stretching programs (category: 'stretch') ----
const STRETCH_MORNING = day('Réveil du corps (10 min)', [
  ex('Étirement du cou', 1, '30s par côté', 5, null, 'time', 30),
  ex('Rotations d\'épaules', 1, '10 rotations', 5, null, 'time', 30),
  ex('Étirement chat-vache', 1, '10 cycles', 5, null, 'time', 45),
  ex('Étirement dos rond', 1, '30s', 5, null, 'time', 30),
  ex('Étirement des ischios debout', 1, '30s par jambe', 5, null, 'time', 60),
  ex('Étirement quadriceps', 1, '30s par jambe', 5, null, 'time', 60),
  ex('Étirement hanches (papillon)', 1, '45s', 5, null, 'time', 45),
]);
const STRETCH_EVENING = day('Relaxation du soir (12 min)', [
  ex('Respiration profonde', 1, '2 min', 0, null, 'time', 120),
  ex('Étirement du dos allongé', 1, '45s', 5, null, 'time', 45),
  ex('Torsion allongée', 1, '30s par côté', 5, null, 'time', 60),
  ex('Étirement pigeon', 1, '45s par côté', 5, null, 'time', 90),
  ex('Étirement papillon assis', 1, '60s', 5, null, 'time', 60),
  ex('Étirement enfant (yoga)', 1, '90s', 5, null, 'time', 90),
]);
const STRETCH_MOBILITY = day('Mobilité articulaire (15 min)', [
  ex('Rotations de nuque', 1, '30s', 5, null, 'time', 30),
  ex('Rotations d\'épaules', 1, '10 cycles', 5, null, 'time', 45),
  ex('Rotations bras complet', 1, '20 total', 5, null, 'time', 45),
  ex('Rotations hanches', 1, '10 cycles', 5, null, 'time', 45),
  ex('Squats profonds', 1, '10 lents', 5, null, 'time', 60),
  ex('Étirement dynamique ischios', 1, '10 par jambe', 5, null, 'time', 60),
  ex('Marches genoux haut', 1, '30 pas', 5, null, 'time', 30),
]);
const STRETCH_LOWER = day('Bas du corps (15 min)', [
  ex('Étirement ischios (assis)', 1, '45s par jambe', 5, null, 'time', 90),
  ex('Étirement quadriceps debout', 1, '45s par jambe', 5, null, 'time', 90),
  ex('Étirement adducteurs', 1, '45s', 5, null, 'time', 45),
  ex('Fente basse (hip flexor)', 1, '60s par côté', 5, null, 'time', 120),
  ex('Étirement mollets contre mur', 1, '45s par jambe', 5, null, 'time', 90),
  ex('Pigeon', 1, '60s par côté', 5, null, 'time', 120),
]);
const STRETCH_UPPER = day('Haut du corps (12 min)', [
  ex('Étirement du cou', 1, '30s par côté', 5, null, 'time', 60),
  ex('Étirement pectoraux au mur', 1, '45s par côté', 5, null, 'time', 90),
  ex('Étirement triceps derrière la tête', 1, '30s par côté', 5, null, 'time', 60),
  ex('Étirement biceps mur', 1, '30s par côté', 5, null, 'time', 60),
  ex('Aigle (croiser les bras)', 1, '30s par côté', 5, null, 'time', 60),
  ex('Cobra', 1, '30s', 5, null, 'time', 30),
  ex('Torsions assises', 1, '30s par côté', 5, null, 'time', 60),
]);

const STRETCH_ROTATION_14 = [
  STRETCH_MORNING,
  STRETCH_LOWER,
  STRETCH_EVENING,
  STRETCH_UPPER,
  STRETCH_MOBILITY,
];
const buildStretch14 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({ ...STRETCH_ROTATION_14[(d - 1) % STRETCH_ROTATION_14.length] });
  }
  return days;
};

const STRETCH_ROTATION_7 = [STRETCH_MORNING, STRETCH_LOWER, STRETCH_EVENING, STRETCH_UPPER];
const buildStretch7 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  for (let d = 1; d <= 7; d++) {
    days.push({ ...STRETCH_ROTATION_7[(d - 1) % STRETCH_ROTATION_7.length] });
  }
  return days;
};

export const BUNDLED_STRETCH_PROGRAMS: Program[] = [
  {
    id: 'stretch-daily-14',
    title: 'Étirements quotidiens · 14 jours',
    description:
      "Un programme d'étirements complet à faire chaque jour. Alterne réveil matinal, mobilité, bas du corps, haut du corps et relaxation.",
    durationDays: 14,
    level: 'debutant',
    goal: 'Souplesse & récupération',
    goalTag: 'mobilite',
    coverEmoji: '🧘',
    color: '#00E676',
    category: 'stretch',
    days: buildStretch14(),
  },
  {
    id: 'stretch-week-7',
    title: 'Semaine mobilité · 7 jours',
    description:
      "Programme court d'une semaine pour retrouver de la mobilité. Idéal si tu débutes ou reprends après une pause.",
    durationDays: 7,
    level: 'debutant',
    goal: 'Mobilité générale',
    goalTag: 'mobilite',
    coverEmoji: '🌱',
    color: '#00B0FF',
    category: 'stretch',
    days: buildStretch7(),
  },
];

// ---- Cardio Endurance 21 jours (category: 'cardio') ----
// Comble un manque confirmé : l'onglet Cardio de l'app existe déjà mais
// n'avait jusqu'ici aucun programme prédéfini, seulement des programmes
// personnalisés créés par l'utilisateur.
const CARDIO_EASY = day('Cardio léger (30 min)', [
  ex(
    'Marche rapide / vélo doux',
    1,
    '1',
    0,
    null,
    'time',
    1800,
    'Endurance fondamentale, 60-65% FC max',
  ),
]);
const CARDIO_INTERVALS = day('Fractionné (20 min)', [
  ex('Sprint', 8, '30s', 60, null, 'time', 30),
  ex('Récupération active', 8, '60s', 0, null, 'time', 60),
]);
const CARDIO_TEMPO = day('Tempo run (25 min)', [
  ex(
    'Course allure soutenue',
    1,
    '1',
    0,
    null,
    'time',
    1500,
    '75-80% FC max, rythme régulier',
  ),
]);
const CARDIO_HILLS = day('Côtes / Résistance (20 min)', [
  ex('Répétitions côtes ou résistance vélo', 6, '90s', 90, null, 'time', 90),
]);
const CARDIO_LONG = day('Sortie longue (40 min)', [
  ex(
    'Course/vélo endurance longue',
    1,
    '1',
    0,
    null,
    'time',
    2400,
    'Allure confortable, 65-70% FC max',
  ),
]);

const CARDIO_ROTATION = [CARDIO_EASY, CARDIO_INTERVALS, CARDIO_TEMPO, CARDIO_HILLS, CARDIO_LONG];
const buildCardio21 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 21; d++) {
    if (d % 4 === 0) days.push(rest(d));
    else {
      days.push({ ...CARDIO_ROTATION[ri % CARDIO_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

export const BUNDLED_CARDIO_PROGRAMS: Program[] = [
  {
    id: 'cardio-endurance-21',
    title: 'Cardio Endurance 21 jours',
    description:
      "Progression cardio équilibrée sur 3 semaines : sorties faciles, fractionné, tempo et côtes pour développer ton endurance, quel que soit le sport (course, vélo, rameur...).",
    durationDays: 21,
    level: 'debutant',
    goal: 'Endurance & perte de poids',
    goalTag: 'perte_de_poids',
    coverEmoji: '🏃',
    color: '#00B0FF',
    category: 'cardio',
    days: buildCardio21(),
  },
];

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
