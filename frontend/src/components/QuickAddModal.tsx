import { View, Text, StyleSheet, Modal, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";

type QuickAddItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  path: string;
  testID: string;
};

function buildItems(brandColor: string): QuickAddItem[] {
  return [
  {
    id: "session",
    title: "Démarrer une séance",
    subtitle: "Choisir un plan et commencer",
    icon: "flame",
    color: brandColor,
    path: "/plans",
    testID: "qa-session",
  },
  {
    // La bibliothèque officielle (~300 exercices + Découvrir) couvre
    // désormais l'essentiel des besoins — "Nouvel exercice" ici dupliquait
    // le bouton "+" déjà présent dans la Bibliothèque elle-même. Cet
    // emplacement sert maintenant l'accès le plus demandé qui manquait
    // partout ailleurs qu'au Dashboard : les Réglages. Pointe vers le hub
    // Profil (`profile-tab`, sections Apparence/Entraînement/Santé/
    // Application) — jamais directement vers Apparence, qui n'est qu'une
    // des sous-pages de ce hub.
    id: "settings",
    title: "Réglages",
    subtitle: "Apparence, entraînement, santé…",
    icon: "settings",
    color: "#78909C",
    path: "/profile-tab",
    testID: "qa-settings",
  },
  {
    id: "habit",
    title: "Ajouter une habitude",
    subtitle: "Eau, marche, mobilité…",
    icon: "checkbox",
    color: "#00E676",
    path: "/habit/new",
    testID: "qa-habit",
  },
  {
    id: "measure",
    title: "Nouvelle mesure",
    subtitle: "Poids, tour de bras, masse grasse…",
    icon: "resize",
    color: "#4FC3F7",
    path: "/measurement/new",
    testID: "qa-measure",
  },
  {
    id: "meal",
    title: "Ajouter un repas",
    subtitle: "Saisie rapide de calories",
    icon: "fast-food",
    color: "#AB47BC",
    path: "/meal/new",
    testID: "qa-meal",
  },
  {
    id: "cardio",
    title: "Activité cardio",
    subtitle: "Course, vélo, rameur…",
    icon: "bicycle",
    color: "#00B0FF",
    path: "/cardio-log/new",
    testID: "qa-cardio",
  },
  {
    id: "journal",
    title: "Note du jour",
    subtitle: "Ressenti, énergie, stress",
    icon: "book",
    color: "#FFC107",
    path: "/daily-journal",
    testID: "qa-journal",
  },
  {
    id: "pr",
    title: "Nouveau record",
    subtitle: "Poids, reps, temps de course",
    icon: "trophy",
    color: "#FF9800",
    path: "/pr/new",
    testID: "qa-pr",
  },
  ];
}

/**
 * Global "Actions rapides" sheet — reachable from a floating button visible
 * on every tab (not tied to a tab-bar slot). One tap per item opens its
 * target form directly, no intermediate step.
 */
export default function QuickAddModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (path: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const items = buildItems(theme.colors.brand);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[
            styles.sheet,
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary },
            { paddingBottom: 24 + insets.bottom },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Actions rapides</Text>
          <View style={styles.grid}>
            {items.map((i) => (
              <Pressable
                key={i.id}
                testID={i.testID}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.card.mode === "glass" ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                    borderRadius: theme.radius.md,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => onPick(i.path)}
              >
                <View style={[styles.itemIcon, { backgroundColor: `${i.color}22` }]}>
                  <Ionicons name={i.icon} size={22} color={i.color} />
                </View>
                <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {i.title}
                </Text>
                <Text style={[styles.itemSub, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={2}>
                  {i.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
          {Platform.OS === "ios" && <View style={{ height: 20 }} />}
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    width: "48%",
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  itemTitle: { fontWeight: "800", fontSize: 13 },
  itemSub: {
    fontSize: 11,
    lineHeight: 14,
  },
});
