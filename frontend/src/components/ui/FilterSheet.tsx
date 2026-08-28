import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "./GlassCard";

/**
 * Generic collapsible filter panel — same Modal/backdrop/sheet pattern as
 * NewExerciseSheet/QuickAddModal (slide up, dark backdrop, rounded top
 * corners, drag handle). Content (chip rows) is passed as children so this
 * stays a pure shell, reusable across screens with different filter sets
 * (Bibliothèque: catégorie/muscle/équipement/collection ; Entraînements ›
 * Séances individuelles: catégorie/muscle).
 */
export default function FilterSheet({
  visible,
  onClose,
  title = "Filtres",
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[styles.sheet, theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary }]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
            <Pressable testID="filter-sheet-close" hitSlop={12} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.onSurfaceTertiary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: spacing.md + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
}

/** Small numeric badge for the "Filtres" trigger button — 0 = no badge. */
export function FilterCountBadge({ count }: { count: number }) {
  const { theme } = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[styles.countBadge, { backgroundColor: theme.colors.brand }]}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "75%",
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: "800" },
  content: { gap: spacing.xs, paddingBottom: spacing.md },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
