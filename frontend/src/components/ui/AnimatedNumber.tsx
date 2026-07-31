import { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "react-native";
import { Easing } from "react-native-reanimated";

const ease = Easing.out(Easing.cubic);

/**
 * Counts a number up (or down) from its previous value to `value` on the JS
 * thread via requestAnimationFrame — deliberately not a Reanimated
 * useAnimatedProps/UI-thread animation, since animating text content that
 * way needs the TextInput-trick which is flaky on react-native-web (this
 * app runs mostly in-browser). rAF is universal and the durations involved
 * (~500ms) make the JS-thread cost a non-issue.
 */
export default function AnimatedNumber({
  value,
  duration = 500,
  formatter,
  style,
  testID,
  numberOfLines,
}: {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  style?: TextProps["style"];
  testID?: string;
  numberOfLines?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = Date.now();
    function tick() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const text = formatter ? formatter(display) : String(Math.round(display));

  return (
    <Text testID={testID} style={style} numberOfLines={numberOfLines}>
      {text}
    </Text>
  );
}
