import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "@/src/theme";

/**
 * Shared card shell (surfaceSecondary + border + radius.md + padding) —
 * the shape ~36 screens redefine locally today. Not force-migrated
 * everywhere yet: introduced here and adopted screen-by-screen so each
 * rollout stays reviewable instead of one giant diff.
 */
export default function Card({
  children,
  style,
  elevated = false,
  padding = spacing.md,
  title,
  icon,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds the discreet "hero" shadow — reserve for a screen's 1-2 most
   * important cards, never for plain list rows (keeps the app minimal). */
  elevated?: boolean;
  padding?: number;
  /** Optional fixed heading rendered above `children` — an icon + label
   * row, always present regardless of which conditional content ends up
   * inside. Prefer this over an ad hoc `<Text>` as the first child so a
   * card never depends on its content to decide whether it has a title. */
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.card, { padding }, elevated && shadow.elevated, style]}
    >
      {title && (
        <View style={styles.heading}>
          {icon && <Ionicons name={icon} size={15} color={colors.brand} />}
          <Text style={styles.headingText}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  headingText: { color: colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
});
