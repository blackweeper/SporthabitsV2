/**
 * Dimensions de la barre d'onglets, partagées entre `app/(tabs)/_layout.tsx`
 * (qui les applique) et tout composant monté hors de ce groupe d'écrans qui a
 * besoin de se positionner au-dessus (ex. `MiniRadioPlayer`) — extraites ici
 * plutôt qu'importées directement depuis un fichier de route, pour ne jamais
 * dépendre de la façon dont Expo Router traite les exports d'un fichier
 * `_layout.tsx`.
 */
export const SUNSET_BAR_HEIGHT = 64;
export const SUNSET_BAR_MARGIN = 14;
export const CLASSIC_BAR_HEIGHT = 72;

/** Espace total réellement occupé par la barre d'onglets depuis le bas de
 * l'écran, home indicator inclus — à utiliser par tout élément qui doit se
 * positionner juste au-dessus d'elle (FAB, mini-lecteur radio, padding de
 * scroll) plutôt que de reconstituer l'arithmétique `SUNSET_BAR_MARGIN +
 * SUNSET_BAR_HEIGHT`/`CLASSIC_BAR_HEIGHT` à la main sans l'inset bas. */
export function tabBarSafeBottomOffset(isSunset: boolean, insetsBottom: number): number {
  return (isSunset ? SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT : CLASSIC_BAR_HEIGHT) + insetsBottom;
}
