import { useEffect } from "react";
import { GestureResponderEvent, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing } from "@/src/theme";
import PressableScale from "./PressableScale";

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
 */
export default function RingChip({
  testID,
  icon,
  color,
  label,
  value,
  target,
  onPress,
  onQuickAdd,
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
  target: number;
  onPress: () => void;
  onQuickAdd?: () => void;
}) {
  const r = (SIZE - STROKE_WIDTH) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

  const handleQuickAdd = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onQuickAdd?.();
  };

  return (
    <View style={styles.wrap}>
      <PressableScale testID={testID} onPress={onPress} style={styles.ringWrap}>
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
        {onQuickAdd && (
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
      <Text style={styles.value} numberOfLines={1}>
        {formatCompact(value)}
      </Text>
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
  wrap: { flex: 1, alignItems: "center", gap: 2 },
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
