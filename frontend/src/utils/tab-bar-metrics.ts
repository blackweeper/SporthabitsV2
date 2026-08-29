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

/** Espace total réellement occupé par la barre d'onglets depuis le bas de
 * l'écran — à utiliser par tout élément qui doit se positionner juste
 * au-dessus d'elle (FAB, mini-lecteur radio, padding de scroll) plutôt que
 * de reconstituer l'arithmétique `SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT` à
 * la main. La barre flottante en pilule est commune aux deux thèmes (voir
 * `_layout.tsx`) — l'inset bas ne s'ajoute pas : elle garde une marge fixe
 * (`SUNSET_BAR_MARGIN`) quel que soit l'inset, l'ajouter ne ferait que
 * l'éloigner inutilement du bord sans rien résoudre (la bande noire
 * observée sous l'app venait d'un bug de hauteur du conteneur racine,
 * corrigé dans `scripts/patch-web-build.js`, pas d'un mauvais calcul ici). */
export function tabBarSafeBottomOffset(): number {
  return SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT;
}
