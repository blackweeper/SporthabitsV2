import { forwardRef, ReactNode } from "react";
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "@/src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Ripple discret par défaut sur Android — sans lui, `Pressable` n'a aucun
// feedback natif sur cette plateforme (le scale seul suffit sur iOS/web,
// mais Android attend un ripple). Reste substituable via la prop
// `android_ripple` si un appelant veut un rendu différent.
const DEFAULT_ANDROID_RIPPLE = { color: "rgba(255,255,255,0.12)" };

/**
 * Drop-in `Pressable` replacement giving every tappable element the same
 * subtle scale-down feedback on press — the app had zero press feedback
 * outside two isolated components before this. Kept intentionally small
 * (0.97, ~120ms) so it reads as "responsive" rather than "bouncy".
 */
const PressableScale = forwardRef<View, PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}>(function PressableScale(
  { children, style, onPressIn, onPressOut, scaleTo = 0.97, android_ripple, ...rest },
  ref,
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(scaleTo, { duration: motion.fast });
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: motion.fast });
    // Web (react-native-web) : le `Pressable` sous-jacent garde le focus
    // clavier après un relâchement — dans un rang défilant horizontalement
    // (chips de catégorie, onglets segmentés), le navigateur déclenche alors
    // son propre `scrollIntoView` sur cet élément focus, qui peut cibler le
    // mauvais ancêtre défilable et décaler tout le contenu monté juste après
    // (bug confirmé en direct : image/texte rendus hors cadre après un
    // changement d'onglet). Un `blur()` explicite ici retire le focus sans
    // rien changer au comportement — la navigation clavier via Tab refocalise
    // normalement l'élément suivant de toute façon.
    (e?.target as unknown as { blur?: () => void } | null)?.blur?.();
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      ref={ref}
      android_ripple={android_ripple ?? DEFAULT_ANDROID_RIPPLE}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children}
    </AnimatedPressable>
  );
});

export default PressableScale;
