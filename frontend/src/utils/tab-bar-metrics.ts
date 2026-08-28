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
