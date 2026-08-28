import { StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "./PressableScale";

/**
 * Shared CTA button — `primary` (filled) / `secondary` (outline) — replaces
 * the `ctaBtn`/`ctaBtnSecondary` pattern duplicated per view in
 * `training.tsx` (each view re-injecting its own tint color inline).
 */
export default function CTAButton({
  label,
  variant,
  tint,
  textColor,
  icon,
  onPress,
  testID,
}: {
  label: string;
  variant: "primary" | "secondary";
  tint?: string;
  /** Override for the primary variant's text/icon color — needed when
   * `tint` is too light for white text to stay legible (e.g. a mint
   * background wants dark text). Ignored for `secondary` (always `tint`). */
  textColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const resolvedTint = tint ?? theme.colors.brand;
  const isPrimary = variant === "primary";
  const fg = isPrimary ? textColor ?? "#fff" : resolvedTint;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      style={[
        styles.base,
        { borderRadius: theme.radius.md },
        isPrimary
          ? { backgroundColor: resolvedTint }
          : { borderWidth: 1.5, borderColor: resolvedTint },
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={fg} />}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: { fontWeight: "800", fontSize: 13 },
});
