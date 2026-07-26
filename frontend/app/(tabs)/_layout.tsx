import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, StyleSheet, Text, Modal, Platform } from "react-native";
import { useState } from "react";
import { colors, radius, spacing } from "@/src/theme";

export default function TabsLayout() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surfaceSecondary,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.onSurfaceTertiary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Aujourd'hui",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="today" color={color} size={size} />
            ),
            tabBarButtonTestID: "tab-today",
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: "Entraînements",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell" color={color} size={size} />
            ),
            tabBarButtonTestID: "tab-training",
          }}
        />
        {/* Center + button (empty tab, uses custom listener) */}
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            tabBarButtonTestID: "tab-add",
            tabBarIcon: () => (
              <View style={styles.fab}>
                <Ionicons name="add" size={30} color="#fff" />
              </View>
            ),
            tabBarLabelStyle: { display: "none" },
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setAddOpen(true);
            },
          }}
        />
        <Tabs.Screen
          name="progression"
          options={{
            title: "Progression",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up" color={color} size={size} />
            ),
            tabBarButtonTestID: "tab-progression",
          }}
        />
        <Tabs.Screen
          name="profile-tab"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size} />
            ),
            tabBarButtonTestID: "tab-profile",
          }}
        />
        {/* Hidden routes (kept for backward compat / deep links) */}
        <Tabs.Screen name="program" options={{ href: null }} />
        <Tabs.Screen name="plans" options={{ href: null }} />
        <Tabs.Screen name="stretching" options={{ href: null }} />
        <Tabs.Screen name="progress" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
      </Tabs>

      <QuickAddModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(where) => {
          setAddOpen(false);
          // small delay so the modal closes smoothly before navigation
          setTimeout(() => router.push(where as any), 150);
        }}
      />
    </>
  );
}

function QuickAddModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (path: string) => void;
}) {
  const items: {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    path: string;
    testID: string;
  }[] = [
    {
      id: "session",
      title: "Démarrer une séance",
      subtitle: "Choisir un plan et commencer",
      icon: "flame",
      color: colors.brand,
      path: "/plans",
      testID: "qa-session",
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
      id: "photo",
      title: "Photo de progression",
      subtitle: "Ajouter à ta transformation",
      icon: "camera",
      color: "#AB47BC",
      path: "/measurement/new",
      testID: "qa-photo",
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Ajouter rapidement</Text>
          <View style={styles.grid}>
            {items.map((i) => (
              <Pressable
                key={i.id}
                testID={i.testID}
                style={styles.item}
                onPress={() => onPick(i.path)}
              >
                <View style={[styles.itemIcon, { backgroundColor: `${i.color}22` }]}>
                  <Ionicons name={i.icon} size={22} color={i.color} />
                </View>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {i.title}
                </Text>
                <Text style={styles.itemSub} numberOfLines={2}>
                  {i.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
          {Platform.OS === "ios" && <View style={{ height: 20 }} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.surfaceSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
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
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  itemTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  itemSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    lineHeight: 14,
  },
});
