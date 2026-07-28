import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
import {
  FeelingMood,
  FEELING_MOOD_EMOJI,
  FEELING_MOOD_LABEL,
} from "@/src/utils/gym-storage";

/** Non-blocking "How do you feel today?" card. */
export function FeelingCard({
  currentFeeling,
  onSelect,
}: {
  currentFeeling: FeelingMood | null | undefined;
  onSelect: (m: FeelingMood) => void;
}) {
  return (
    <View style={styles.feelingCard} testID="feeling-card">
      <View style={styles.feelingHead}>
        <Ionicons name="heart" size={14} color={colors.brand} />
        <Text style={styles.feelingTitle}>Comment te sens-tu ?</Text>
        {currentFeeling != null && (
          <Text style={styles.feelingMeta}>
            {FEELING_MOOD_EMOJI[currentFeeling]} {FEELING_MOOD_LABEL[currentFeeling]}
          </Text>
        )}
      </View>
      <View style={styles.feelingRow}>
        {[0, 1, 2, 3].map((n) => {
          const m = n as FeelingMood;
          const active = currentFeeling === m;
          return (
            <Pressable
              key={n}
              testID={`feeling-${n}`}
              style={[styles.feelingBtn, active && styles.feelingBtnActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onSelect(m);
              }}
            >
              <Text style={styles.feelingEmoji}>{FEELING_MOOD_EMOJI[m]}</Text>
              <Text
                style={[
                  styles.feelingBtnLabel,
                  active && { color: colors.brand },
                ]}
                numberOfLines={1}
              >
                {FEELING_MOOD_LABEL[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feelingCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
  },
  feelingHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feelingTitle: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  feelingMeta: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 11,
  },
  feelingRow: {
    flexDirection: "row",
    gap: 6,
  },
  feelingBtn: {
    flex: 1,
    borderRadius: radius.md,
    padding: 8,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  feelingBtnActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
  },
  feelingEmoji: {
    fontSize: 22,
  },
  feelingBtnLabel: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 9,
    textAlign: "center",
  },
});
