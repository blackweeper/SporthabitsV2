import { useEffect, useRef } from "react";
import { GestureResponderEvent, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing } from "@/src/theme";
import PressableScale from "./PressableScale";
import AnimatedNumber from "./AnimatedNumber";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 76;
const STROKE_WIDTH = 7;

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
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
  target: number;
  onPress: () => void;
  onLongPress?: () => void;
  onQuickAdd?: () => void;
  done?: boolean;
}) {
  const r = (SIZE - STROKE_WIDTH) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const progress = useSharedValue(0);
  const checkPop = useSharedValue(done ? 1 : 0);
  const wasDone = useRef(done);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct, progress]);

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
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke={colors.surfaceTertiary}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={c}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.iconAbsolute}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {done && (
          <Animated.View style={[styles.checkBadge, { backgroundColor: color }, checkStyle]}>
            <Ionicons name="checkmark" size={11} color="#fff" />
          </Animated.View>
        )}
        {!done && onQuickAdd && (
          <PressableScale
            testID={testID ? `${testID}-quickadd` : undefined}
            style={[styles.quickAddBtn, { backgroundColor: color }]}
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
        style={styles.value}
        numberOfLines={1}
        testID={testID ? `${testID}-value` : undefined}
      />
      <Text style={styles.label} numberOfLines={1}>
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
    borderColor: colors.surface,
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
    borderColor: colors.surface,
  },
  value: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.onSurfaceTertiary,
    fontWeight: "600",
    fontSize: 10,
  },
});
