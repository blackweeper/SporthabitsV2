/**
 * Forme d'un thème — voir `src/themes/classic.ts` (byte-identique à
 * `src/theme.ts` existant) et `src/themes/sunset.ts` (nouveau look). Seuls
 * le Dashboard, `/day-detail` et la barre d'onglets consomment ceci via
 * `useTheme()` (voir `ThemeProvider.tsx`) — le reste de l'app continue
 * d'importer les valeurs statiques de `src/theme.ts`, inchangées.
 */

/** Une couleur simple, ou un dégradé 2 stops (extrémité1 → extrémité2) pour
 * un anneau/trait SVG — voir `MultiRingGauge.tsx`/`RingChip.tsx`. */
export type RingColor = string | [string, string];

export type MetricColorSet = {
  caloriesBurn: RingColor;
  steps: RingColor;
  sleep: RingColor;
  training: RingColor;
  score: RingColor;
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

/** Timing = comportement actuel (`Easing.out(Easing.cubic)`, seule la durée
 * varie) ; spring = remplissage "rebondissant" (Sunset). Voir `RingLayer`
 * dans `MultiRingGauge.tsx`. */
export type RingFillConfig =
  | { type: "timing"; duration: number }
  | { type: "spring"; damping: number; stiffness: number };

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
  ringFill: RingFillConfig;
};
