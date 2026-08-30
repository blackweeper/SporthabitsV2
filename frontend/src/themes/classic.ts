import { Theme } from "./types";

/**
 * Thème "Classique" — même Design System IronFlow que "Glacier Aurora"
 * (Liquid Glass, fond d'ambiance généré, anneaux en dégradé à remplissage
 * spring, rayons/glass à 3 paliers) mais avec l'identité colorimétrique
 * Classique d'origine (orange/rouge, surfaces neutres) plutôt que la
 * palette glacier/bleu de Sunset. Un changement de thème ne doit changer
 * QUE ceci — jamais la disposition, jamais le composant utilisé (voir
 * `app/(tabs)/index.tsx` et les autres écrans : plus aucune branche
 * `theme.id === "sunset"` de mise en page, uniquement des valeurs de
 * token qui diffèrent).
 *
 * Toute valeur ci-dessous qui n'est PAS une couleur (radius, ringFill,
 * structure glass à 3 paliers) est volontairement alignée sur Sunset —
 * c'est la même règle "le layout est commun" appliquée aux tokens
 * structurels. Seules les couleurs restent celles de l'identité Classique
 * (`brand`/`success`/`warning`/`error`/`info`/`progress`, `data.*`,
 * `metricColors.*` inchangés dans leur teinte).
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
    // Blanc translucide (même structure que Sunset) plutôt qu'un gris
    // opaque — cohérent avec le fond d'ambiance/glass désormais commun aux
    // deux thèmes ; sur une base aussi sombre, le rendu perçu est
    // pratiquement identique aux anciens gris (#E0E0E0/#9A9A9A), donc aucune
    // perte de lisibilité.
    onSurfaceSecondary: "rgba(255,255,255,0.68)",
    onSurfaceTertiary: "rgba(255,255,255,0.44)",
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
    // Bordures translucides (structure Liquid Glass commune) plutôt
    // qu'opaques — même alpha que Sunset, teinte neutre (pas de dominante
    // bleue) pour rester dans l'identité Classique.
    border: "rgba(255,255,255,0.12)",
    borderStrong: "rgba(255,255,255,0.18)",
    divider: "rgba(255,255,255,0.08)",
    overlay: "rgba(0,0,0,0.6)",
    // Piste translucide (laisse deviner le fond/glass derrière) — même
    // valeur que Sunset, un track d'anneau est un élément neutre, pas une
    // couleur d'identité.
    ringTrack: "rgba(255,255,255,0.20)",
    // Platine chaud opaque — badge du rang NOVICE (voir le commentaire sur
    // `rankNeutral` dans `types.ts`), cohérent avec la dominante chaude de
    // Classique plutôt qu'un gris neutre froid.
    rankNeutral: "#C9C2B4",
    // Dégradés 2 tons (même structure que Sunset) construits UNIQUEMENT à
    // partir des teintes Classique déjà existantes — aucune nouvelle
    // couleur introduite, juste le même traitement "riche" que Sunset.
    metricColors: {
      caloriesBurn: ["#D97706", "#B45309"],
      steps: ["#34D399", "#10B981"],
      sleep: ["#A78BFA", "#8B5CF6"],
      training: ["#6EE7A8", "#10B981"],
    },
    data: {
      strength: "#FF3D00",
      cardio: "#3B82F6",
      performance: "#8B5CF6",
      success: "#00E676",
      energy: "#FFC400",
      achievement: "#FF7A4D",
      danger: "#FF1744",
      // Framboise/magenta — délibérément hors de la famille chaude
      // rouge/orange/jaune déjà saturée par `strength`/`energy`/`achievement`/
      // `danger` : un ancien choix ambré (#FFB300) restait quasi indissociable
      // de `energy`/`warning` (#FFC400) au premier coup d'œil, exactement ce
      // que l'identité WOD doit éviter. Premium, immédiatement identifiable,
      // jamais confondu avec une couleur d'erreur/avertissement/calories.
      workout: "#DB2777",
    },
    // 4 phases de sommeil (fiche Sommeil) — dérivées de la famille
    // violette déjà utilisée pour `progress`/`metricColors.sleep`, du plus
    // sombre/froid (Profond) au plus clair (Éveil) ; REM tranche sur le bleu
    // `info` déjà existant plutôt qu'une nuance de violet supplémentaire, pour
    // rester "distinctive" comme demandé.
    sleepStages: {
      deep: "#4C1D95",
      light: "#8B5CF6",
      rem: "#3B82F6",
      awake: "#FFC400",
    },
  },
  // Rayons alignés sur Sunset — le layout (dont les rayons de coin) est
  // commun aux deux thèmes, seule la couleur doit varier.
  radius: { sm: 8, md: 16, lg: 26, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xl2: 32, xl3: 48 },
  background: {
    mode: "gradient",
    colors: ["#0C0906", "#2B0F03", "#1E1030", "#0C0906"],
    locations: [0, 0.35, 0.7, 1],
  },
  // Verre "Liquid Glass" Classique — teinte chaude très légèrement ambrée
  // (au lieu du blanc-bleuté de Sunset), même structure/opacité/flou.
  card: { mode: "glass", tint: "rgba(255,205,170,0.05)", blurIntensity: 30 },
  glass: {
    subtle: { tint: "rgba(255,190,150,0.032)", blurIntensity: 16 },
    card: { tint: "rgba(255,205,170,0.05)", blurIntensity: 30 },
    elevated: { tint: "rgba(255,215,185,0.08)", blurIntensity: 40 },
  },
  ringFill: { type: "spring", damping: 14, stiffness: 120 },
  // "IronFlow Ember" — même structure que "IronFlow Aurora" (base + 3
  // zones de lumière diffuse + flou + vignette, voir `AuroraBackground.tsx`),
  // construite exclusivement à partir des teintes Classique déjà existantes
  // (brand/brandSecondary/progress/caloriesBurn) : aucune nouvelle couleur
  // introduite pour ce nouvel élément visuel.
  aurora: {
    base: "#0C0906",
    deepGradientTop: "#2B0F03",
    glowPrimary: "#FF7A4D",
    glowPrimaryDim: "#FF3D00",
    glowSecondary: "#8B5CF6",
    glowTertiary: "#B45309",
  },
};
