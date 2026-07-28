import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import SwipeableRow from "@/src/components/SwipeableRow";
import { getMealPresets, saveMealPresets, MealPreset, uid } from "@/src/utils/gym-storage";

export default function MealPresetsScreen() {
  const router = useRouter();
  const [presets, setPresets] = useState<MealPreset[] | null>(null);

  useEffect(() => {
    (async () => {
      setPresets(await getMealPresets());
    })();
  }, []);

  if (!presets) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const update = (id: string, patch: Partial<MealPreset>) =>
    setPresets((list) => list!.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (id: string) =>
    setPresets((list) => list!.filter((p) => p.id !== id));

  const add = () =>
    setPresets((list) => [
      ...list!,
      { id: uid(), emoji: "🍽️", label: "Nouveau raccourci", kcal: 100 },
    ]);

  const save = async () => {
    await saveMealPresets(presets);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Raccourcis repas</Text>
        <Pressable onPress={save} hitSlop={12} testID="save-meal-presets">
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintText}>
              Ces raccourcis apparaissent sur la carte Calories du Dashboard pour ajouter des
              calories en un seul geste.
            </Text>
          </View>

          {presets.map((p) => (
            <SwipeableRow
              key={p.id}
              testID={`meal-preset-${p.id}`}
              onDelete={() => remove(p.id)}
              deleteConfirm={{
                title: "Supprimer ce raccourci ?",
                confirmLabel: "SUPPRIMER",
                destructive: true,
              }}
            >
              <View style={styles.row}>
                <TextInput
                  testID={`meal-preset-${p.id}-emoji`}
                  style={styles.emojiInput}
                  value={p.emoji}
                  onChangeText={(t) => update(p.id, { emoji: t })}
                  maxLength={4}
                />
                <TextInput
                  testID={`meal-preset-${p.id}-label`}
                  style={styles.labelInput}
                  value={p.label}
                  onChangeText={(t) => update(p.id, { label: t })}
                  placeholder="Nom"
                  placeholderTextColor={colors.onSurfaceTertiary}
                />
                <TextInput
                  testID={`meal-preset-${p.id}-kcal`}
                  style={styles.kcalInput}
                  value={String(p.kcal)}
                  onChangeText={(t) =>
                    update(p.id, { kcal: parseInt(t.replace(/[^0-9]/g, ""), 10) || 0 })
                  }
                  keyboardType="number-pad"
                  placeholder="kcal"
                  placeholderTextColor={colors.onSurfaceTertiary}
                />
              </View>
            </SwipeableRow>
          ))}

          <Pressable testID="add-meal-preset" style={styles.addBtn} onPress={add}>
            <Ionicons name="add-circle" size={18} color={colors.brand} />
            <Text style={styles.addBtnText}>Ajouter un raccourci</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTertiary,
    padding: 10,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  hintText: {
    flex: 1,
    color: colors.brandSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  emojiInput: {
    width: 40,
    textAlign: "center",
    fontSize: 18,
    color: colors.onSurface,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    paddingVertical: 8,
  },
  labelInput: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kcalInput: {
    width: 64,
    textAlign: "right",
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginTop: spacing.sm,
  },
  addBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13 },
});
