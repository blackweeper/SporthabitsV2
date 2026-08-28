import { ReactNode, useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RingColor, RingFillConfig } from "@/src/themes/types";
import { useTheme } from "@/src/themes";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_RING_FILL: RingFillConfig = { type: "timing", duration: 500 };

export type RingSpec = {
  pct: number; // 0..1 (ou au-delà, sera plafonné à 1 visuellement)
  /** Couleur simple, ou dégradé 2 stops (thème Sunset) — voir `src/themes/types.ts`. */
  color: RingColor;
  trackColor?: string;
};

function isGradient(color: RingColor): color is [string, string] {
  return Array.isArray(color);
}

/** Diameter of the clear circular area inside the innermost ring — the space
 * available to whatever is centered via `children`. Mirrors the exact radius
 * formula used below (`r = cx - strokeWidth/2 - i*(strokeWidth+gap)`) so it
 * never drifts out of sync with the actual rendered geometry. */
export function innerContentDiameter(size: number, strokeWidth: number, gap: number, ringsCount: number): number {
  const cx = size / 2;
  const innerRadius = cx - strokeWidth / 2 - (ringsCount - 1) * (strokeWidth + gap);
  return 2 * innerRadius - strokeWidth;
}

/**
 * Un anneau animé — extrait de `RingChip.tsx` (même technique de base :
 * `useSharedValue`/`useAnimatedProps` sur `strokeDashoffset`), en
 * sous-composant pour que chaque anneau de `MultiRingGauge` ait ses propres
 * hooks (obligatoire : on ne peut pas appeler `useSharedValue` dans une
 * boucle du composant parent). `ringFill` bascule `withTiming` (Classique)
 * vs `withSpring` (Sunset, remplissage "rebondissant") ; `color` en tuple
 * rend un dégradé SVG (`Defs`/`LinearGradient`) au lieu d'un trait plat.
 */
function RingLayer({
  cx,
  cy,
  r,
  strokeWidth,
  color,
  trackColor,
  pct,
  gradientId,
  ringFill,
}: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  color: RingColor;
  trackColor: string;
  pct: number;
  gradientId: string;
  ringFill: RingFillConfig;
}) {
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(1, pct));
    progress.value =
      ringFill.type === "spring"
        ? withSpring(target, { damping: ringFill.damping, stiffness: ringFill.stiffness })
        : withTiming(target, { duration: ringFill.duration, easing: Easing.out(Easing.cubic) });
  }, [pct, progress, ringFill]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

  const stroke = isGradient(color) ? `url(#${gradientId})` : color;

  return (
    <>
      {isGradient(color) && (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color[0]} />
            <Stop offset="1" stopColor={color[1]} />
          </LinearGradient>
        </Defs>
      )}
      <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={r}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="transparent"
        strokeDasharray={c}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

/**
 * N anneaux de progression concentriques (le plus externe en premier dans
 * `rings`) — généralisation de la technique déjà utilisée par `RingChip` et
 * l'ancien `ScoreCircle` inline du Dashboard à un nombre configurable
 * d'anneaux. `children` est centré par-dessus (typiquement le score/nombre
 * agrégé). Réutilisé en compact pour le héros du Dashboard et en grand sur
 * `/day-detail`. `ringFill` par défaut = comportement Classique inchangé.
 */
export default function MultiRingGauge({
  rings,
  size = 156,
  strokeWidth = 10,
  gap = 4,
  ringFill = DEFAULT_RING_FILL,
  children,
}: {
  rings: RingSpec[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  ringFill?: RingFillConfig;
  children?: ReactNode;
}) {
  const { theme } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  // Préfixe unique par instance pour les ids de dégradé SVG (`url(#id)`) —
  // évite toute collision si plusieurs anneaux/instances coexistent dans le
  // même arbre DOM (web). Nettoyé des caractères non alphanumériques que
  // `useId()` peut inclure (ex. ":").
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((ring, i) => (
          <RingLayer
            key={i}
            cx={cx}
            cy={cy}
            r={cx - strokeWidth / 2 - i * (strokeWidth + gap)}
            strokeWidth={strokeWidth}
            color={ring.color}
            trackColor={ring.trackColor ?? theme.colors.ringTrack}
            pct={ring.pct}
            gradientId={`${uid}-ring-${i}`}
            ringFill={ringFill}
          />
        ))}
      </Svg>
      {children && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.center}>{children}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
