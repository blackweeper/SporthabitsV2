import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/src/theme";

/** Cadran circulaire de décompte — extrait de `app/workout/[id].tsx` (comportement
 * inchangé) pour être réutilisé par le nouveau moteur EMOM premium
 * (`EmomLiveOverlay`) sans dupliquer le composant. */
export default function TimerCircle({
  remaining,
  total,
  color,
}: {
  remaining: number;
  total: number;
  color: string;
}) {
  const size = 240;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = remaining / total;
  const offset = circ * (1 - pct);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ},${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.restBig}>
        {remaining >= 60
          ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
          : remaining}
      </Text>
      <Text style={styles.restUnit}>
        {remaining >= 60 ? "MIN" : "SECONDES"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restBig: {
    color: colors.onSurface,
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 78,
  },
  restUnit: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 4,
  },
});
