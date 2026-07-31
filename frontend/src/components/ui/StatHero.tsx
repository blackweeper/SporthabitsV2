import { StyleProp, Text, View, ViewStyle } from "react-native";
import { colors } from "@/src/theme";
import AnimatedNumber from "./AnimatedNumber";

const SIZES = {
  sm: { num: 20, unit: 10 },
  md: { num: 28, unit: 11 },
  lg: { num: 40, unit: 13 },
} as const;

/**
 * "420 / kcal" instead of "420 kcal" — the number is the hero, the unit is
 * a caption underneath rather than sharing the line. Thin presentational
 * wrapper around `AnimatedNumber`; no logic of its own.
 */
export default function StatHero({
  value,
  unit,
  formatter,
  size = "md",
  color,
  align = "center",
  testID,
  style,
}: {
  value: number;
  unit?: string;
  formatter?: (n: number) => string;
  size?: "sm" | "md" | "lg";
  color?: string;
  align?: "center" | "flex-start";
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { num, unit: unitSize } = SIZES[size];
  return (
    <View style={[{ alignItems: align }, style]} testID={testID}>
      <AnimatedNumber
        value={value}
        formatter={formatter}
        style={{
          color: color ?? colors.onSurface,
          fontSize: num,
          fontWeight: "800",
          lineHeight: num * 1.05,
        }}
      />
      {unit ? (
        <Text
          style={{
            color: colors.onSurfaceTertiary,
            fontSize: unitSize,
            fontWeight: "700",
            letterSpacing: 0.6,
            marginTop: 2,
            textTransform: "uppercase",
          }}
        >
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
