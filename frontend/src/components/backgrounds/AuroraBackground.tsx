import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { withAlpha } from "@/src/theme";

/**
 * "IronFlow Aurora" — fond global du thème Sunset. Base quasi noire + 3
 * grandes zones de lumière diffuse (bleu glacier en haut à gauche, violet
 * profond en haut à droite, cyan léger en bas/centre), fondues dans le fond
 * par un vrai flou (`BlurView`, backdrop-blur — la même technique déjà
 * utilisée par `GlassCard` pour l'effet verre) plutôt qu'un dégradé simulé :
 * jamais de séparation visible entre les couleurs. Généré entièrement en
 * code — `expo-linear-gradient` + `expo-blur`, déjà des dépendances du
 * projet — aucune image statique.
 *
 * Sombre et sobre par construction : les zones de couleur sont peintes à
 * faible opacité PUIS diffusées par un flou fort, pas l'inverse — le
 * résultat doit rester ~80% sombre/15% couleur profonde/5% lumière
 * perceptible ("ressentie plus que vue"), jamais un blob net, un néon ou une
 * couleur saturée.
 *
 * Monté par `ThemedBackground` (voir ce fichier pour le pourquoi du montage
 * par écran plutôt qu'un unique calque partagé derrière `<Tabs>`) comme fond
 * PAR DÉFAUT du thème Sunset — remplacé par le fond d'écran personnalisé de
 * l'utilisateur s'il en a choisi un (`wallpaper-storage.ts`, inchangé).
 * Volontairement statique (aucune `Animated.Value`) : un fond ne doit jamais
 * redemander de repaint continu.
 */

const AURORA_PALETTE = {
  base: "#05070B",
  deepBlue: "#071426",
  blue: "#1769D2",
  glacier: "#4DA3FF",
  violet: "#39206B",
  cyan: "#075A6B",
};

export default function AuroraBackground() {
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
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: AURORA_PALETTE.base }]} />
      <LinearGradient
        colors={[AURORA_PALETTE.deepBlue, AURORA_PALETTE.base]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Zones lumineuses — peintes AVANT le flou pour être diffusées par lui. */}
      <LinearGradient
        colors={[withAlpha(AURORA_PALETTE.glacier, 34), withAlpha(AURORA_PALETTE.blue, 14)]}
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
            backgroundColor: withAlpha(AURORA_PALETTE.violet, 30),
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
            backgroundColor: withAlpha(AURORA_PALETTE.cyan, 16),
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
