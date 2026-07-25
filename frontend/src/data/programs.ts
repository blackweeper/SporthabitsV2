import { Exercise, ExerciseMode } from '@/src/utils/gym-storage';

export type ProgramLevel = 'debutant' | 'intermediaire' | 'avance';

export type ExerciseTemplate = Omit<Exercise, 'id'>;

export type ProgramDay = {
  rest: boolean;
  title: string;
  exercises: ExerciseTemplate[];
};

export type Program = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  level: ProgramLevel;
  goal: string;
  coverEmoji: string;
  color: string;
  days: ProgramDay[];
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

const rest = (dayIndex: number): ProgramDay => ({
  rest: true,
  title: `Jour ${dayIndex} — Repos actif`,
  exercises: [],
});

// ---- Program 1: Full Body débutant ----
const FB_PUSH: ProgramDay = {
  rest: false,
  title: 'Push (Pecs / Épaules / Triceps)',
  exercises: [
    ex('Pompes classiques', 4, '10-12', 60),
    ex('Développé militaire haltères', 4, '10', 75, '10kg'),
    ex('Dips sur chaise', 3, '12', 60),
    ex('Élévations latérales', 3, '15', 45, '5kg'),
    ex('Extensions triceps', 3, '12', 45, '8kg'),
  ],
};
const FB_PULL: ProgramDay = {
  rest: false,
  title: 'Pull (Dos / Biceps)',
  exercises: [
    ex('Rowing haltère', 4, '10', 75, '12kg'),
    ex('Tirage horizontal élastique', 4, '12', 60),
    ex('Curl biceps', 3, '10', 60, '10kg'),
    ex('Superman au sol', 3, '15', 45),
    ex('Curl marteau', 3, '12', 45, '8kg'),
  ],
};
const FB_LEGS: ProgramDay = {
  rest: false,
  title: 'Jambes complet',
  exercises: [
    ex('Squats poids du corps', 4, '15', 60),
    ex('Fentes alternées', 4, '10 par jambe', 60),
    ex('Soulevé de terre roumain', 4, '10', 75, '20kg'),
    ex('Mollets debout', 3, '20', 30),
    ex('Chaise contre le mur', 3, '45s', 45, null, 'time', 45),
  ],
};
const FB_CORE_HIIT: ProgramDay = {
  rest: false,
  title: 'Core + HIIT 15 min',
  exercises: [
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
  ],
};
const FB_FULL: ProgramDay = {
  rest: false,
  title: 'Full body cardio',
  exercises: [
    ex('Jumping jacks', 3, '60s', 30, null, 'time', 60),
    ex('Burpees', 3, '10', 45),
    ex('Squats sautés', 3, '15', 45),
    ex('Pompes', 3, '10-12', 45),
    ex('Gainage latéral', 3, '30s par côté', 30, null, 'time', 30),
  ],
};

const FULLBODY_ROTATION = [
  FB_PUSH,
  FB_PULL,
  FB_CORE_HIIT,
  FB_LEGS,
  FB_FULL,
];

const buildFullBody30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    // Repos jour 6, 13, 20, 27 (approx 1 sur 7)
    if (d % 7 === 6 || d === 30) {
      days.push(rest(d));
    } else {
      days.push({ ...FULLBODY_ROTATION[ri % FULLBODY_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

// ---- Program 2: HIIT Fat Burn ----
const HIIT_TABATA: ProgramDay = {
  rest: false,
  title: 'Tabata cardio (20 min)',
  exercises: [
    ex('Jumping jacks', 8, '20s', 10, null, 'time', 20),
    ex('Burpees', 8, '20s', 10, null, 'time', 20),
    ex('Mountain climbers', 8, '20s', 10, null, 'time', 20),
    ex('Squats sautés', 8, '20s', 10, null, 'time', 20),
  ],
};
const HIIT_EMOM: ProgramDay = {
  rest: false,
  title: 'EMOM Fat Burner (12 min)',
  exercises: [
    ex('Burpees', 12, '8', 0, null, 'emom', 60, '8 burpees au début de chaque minute'),
  ],
};
const HIIT_AMRAP: ProgramDay = {
  rest: false,
  title: 'AMRAP 15 minutes',
  exercises: [
    ex(
      'Circuit AMRAP',
      1,
      '1',
      0,
      null,
      'amrap',
      900,
      '10 squats + 8 pompes + 6 burpees + 4 pull-ups (ou tractions élastique)',
    ),
  ],
};
const HIIT_CIRCUIT: ProgramDay = {
  rest: false,
  title: 'Circuit 5 tours',
  exercises: [
    ex('Fentes sautées', 5, '20 total', 30),
    ex('Pompes explosives', 5, '10', 30),
    ex('Sprint sur place', 5, '30s', 45, null, 'time', 30),
    ex('Gainage bras tendus', 5, '30s', 30, null, 'time', 30),
  ],
};
const HIIT_LOW: ProgramDay = {
  rest: false,
  title: 'Cardio steady (30 min)',
  exercises: [
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
  ],
};

const HIIT_ROTATION = [
  HIIT_TABATA,
  HIIT_CIRCUIT,
  HIIT_EMOM,
  HIIT_AMRAP,
  HIIT_LOW,
];

const buildHIIT30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    if (d % 3 === 0) {
      days.push(rest(d));
    } else {
      days.push({ ...HIIT_ROTATION[ri % HIIT_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

// ---- Program 3: Prise de masse ----
const MASS_PUSH: ProgramDay = {
  rest: false,
  title: 'Push (Pecs / Épaules)',
  exercises: [
    ex('Développé couché', 5, '5', 120, '80kg'),
    ex('Développé incliné haltères', 4, '8', 90, '25kg'),
    ex('Développé militaire barre', 4, '8', 90, '40kg'),
    ex('Écarté haltères', 3, '12', 75, '12kg'),
    ex('Élévations latérales', 3, '15', 60, '8kg'),
    ex('Dips lestés', 3, '10', 90, '10kg'),
  ],
};
const MASS_PULL: ProgramDay = {
  rest: false,
  title: 'Pull (Dos / Biceps)',
  exercises: [
    ex('Tractions', 5, '6-8', 120),
    ex('Rowing barre', 4, '8', 90, '60kg'),
    ex('Tirage vertical poulie', 4, '10', 90, '50kg'),
    ex('Curl barre', 4, '10', 75, '30kg'),
    ex('Curl marteau', 3, '12', 60, '12kg'),
    ex('Face pulls', 3, '15', 60, '20kg'),
  ],
};
const MASS_LEGS: ProgramDay = {
  rest: false,
  title: 'Jambes lourd',
  exercises: [
    ex('Squat barre', 5, '5', 150, '100kg'),
    ex('Soulevé de terre roumain', 4, '8', 120, '90kg'),
    ex('Presse à cuisses', 4, '10', 90, '160kg'),
    ex('Fentes barre', 3, '10 par jambe', 75, '30kg'),
    ex('Extensions mollets', 4, '15', 45, '60kg'),
    ex('Leg curl', 3, '12', 60, '40kg'),
  ],
};
const MASS_ARMS: ProgramDay = {
  rest: false,
  title: 'Bras & Épaules focus',
  exercises: [
    ex('Développé militaire haltères', 4, '10', 75, '20kg'),
    ex('Curl pupitre', 4, '10', 60, '25kg'),
    ex('Extensions triceps corde', 4, '12', 60, '25kg'),
    ex('Curl haltères', 3, '12', 60, '12kg'),
    ex('Pushdown triceps', 3, '15', 60, '30kg'),
    ex('Élévations frontales', 3, '15', 45, '6kg'),
  ],
};

const MASS_ROTATION = [MASS_PUSH, MASS_PULL, MASS_LEGS, MASS_ARMS];

const buildMass30 = (): ProgramDay[] => {
  const days: ProgramDay[] = [];
  let ri = 0;
  for (let d = 1; d <= 30; d++) {
    // 1 jour de repos tous les 5 jours (jours 5, 10, 15, 20, 25, 30)
    if (d % 5 === 0) {
      days.push(rest(d));
    } else {
      days.push({ ...MASS_ROTATION[ri % MASS_ROTATION.length] });
      ri++;
    }
  }
  return days;
};

export const PROGRAMS: Program[] = [
  {
    id: 'fullbody-30',
    title: 'Full Body 30 jours',
    description:
      "Un programme équilibré qui alterne haut du corps, bas du corps et cardio. Idéal si tu débutes ou reprends le sport.",
    durationDays: 30,
    level: 'debutant',
    goal: 'Remise en forme complète',
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
    coverEmoji: '🏋️',
    color: '#E53935',
    days: buildMass30(),
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export const LEVEL_LABEL: Record<ProgramLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};
