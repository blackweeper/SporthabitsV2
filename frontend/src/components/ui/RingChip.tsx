import { useEffect, useId, useRef } from "react";
import { GestureResponderEvent, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { spacing } from "@/src/theme";
import { RingColor, RingFillConfig } from "@/src/themes/types";
import { useTheme } from "@/src/themes";
import PressableScale from "./PressableScale";
import AnimatedNumber from "./AnimatedNumber";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 76;
const STROKE_WIDTH = 7;
const DEFAULT_RING_FILL: RingFillConfig = { type: "timing", duration: 500 };

function isGradient(color: RingColor): color is [string, string] {
  return Array.isArray(color);
}

/**
 * Compact animated progress ring for the Dashboard's daily quick-actions row
 * (Eau/Calories/Pas) — replaces three full-width bordered cards with one
 * glanceable row, in the Oura/Whoop "ring" idiom. Tapping opens whatever the
 * caller wants (typically the existing `QuantityModal`); `onQuickAdd` is an
 * optional small "+" affordance for the single most common increment, so the
 * fast one-tap logging the old cards had isn't lost — just made secondary.
 *
 * `done`/`onLongPress` (POLISH V2) extend this same tile to also cover
 * custom habits — a checkbox/quantitative habit reaching its target shows
 * the same "satisfying validation" checkmark pop that `HabitCard` used to
 * have, and a long-press opens the habit's detail/edit screen (replacing a
 * swipe gesture that's ambiguous on a ~76px tile sitting in a 3-wide grid).
 *
 * `color` accepts a dégradé (tuple) and `ringFill` a spring config — see
 * `src/themes/types.ts` — for the Sunset theme; défaut = comportement
 * Classique inchangé. Only used on the Dashboard today, so consuming
 * `useTheme()` directly here is safe (no other screen affected).
 */
export default function RingChip({
  testID,
  icon,
  color,
  label,
  value,
  target,
  onPress,
  onLongPress,
  onQuickAdd,
  done = false,
  ringFill = DEFAULT_RING_FILL,
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: RingColor;
  label: string;
  value: number;
  target: number;
  onPress: () => void;
  onLongPress?: () => void;
  onQuickAdd?: () => void;
  done?: boolean;
  ringFill?: RingFillConfig;
}) {
  const { theme } = useTheme();
  const r = (SIZE - STROKE_WIDTH) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const progress = useSharedValue(0);
  const checkPop = useSharedValue(done ? 1 : 0);
  const wasDone = useRef(done);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const solidColor = isGradient(color) ? color[0] : color;
  const stroke = isGradient(color) ? `url(#${gradientId})` : color;

  useEffect(() => {
    progress.value =
      ringFill.type === "spring"
        ? withSpring(pct, { damping: ringFill.damping, stiffness: ringFill.stiffness })
        : withTiming(pct, { duration: ringFill.duration, easing: Easing.out(Easing.cubic) });
  }, [pct, progress, ringFill]);

  useEffect(() => {
    if (done && !wasDone.current) {
      checkPop.value = 0;
      checkPop.value = withSpring(1, { damping: 10, stiffness: 180 });
    } else if (!done) {
      checkPop.value = 0;
    }
    wasDone.current = done;
  }, [done, checkPop]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkPop.value }],
  }));

  const handleQuickAdd = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onQuickAdd?.();
  };

  return (
    <View style={styles.wrap}>
      <PressableScale
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        style={styles.ringWrap}
      >
        <Svg width={SIZE} height={SIZE}>
          {isGradient(color) && (
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={color[0]} />
                <Stop offset="1" stopColor={color[1]} />
              </LinearGradient>
            </Defs>
          )}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke={theme.colors.ringTrack}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke={stroke}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={c}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.iconAbsolute}>
          <Ionicons name={icon} size={20} color={solidColor} />
        </View>
        {done && (
          <Animated.View
            style={[styles.checkBadge, { backgroundColor: solidColor, borderColor: theme.colors.surface }, checkStyle]}
          >
            <Ionicons name="checkmark" size={11} color="#fff" />
          </Animated.View>
        )}
        {!done && onQuickAdd && (
          <PressableScale
            testID={testID ? `${testID}-quickadd` : undefined}
            style={[styles.quickAddBtn, { backgroundColor: solidColor, borderColor: theme.colors.surface }]}
            onPress={handleQuickAdd}
            hitSlop={6}
          >
            <Ionicons name="add" size={12} color="#fff" />
          </PressableScale>
        )}
      </PressableScale>
      <AnimatedNumber
        value={value}
        formatter={formatCompact}
        style={[styles.value, { color: theme.colors.onSurface }]}
        numberOfLines={1}
        testID={testID ? `${testID}-value` : undefined}
      />
      <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 2 },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconAbsolute: { position: "absolute" },
  quickAddBtn: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  checkBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  value: {
    fontWeight: "800",
    fontSize: 13,
    marginTop: spacing.xs,
  },
  label: {
    fontWeight: "600",
    fontSize: 10,
  },
});
