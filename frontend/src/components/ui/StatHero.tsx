import { StyleProp, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/src/themes";
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
  fitDiameter,
}: {
  value: number;
  unit?: string;
  formatter?: (n: number) => string;
  size?: "sm" | "md" | "lg";
  color?: string;
  align?: "center" | "flex-start";
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** When set, sizes the number purely from the available circular diameter
   * (e.g. the inner content circle of a ring gauge, see
   * `innerContentDiameter` in `MultiRingGauge.tsx`) instead of the `size`
   * preset. Geometry-driven, so it fits correctly regardless of digit count
   * — including 1-2 digits, which the `size` preset alone cannot guarantee
   * inside a small fixed-diameter circle. */
  fitDiameter?: number;
}) {
  const { theme } = useTheme();
  const { num, unit: unitSize } = SIZES[size];
  const text = formatter ? formatter(value) : String(Math.round(value));
  const digitCount = text.replace(/[^0-9]/g, "").length || 1;
  let adjustedNum: number;
  let adjustedUnitSize: number;
  if (fitDiameter) {
    // Character-width estimate for bold digits (~0.62em advance) bounds the
    // font by available width; when a unit caption renders below, only half
    // the diameter's height budget is given to the number so both lines fit
    // without touching the ring's inner edge.
    const safeWidth = fitDiameter * 0.78;
    const safeHeight = unit ? fitDiameter * 0.5 : fitDiameter * 0.72;
    const widthBound = safeWidth / (text.length * 0.62);
    const heightBound = safeHeight / 1.05;
    adjustedNum = Math.max(10, Math.floor(Math.min(widthBound, heightBound)));
    // Bug corrigé : `adjustedUnitSize` ne dérivait auparavant QUE de la
    // taille du nombre (42% de `adjustedNum`), jamais de la longueur réelle
    // du texte d'unité — un mot plus long que le nombre (ex. "de l'objectif"
    // vs "100%") pouvait donc déborder du cercle intérieur même quand le
    // nombre, lui, tenait parfaitement (confirmé en direct : dernier
    // caractère chevauchant l'anneau). Bornée ici, comme le nombre, par sa
    // propre largeur de texte disponible.
    const unitWidthBound = unit ? safeWidth / (unit.length * 0.62) : Infinity;
    adjustedUnitSize = Math.max(8, Math.min(Math.round(adjustedNum * 0.42), Math.floor(unitWidthBound)));
  } else {
    // Shrinks the number as its digit count grows so it never overflows a
    // fixed-size container — only kicks in at 3+ digits, so every existing
    // 1-2 digit usage without `fitDiameter` renders unchanged.
    const scale = digitCount <= 2 ? 1 : digitCount === 3 ? 0.55 : 0.42;
    adjustedNum = Math.round(num * scale);
    adjustedUnitSize = unitSize;
  }
  return (
    <View style={[{ alignItems: align }, style]} testID={testID}>
      <AnimatedNumber
        value={value}
        formatter={formatter}
        style={{
          color: color ?? theme.colors.onSurface,
          fontSize: adjustedNum,
          fontWeight: "800",
          lineHeight: adjustedNum * 1.05,
        }}
      />
      {unit ? (
        <Text
          // Filet de sécurité en plus du calcul ci-dessus : si l'estimation
          // de largeur par caractère s'avère malgré tout légèrement
          // optimiste pour une police/un navigateur donné, un retour à la
          // ligne reste toujours préférable à un débordement sur l'anneau.
          numberOfLines={fitDiameter ? 2 : 1}
          style={{
            color: theme.colors.onSurfaceTertiary,
            fontSize: adjustedUnitSize,
            fontWeight: "700",
            letterSpacing: 0.6,
            marginTop: 2,
            textTransform: "uppercase",
            textAlign: "center",
            ...(fitDiameter ? { maxWidth: fitDiameter * 0.8 } : null),
          }}
        >
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
