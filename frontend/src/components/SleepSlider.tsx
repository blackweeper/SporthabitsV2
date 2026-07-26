import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { formatSleepHM } from "@/src/utils/gym-storage";

type Props = {
  value: number | null | undefined;
  onChange: (h: number | null) => void;
  min?: number;
  max?: number;
  /** step in minutes when using drag. */
  step?: number;
  label?: string;
  testID?: string;
};

/**
 * Horizontal draggable slider for sleep hours (0h..12h) with minute precision.
 * Displays like "7h52".
 */
export function SleepSlider({
  value,
  onChange,
  min = 0,
  max = 12,
  step = 5, // minutes
  label = "Sommeil",
  testID,
}: Props) {
  const [width, setWidth] = useState(0);
  const currentRef = useRef<number>(value ?? 7.5);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const commit = useCallback(
    (x: number) => {
      if (width <= 0) return;
      const clampX = Math.max(0, Math.min(width, x));
      const raw = (clampX / width) * (max - min) + min;
      const stepH = step / 60;
      const snapped = Math.round(raw / stepH) * stepH;
      const clamped = Math.max(min, Math.min(max, snapped));
      currentRef.current = clamped;
      onChange(Number(clamped.toFixed(3)));
    },
    [width, min, max, step, onChange],
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => commit(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => commit(evt.nativeEvent.locationX),
    }),
  ).current;

  const displayValue = value ?? 0;
  const pct = width > 0 ? ((displayValue - min) / (max - min)) * 100 : 0;
  const clampedPct = Math.max(0, Math.min(100, pct));
  const showEmpty = value == null;

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.headRow}>
        <Ionicons name="moon" size={14} color={colors.brand} />
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {showEmpty ? "—" : formatSleepHM(displayValue)}
        </Text>
      </View>

      <View
        style={styles.trackHitBox}
        onLayout={onLayout}
        {...pan.panHandlers}
      >
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${clampedPct}%` },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: width > 0 ? (clampedPct / 100) * width - 12 : 0,
              opacity: showEmpty ? 0.4 : 1,
            },
          ]}
        />
      </View>

      <View style={styles.scale}>
        {[0, 3, 6, 9, 12].map((n) => (
          <Text key={n} style={styles.scaleLabel}>
            {n}h
          </Text>
        ))}
      </View>

      <View style={styles.presets}>
        {[6, 7, 7.5, 8, 9].map((v) => (
          <Pressable
            key={v}
            testID={`sleep-preset-${v}`}
            onPress={() => onChange(v)}
            style={[
              styles.preset,
              value != null &&
                Math.abs(value - v) < 0.05 &&
                styles.presetActive,
            ]}
          >
            <Text
              style={[
                styles.presetText,
                value != null &&
                  Math.abs(value - v) < 0.05 && { color: "#fff" },
              ]}
            >
              {formatSleepHM(v)}
            </Text>
          </Pressable>
        ))}
        {value != null && (
          <Pressable
            testID="sleep-clear"
            onPress={() => onChange(null)}
            style={styles.clearBtn}
          >
            <Ionicons name="close" size={14} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  value: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 15,
  },
  trackHitBox: {
    height: 32,
    justifyContent: "center",
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.brand,
  },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    borderWidth: 3,
    borderColor: "#fff",
    top: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  scale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
  },
  scaleLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    alignItems: "center",
  },
  preset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  presetText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  clearBtn: {
    marginLeft: spacing.sm,
    padding: 6,
    borderRadius: 6,
  },
});
