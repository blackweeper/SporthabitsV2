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
