import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { coloredShadow, shadow, withAlpha } from "@/src/theme";
import { GlassLevel, useTheme } from "@/src/themes";

/**
 * Remplacement direct des `View`+styles ad hoc des cartes de l'app.
 * Mode "flat" (Classique) : pur passe-plat — le `style` de l'appelant
 * (fond/bordure/radius déjà définis là-bas) s'applique tel quel, rendu
 * byte-identique à avant l'introduction du système de thèmes. Mode "glass"
 * (Sunset) : flou (`expo-blur`, déjà dépendance) + teinte semi-transparente
 * + radius généreux + ombre + reflet supérieur discret — le `style` de
 * l'appelant reste appliqué pour la mise en page (padding/gap/bordure
 * d'accent type `borderLeftColor`), seules les propriétés de fond/bordure
 * générale/radius sont reprises.
 *
 * `level` (Sunset uniquement, défaut `"card"`) : palier de profondeur du
 * système Liquid Glass — voir `GlassLevel` dans `src/themes/types.ts`.
 * `"subtle"` pour une zone secondaire/ligne de liste, `"card"` pour une
 * carte de contenu normale, `"elevated"` pour l'élément le plus important
 * d'un écran (à combiner avec `<Card elevated>` pour l'ombre assortie).
 *
 * `accent` (optionnel, additif) : couleur de mise en avant pour les niveaux
 * "actif"/"important" du système Liquid Glass — bordure teintée + lueur
 * douce de cette couleur, à la place de la bordure neutre par défaut. En
 * mode "flat" (Classique), se réduit à une simple bordure de cette couleur
 * (pas de lueur/flou — cohérent avec un thème plat) : même résultat visuel
 * qu'un appelant qui aurait ajouté `{ borderColor: accent }` lui-même, pour
 * qu'un même call site fonctionne identiquement dans les deux thèmes.
 * Réservé aux éléments qui doivent vraiment ressortir (élément sélectionné,
 * record personnel, objectif atteint) — jamais une carte ordinaire.
 */
export default function GlassCard({
  children,
  style,
  testID,
  accent,
  level = "card",
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accent?: string;
  level?: GlassLevel;
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
      <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: accent ? withAlpha(accent, 10) : tint },
        ]}
      />
      {/* Reflet supérieur — presque imperceptible, juste assez pour lire
          "verre" plutôt que "panneau teinté". Teinte légèrement froide
          (bleu très désaturé) plutôt que blanc pur, cohérent avec l'idée
          d'une lumière glacière qui vient d'en haut. Jamais un dégradé
          marqué. */}
      <LinearGradient
        colors={["rgba(210,230,255,0.16)", "rgba(210,230,255,0)"]}
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
