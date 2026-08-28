import { ReactNode, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadow, spacing } from "@/src/theme";
import { GlassLevel, useTheme } from "@/src/themes";
import GlassCard from "./GlassCard";

/**
 * Shared card shell (surfaceSecondary + border + radius.md + padding) —
 * the shape ~36 screens redefine locally today. Not force-migrated
 * everywhere yet: introduced here and adopted screen-by-screen so each
 * rollout stays reviewable instead of one giant diff.
 *
 * Theme-aware via `GlassCard`: under Classique (`card.mode==="flat"`), the
 * background/border/radius below are exactly the previous hardcoded values
 * (now read from `theme.colors`/`theme.radius`, byte-identical for that
 * theme) — under Sunset, `GlassCard` overrides them with the blur/tint
 * treatment automatically, no call site changes needed.
 */
export default function Card({
  children,
  style,
  elevated = false,
  padding = spacing.md,
  title,
  icon,
  testID,
  collapsible = false,
  defaultCollapsed = false,
  accent,
  level,
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
  /** When true and `title` is set, the heading becomes tappable and toggles
   * `children`'s visibility (chevron indicator). Reserve for the lowest-
   * glance-frequency content on a screen — most cards should stay expanded. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Liquid Glass "active"/"important" accent (Sunset only, see
   * `GlassCard`) — a tinted glow border instead of the neutral one. Reserve
   * for the one card that should visually win (a selected item, a personal
   * record, a reached goal), not for ordinary rows. */
  accent?: string;
  /** Palier de verre Liquid Glass (Sunset only, voir `GlassCard`). Par
   * défaut, suit `elevated` : une carte "hero" passe automatiquement au
   * palier `"elevated"` (verre plus marqué) sans avoir à le répéter — mais
   * peut être forcé explicitement (ex. `"subtle"` pour une ligne de liste
   * qui n'a pas besoin de l'ombre `elevated` mais veut un verre plus léger). */
  level?: GlassLevel;
}) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  return (
    <GlassCard
      testID={testID}
      accent={accent}
      level={level ?? (elevated ? "elevated" : "card")}
      style={[
        styles.card,
        {
          padding,
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
        elevated && shadow.elevated,
        style,
      ]}
    >
      {title &&
        (collapsible ? (
          <Pressable
            testID={testID ? `${testID}-toggle` : undefined}
            style={styles.heading}
            onPress={() => setCollapsed((c) => !c)}
          >
            {icon && <Ionicons name={icon} size={15} color={theme.colors.brand} />}
            <Text style={[styles.headingText, { flex: 1, color: theme.colors.onSurface }]}>{title}</Text>
            <Ionicons
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={16}
              color={theme.colors.onSurfaceTertiary}
            />
          </Pressable>
        ) : (
          <View style={styles.heading}>
            {icon && <Ionicons name={icon} size={15} color={theme.colors.brand} />}
            <Text style={[styles.headingText, { color: theme.colors.onSurface }]}>{title}</Text>
          </View>
        ))}
      {(!collapsible || !collapsed) && children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  headingText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
});
