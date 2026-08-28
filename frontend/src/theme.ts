import { Platform } from 'react-native';

export const colors = {
  surface: '#0E0E0E',
  surfaceSecondary: '#1A1A1A',
  surfaceTertiary: '#242424',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: '#E0E0E0',
  onSurfaceTertiary: '#9A9A9A',
  brand: '#FF3D00',
  brandSecondary: '#FF7A4D',
  brandTertiary: '#4D1200',
  success: '#00E676',
  warning: '#FFC400',
  error: '#FF1744',
  // Sémantique : bleu = information, violet = progression — pour que le
  // regard distingue naturellement "à faire" (orange) de "déjà acquis /
  // en cours d'évolution" (violet), au lieu de tout peindre en orange.
  info: '#3B82F6',
  // Coloration du calendrier quand cardio ET gym sont prévus le même jour
  // (voir `calendar-day-schedule.ts`) — jaune, distinct du bleu cardio et de
  // l'orange gym/`brand`, jamais réutilisé pour un autre sens ailleurs.
  scheduleBoth: '#EAB308',
  progress: '#8B5CF6',
  progressSecondary: '#C4B5FD',
  progressTertiary: '#2E1F52',
  border: '#2A2A2A',
  borderStrong: '#3A3A3A',
  divider: '#1E1E1E',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

// Ombre discrète réservée aux cartes "hero" (Score, XP, Streak) — jamais aux
// lignes de liste plates, pour garder l'app minimaliste. `elevated` sert aux
// éléments flottants (FAB, sheets) qui ont déjà un besoin de profondeur plus
// marquée. Spread directement dans un StyleSheet.create (`...shadow.card`).
// Web (react-native-web) déprécie les props `shadow*` au profit de
// `boxShadow` (CSS) ; iOS/Android ne comprennent pas `boxShadow` et gardent
// l'API native (`shadow*` + `elevation`) — d'où la double définition ici,
// pour ne jamais avoir à y repenser ailleurs dans le code.
export const shadow = {
  card:
    Platform.OS === 'web'
      ? { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 3,
        },
  elevated:
    Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.35)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 6,
        },
} as const;

// Constantes d'animation partagées — courtes par construction pour qu'aucune
// micro-interaction ne ralentisse l'app perçue.
/** Same web/native split as `shadow` above, for the handful of "bespoke"
 * colored shadows (FAB, Streak hero) that match their own background color
 * instead of the neutral black `shadow.card`/`shadow.elevated` — kept as a
 * helper rather than duplicating the Platform.OS branch at each call site. */
export function coloredShadow(
  color: string,
  {
    offsetY = 4,
    opacity = 0.3,
    radius = 8,
    elevation = 4,
  }: { offsetY?: number; opacity?: number; radius?: number; elevation?: number } = {},
) {
  if (Platform.OS === 'web') {
    const alphaHex = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0');
    return { boxShadow: `0px ${offsetY}px ${radius}px ${color}${alphaHex}` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

/** `color + "26"`-style hex-alpha concatenation appeared hand-rolled at
 * ~12 call sites across the app (tinted chip backgrounds, badge fills) —
 * this is the one shared helper, so a call site reads as "20% opacity"
 * instead of an opaque two-digit hex literal. `pct` is 0-100. */
export function withAlpha(color: string, pct: number): string {
  const alphaHex = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${alphaHex}`;
}

/** Réduit une `RingColor` (`string | [string,string]`, voir `themes/types.ts`)
 * à une seule couleur solide — pour tout consommateur qui ne peut pas rendre
 * un dégradé (icône, texte, `withAlpha`). Prend le 2e stop d'un dégradé
 * (la teinte la plus saturée, cohérent avec `solidRingColor` déjà dupliqué
 * localement dans `index.tsx` avant l'introduction de ce helper partagé). */
export function solidColor(color: string | readonly [string, string]): string {
  return Array.isArray(color) ? color[1] : (color as string);
}

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xl2: 32,
  xl3: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  // System fonts as fallback for Barlow Condensed / Manrope
  display: 'System',
  body: 'System',
} as const;
