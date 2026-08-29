/**
 * Forme d'un thème — voir `src/themes/classic.ts` (byte-identique à
 * `src/theme.ts` existant) et `src/themes/sunset.ts` (nouveau look). Tout
 * `app/*.tsx` consomme désormais ceci via `useTheme()` (voir
 * `ThemeProvider.tsx`) — `src/theme.ts` (les valeurs statiques historiques)
 * ne sert plus que de valeurs par défaut à `classic.ts`.
 */

/** Une couleur simple, ou un dégradé 2 stops (extrémité1 → extrémité2) pour
 * un anneau/trait SVG — voir `MultiRingGauge.tsx`/`RingChip.tsx`. */
export type RingColor = string | [string, string];

export type MetricColorSet = {
  caloriesBurn: RingColor;
  steps: RingColor;
  sleep: RingColor;
  training: RingColor;
};

/** Couleurs "sémantiques de données" — distinctes de l'accent `brand` du
 * thème : un graphique/badge choisit sa couleur selon CE QUE la donnée
 * représente (force, cardio, performance...), jamais selon le thème actif.
 * Sous Classique, ces clés pointent vers les hex déjà existants (aucun
 * changement visuel) ; sous Sunset, vers la palette dédiée du brief Liquid
 * Glass. Consommé par les graphiques (`progression.tsx`, `exercise/[name]`)
 * et par tout badge qui doit distinguer visuellement plusieurs catégories de
 * données sans que tout devienne la couleur d'accent du thème. */
export type DataColorSet = {
  strength: string;
  cardio: string;
  performance: string;
  success: string;
  energy: string;
  achievement: string;
  danger: string;
  /** Identité visuelle unique du WOD (Workout of the Day) — badges
   * d'intensité, bouton "Lancer"/"WOD aléatoire", carte WOD dans
   * Entraînements/Dashboard/Performance. Un seul token pour tous ces
   * endroits (au lieu de `warning`/`brand` mélangés selon l'écran) : évite
   * qu'un même concept ("ceci est un WOD") porte une couleur différente
   * selon où on le regarde. */
  workout: string;
};

export type ThemeColors = {
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  onSurface: string;
  onSurfaceSecondary: string;
  onSurfaceTertiary: string;
  brand: string;
  brandSecondary: string;
  brandTertiary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  scheduleBoth: string;
  progress: string;
  progressSecondary: string;
  progressTertiary: string;
  border: string;
  borderStrong: string;
  divider: string;
  overlay: string;
  /** Piste (portion non remplie) des anneaux de progression
   * (`MultiRingGauge`/`RingChip`) — distinct de `surfaceTertiary` : Sunset
   * veut une piste translucide qui laisse deviner le fond/l'effet glass
   * derrière elle plutôt qu'un disque sombre plein, sans quoi l'anneau
   * détonne (trop sombre) sur un fond lumineux. */
  ringTrack: string;
  metricColors: MetricColorSet;
  data: DataColorSet;
};

export type ThemeRadius = { sm: number; md: number; lg: number; pill: number };
export type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xl2: number;
  xl3: number;
};

export type ThemeBackground =
  | { mode: "flat" }
  | { mode: "gradient"; colors: string[]; locations?: number[] };

export type ThemeCard =
  | { mode: "flat" }
  | { mode: "glass"; tint: string; blurIntensity: number };

/** Trois paliers de profondeur du système Liquid Glass (Sunset uniquement —
 * ignorés par construction sous Classique, `card.mode==="flat"` court-
 * circuite avant qu'ils ne soient lus) :
 * - `subtle` : zones secondaires, lignes de liste, chips inactifs — à peine
 *   visible, laisse le fond dominer.
 * - `card` : la carte "par défaut" — identique à `card.tint`/`blurIntensity`
 *   ci-dessus (même valeur, gardée aussi ici pour que tout composant Glass
 *   puisse choisir un palier par un seul champ `level` sans cas particulier).
 * - `elevated` : élément mis en avant (carte héros, badge important, sheet
 *   modale) — tint et flou plus marqués, mais jamais opaque.
 * Voir `GlassCard.tsx` (`level` prop) et `GlassChip.tsx`. */
export type GlassLevel = "subtle" | "card" | "elevated";
export type GlassLevelStyle = { tint: string; blurIntensity: number };
export type ThemeGlass = Record<GlassLevel, GlassLevelStyle>;

/** Timing = comportement actuel (`Easing.out(Easing.cubic)`, seule la durée
 * varie) ; spring = remplissage "rebondissant" (Sunset). Voir `RingLayer`
 * dans `MultiRingGauge.tsx`. */
export type RingFillConfig =
  | { type: "timing"; duration: number }
  | { type: "spring"; damping: number; stiffness: number };

/** Palette du fond d'ambiance généré en code (`AuroraBackground.tsx`) —
 * base quasi-noire + 3 zones de lumière diffuse (voir ce fichier pour la
 * structure exacte, commune aux deux thèmes). Chaque thème fournit ses
 * propres teintes ; la géométrie/le flou/la vignette restent identiques. */
export type AuroraPalette = {
  base: string;
  deepGradientTop: string;
  glowPrimary: string;
  glowPrimaryDim: string;
  glowSecondary: string;
  glowTertiary: string;
};

export type Theme = {
  id: string;
  label: string;
  /** Pastille de couleur représentative pour le sélecteur de thème. */
  swatch: string;
  colors: ThemeColors;
  radius: ThemeRadius;
  spacing: ThemeSpacing;
  background: ThemeBackground;
  card: ThemeCard;
  glass: ThemeGlass;
  ringFill: RingFillConfig;
  aurora: AuroraPalette;
};
