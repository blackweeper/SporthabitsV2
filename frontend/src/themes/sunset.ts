import { Theme } from "./types";

/**
 * Thème "Sunset" — inspiré de la capture de référence (fond dégradé
 * brun/noir → orange chaud, anneaux en dégradé, cartes glassmorphism,
 * remplissage spring). N'affecte que le Dashboard/`/day-detail`/la barre
 * d'onglets (voir `ThemeProvider`/`ThemedBackground`) — le reste de l'app
 * reste sur le rendu "Classique" tant qu'il n'est pas migré.
 */
export const sunsetTheme: Theme = {
  id: "sunset",
  label: "Sunset",
  swatch: "#FF8A3D",
  colors: {
    surface: "#1A0F0B",
    surfaceSecondary: "#241510",
    surfaceTertiary: "#2E1B13",
    onSurface: "#FFFFFF",
    onSurfaceSecondary: "#E9DDD3",
    onSurfaceTertiary: "#B7A296",
    brand: "#FF8A3D",
    brandSecondary: "#FFB380",
    brandTertiary: "#5C2A11",
    success: "#4ADE80",
    warning: "#FBBF24",
    error: "#FF5A5A",
    info: "#4FC3F7",
    scheduleBoth: "#FBBF24",
    progress: "#8B5CF6",
    progressSecondary: "#C4B5FD",
    progressTertiary: "#2E1F52",
    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.16)",
    divider: "rgba(255,255,255,0.08)",
    overlay: "rgba(0,0,0,0.6)",
    // Blanc translucide plutôt qu'un disque sombre plein (retour
    // utilisateur : les anneaux détonnaient, trop sombres sur ce fond) —
    // laisse deviner le fond/l'effet glass à travers la piste, cohérent
    // avec le reste du thème plutôt qu'un simple `surfaceTertiary` sombre.
    ringTrack: "rgba(255,255,255,0.20)",
    metricColors: {
      caloriesBurn: ["#FFB347", "#FF6B1A"],
      steps: ["#7DD3FC", "#2563EB"],
      sleep: ["#C4B5FD", "#6D28D9"],
      training: ["#86EFAC", "#16A34A"],
      score: ["#FFA451", "#B23B00"],
    },
  },
  radius: { sm: 8, md: 16, lg: 26, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xl2: 32, xl3: 48 },
  // `mode:"gradient"` reste le signal utilisé ailleurs (ex. transparence du
  // `SafeAreaView` des écrans migrés) pour "ce thème a un fond non-plat" —
  // mais depuis l'ajout des fonds d'écran personnalisables, `ThemedBackground`
  // affiche par défaut l'image embarquée (`assets/wallpapers/sunset-default.jpg`)
  // ou le fond choisi par l'utilisateur, jamais ce dégradé directement : ces
  // couleurs ne sont plus lues nulle part, gardées ici comme trace de
  // l'ancien fond par défaut (dégradé "aurora" bleu → rose → orange).
  background: {
    mode: "gradient",
    colors: ["#7C8FEA", "#E4E9F0", "#FF4FA0", "#FFA95E", "#9C86E3"],
    locations: [0, 0.2, 0.45, 0.7, 1],
  },
  // Effet verre plus léger (retour utilisateur : trop sombre, masquait le
  // fond) — tint fortement allégé + flou réduit pour une vraie transparence
  // qui laisse le dégradé donner le ton, tout en gardant un minimum de
  // contraste pour le texte des cartes.
  card: { mode: "glass", tint: "rgba(40,25,45,0.22)", blurIntensity: 22 },
  ringFill: { type: "spring", damping: 14, stiffness: 120 },
};
