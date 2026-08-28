import { Image, StyleSheet } from "react-native";
import { useTheme } from "./ThemeProvider";
import AuroraBackground from "@/src/components/backgrounds/AuroraBackground";

/**
 * Fond plein écran piloté par le thème actif — un calque `absoluteFill`
 * SANS enfants, à monter comme premier enfant de CHAQUE écran qui en a
 * besoin (Dashboard, `/day-detail`), pas une seule fois au niveau du layout
 * des onglets. Rendu `null` en mode "flat" (Classique) : l'écran garde alors
 * son propre fond opaque habituel (`theme.colors.surface`), inchangé.
 *
 * Pourquoi PAS un montage unique partagé (comme avant) : `@react-navigation/
 * bottom-tabs` garde TOUS les écrans d'onglets montés simultanément,
 * empilés via `position:"absolute"` + `zIndex` (l'onglet actif à 0, les
 * autres à -1) — ça ne fonctionne QUE si l'écran actif est opaque et masque
 * ainsi ceux derrière lui. Un fond partagé unique, placé une seule fois
 * derrière tout `<Tabs>`, ne peint qu'UNE couche tout en bas de la pile :
 * il ne rend pas chaque écran individuellement opaque, donc un écran voisin
 * resté monté (zIndex -1) reste visible PAR TRANSPARENCE à travers l'écran
 * actif si celui-ci a un fond transparent — bug confirmé (contenu de l'onglet
 * précédent visible en superposition au retour sur le Dashboard). En montant
 * ce calque comme premier enfant DE CHAQUE écran concerné, cet écran peint
 * lui-même la totalité de sa propre boîte (déjà dimensionnée pile sur la
 * fenêtre par le `absoluteFill` que react-navigation applique à chaque
 * écran), ce qui le rend réellement opaque et rétablit l'hypothèse dont
 * react-navigation a besoin — plus besoin non plus du hack CSS `position:
 * "fixed"` utilisé avant : la boîte parente (l'écran lui-même) est déjà
 * correctement bornée, sans la dérive de hauteur observée quand le calque
 * vivait plus haut dans une chaîne `flex:1` non bornée côté web.
 *
 * Fond d'écran (Sunset) : l'image personnalisée choisie dans Réglages >
 * Apparence (`wallpaperUri`, déjà résolue par `ThemeProvider`) si elle
 * existe, sinon "IronFlow Aurora" (`AuroraBackground`, généré en code —
 * remplace l'ancienne image statique par défaut).
 */
export default function ThemedBackground() {
  const { theme, wallpaperUri } = useTheme();

  if (theme.background.mode !== "gradient") return null;

  if (wallpaperUri) {
    return <Image source={{ uri: wallpaperUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />;
  }

  return <AuroraBackground />;
}
