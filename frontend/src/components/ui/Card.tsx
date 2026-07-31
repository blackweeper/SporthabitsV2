import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
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
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds the discreet "hero" shadow — reserve for a screen's 1-2 most
   * important cards, never for plain list rows (keeps the app minimal). */
  elevated?: boolean;
  padding?: number;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.card, { padding }, elevated && shadow.elevated, style]}
    >
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
});
