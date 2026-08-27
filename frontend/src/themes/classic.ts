import { Theme } from "./types";

/**
 * Thème "Classique" — recopie exacte des valeurs de `src/theme.ts` (jamais
 * modifié). Garantit que le Dashboard/`/day-detail`/la barre d'onglets
 * rendent de façon byte-identique à avant l'introduction du système de
 * thèmes tant que ce thème est sélectionné (défaut).
 */
export const classicTheme: Theme = {
  id: "classic",
  label: "Classique",
  swatch: "#FF3D00",
  colors: {
    surface: "#0E0E0E",
    surfaceSecondary: "#1A1A1A",
    surfaceTertiary: "#242424",
    onSurface: "#FFFFFF",
    onSurfaceSecondary: "#E0E0E0",
    onSurfaceTertiary: "#9A9A9A",
    brand: "#FF3D00",
    brandSecondary: "#FF7A4D",
    brandTertiary: "#4D1200",
    success: "#00E676",
    warning: "#FFC400",
    error: "#FF1744",
    info: "#3B82F6",
    scheduleBoth: "#EAB308",
    progress: "#8B5CF6",
    progressSecondary: "#C4B5FD",
    progressTertiary: "#2E1F52",
    border: "#2A2A2A",
    borderStrong: "#3A3A3A",
    divider: "#1E1E1E",
    overlay: "rgba(0,0,0,0.6)",
    // Même valeur que l'actuel `colors.surfaceTertiary` codé en dur dans
    // `MultiRingGauge.tsx` — rendu byte-identique à avant.
    ringTrack: "#242424",
    // Mêmes couleurs que les valeurs codées en dur actuelles du Dashboard
    // (`"#F97316"` Calories, `"#10B981"` Pas, `colors.progress` Sommeil) —
    // migrer ces call sites vers ce set ne change donc rien visuellement.
    metricColors: {
      caloriesBurn: "#F97316",
      steps: "#10B981",
      sleep: "#8B5CF6",
      training: "#10B981",
      score: "#FF3D00",
    },
  },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xl2: 32, xl3: 48 },
  background: { mode: "flat" },
  card: { mode: "flat" },
  ringFill: { type: "timing", duration: 500 },
};
