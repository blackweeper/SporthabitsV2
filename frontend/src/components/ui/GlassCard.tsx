import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { coloredShadow, shadow, withAlpha } from "@/src/theme";
import { GlassLevel, useTheme } from "@/src/themes";

/**
 * Remplacement direct des `View`+styles ad hoc des cartes de l'app —
 * l'unique implémentation Liquid Glass, commune aux deux thèmes (voir
 * `classic.ts`/`sunset.ts`, tous deux `card.mode === "glass"` désormais) :
 * flou (`expo-blur`) + teinte semi-transparente + radius généreux + ombre +
 * reflet supérieur discret, chaque valeur venant de `theme.glass`/
 * `theme.colors` — jamais un `if (theme.id === ...)` ici. Le `style` de
 * l'appelant reste appliqué pour la mise en page (padding/gap/bordure
 * d'accent type `borderLeftColor`), seules les propriétés de fond/bordure
 * générale/radius sont reprises. `card.mode === "flat"` (repli défensif,
 * aucun thème livré ne l'utilise aujourd'hui) reste un pur passe-plat.
 *
 * `level` (défaut `"card"`) : palier de profondeur du système Liquid Glass —
 * voir `GlassLevel` dans `src/themes/types.ts`. `"subtle"` pour une zone
 * secondaire/ligne de liste, `"card"` pour une carte de contenu normale,
 * `"elevated"` pour l'élément le plus important d'un écran (à combiner avec
 * `<Card elevated>` pour l'ombre assortie).
 *
 * `accent` (optionnel, additif) : couleur de mise en avant pour les niveaux
 * "actif"/"important" du système Liquid Glass — bordure teintée + lueur
 * douce de cette couleur, à la place de la bordure neutre par défaut.
 * Réservé aux éléments qui doivent vraiment ressortir (élément sélectionné,
 * record personnel, objectif atteint) — jamais une carte ordinaire.
 *
 * `blur` (optionnel, défaut `true`) : désactive le `BlurView` (backdrop-
 * filter) tout en gardant la teinte/bordure/reflet — donc le même rendu
 * "verre" visuellement, sans échantillonnage du fond. Nécessaire pour toute
 * carte rendue à l'intérieur d'un ancêtre transformé en continu (ex.
 * `Swipeable` de react-native-gesture-handler, qui enveloppe son contenu
 * dans une vue animée `transform:[{translateX}]` même au repos) : sur
 * WebKit, un ancêtre avec `transform` casse la composition de
 * `backdrop-filter` (l'élément flouté n'échantillonne plus le vrai contenu
 * derrière lui et rend un pavé opaque à la place) — cause racine confirmée
 * du bug "rectangle flouté/noir illisible" sur les listes à swipe
 * (Sessions/WOD/séances individuelles, toutes enveloppées par
 * `SwipeableRow`). Passer `blur={false}` sur toute `GlassCard` qui vit à
 * l'intérieur d'un `SwipeableRow` — le niveau `"subtle"` déjà utilisé pour
 * ces lignes a une teinte si légère (~3-3.5% d'opacité) que l'absence de
 * flou réel y est visuellement imperceptible.
 */
export default function GlassCard({
  children,
  style,
  testID,
  accent,
  level = "card",
  blur = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accent?: string;
  level?: GlassLevel;
  blur?: boolean;
}) {
  const { theme } = useTheme();

  if (theme.card.mode === "flat") {
    return (
      <View testID={testID} style={[style, accent && { borderColor: accent }]}>
        {children}
      </View>
    );
  }

  const { tint, blurIntensity } = theme.glass[level];

  // Pas d'accent explicite : "subtle" reste à fleur du fond (aucune ombre —
  // une ligne de liste ne doit jamais paraître flotter), "card" garde
  // l'ombre neutre déjà validée, "elevated" gagne un halo Glacier Blue très
  // doux et ambiant (jamais un néon) — c'est ce qui donne aux cartes
  // importantes (héros, modales, CTA) leur sensation de profondeur/lumière
  // froide même sans couleur de sélection explicite (brief "Glacier Aurora").
  const defaultShadow =
    level === "elevated"
      ? coloredShadow(theme.colors.brand, { offsetY: 6, opacity: 0.16, radius: 20, elevation: 5 })
      : level === "subtle"
        ? undefined
        : shadow.card;

  return (
    <View
      testID={testID}
      style={[
        style,
        {
          backgroundColor: "transparent",
          borderColor: accent ? withAlpha(accent, 45) : theme.colors.borderStrong,
          borderWidth: accent ? 1 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          ...(accent
            ? coloredShadow(accent, { offsetY: 0, opacity: 0.2, radius: 14, elevation: 4 })
            : defaultShadow),
        },
      ]}
    >
      {blur && <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          blur
            ? { backgroundColor: accent ? withAlpha(accent, 10) : tint }
            // Sans backdrop-filter, la teinte "glass" (2-8% d'opacité) ne
            // suffit plus à lire une surface — bascule sur le fond opaque
            // déjà utilisé ailleurs pour le mode non-glass, pour un rendu
            // "carte" cohérent sans dépendre d'un flou réel.
            : { backgroundColor: accent ? withAlpha(accent, 16) : theme.colors.surfaceSecondary },
        ]}
      />
      {/* Reflet supérieur — presque imperceptible, juste assez pour lire
          "verre" plutôt que "panneau teinté". Blanc neutre désaturé (pas de
          dominante de teinte) pour rester cohérent que le thème actif soit
          froid (Glacier Aurora) ou chaud (Classique/Ember) — jamais un
          dégradé marqué. */}
      <LinearGradient
        colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0)"]}
        style={styles.highlight}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 28,
  },
});
