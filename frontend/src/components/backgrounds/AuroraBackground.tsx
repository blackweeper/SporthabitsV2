import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";

/**
 * Fond d'ambiance généré en code — base quasi-noire + 3 grandes zones de
 * lumière diffuse, fondues par un vrai flou (`BlurView`, la même technique
 * que `GlassCard`) plutôt qu'un dégradé simulé : jamais de séparation
 * visible entre les couleurs. Entièrement paramétré par `theme.aurora` —
 * même structure/géométrie/flou pour les deux thèmes ("IronFlow Aurora"
 * sous Sunset, teintes glacier/violet/cyan ; "IronFlow Ember" sous
 * Classique, teintes braise orange/violet/ambre), seule la palette change
 * (voir `src/themes/{classic,sunset}.ts`, champ `aurora`).
 *
 * Sombre et sobre par construction : les zones de couleur sont peintes à
 * faible opacité PUIS diffusées par un flou fort, pas l'inverse — le
 * résultat doit rester ~80% sombre/15% couleur profonde/5% lumière
 * perceptible ("ressentie plus que vue"), jamais un blob net, un néon ou une
 * couleur saturée.
 *
 * Monté par `ThemedBackground` comme fond PAR DÉFAUT de tout thème dont
 * `background.mode === "gradient"` — remplacé par le fond d'écran
 * personnalisé de l'utilisateur s'il en a choisi un (`wallpaper-storage.ts`,
 * inchangé). Volontairement statique (aucune `Animated.Value`) : un fond ne
 * doit jamais redemander de repaint continu.
 */
export default function AuroraBackground() {
  const { theme } = useTheme();
  const palette = theme.aurora;
  const { width, height } = useWindowDimensions();
  const size = Math.max(width, height);
  // Diamètres proportionnels à l'écran, positionnés à cheval sur les bords —
  // la moitié hors-champ élimine déjà toute arête visible avant même le
  // flou qui diffuse le reste.
  const topLeftSize = size * 1.0;
  const topRightSize = size * 0.9;
  const bottomSize = size * 0.85;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.base }]} />
      <LinearGradient
        colors={[palette.deepGradientTop, palette.base]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Zones lumineuses — peintes AVANT le flou pour être diffusées par lui. */}
      <LinearGradient
        colors={[withAlpha(palette.glowPrimary, 34), withAlpha(palette.glowPrimaryDim, 14)]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[
          styles.blob,
          {
            width: topLeftSize,
            height: topLeftSize,
            borderRadius: topLeftSize / 2,
            top: -topLeftSize * 0.44,
            left: -topLeftSize * 0.4,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: topRightSize,
            height: topRightSize,
            borderRadius: topRightSize / 2,
            top: -topRightSize * 0.42,
            right: -topRightSize * 0.38,
            backgroundColor: withAlpha(palette.glowSecondary, 30),
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: bottomSize,
            height: bottomSize,
            borderRadius: bottomSize / 2,
            bottom: -bottomSize * 0.55,
            left: width / 2 - bottomSize / 2,
            backgroundColor: withAlpha(palette.glowTertiary, 16),
          },
        ]}
      />

      {/* Diffusion réelle — fond les 3 zones dans la base, sans arête. */}
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />

      {/* Vignette — extrêmement subtile, concentre l'attention sur le contenu. */}
      <LinearGradient
        colors={["rgba(0,0,0,0.28)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.2 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.28)"]}
        start={{ x: 0, y: 0.8 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute" },
});
