import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { estimateOneRepMax, savePR, uid } from "@/src/utils/gym-storage";

export default function NewPRScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [notes, setNotes] = useState("");

  const w = parseFloat(weight.replace(",", ".")) || 0;
  const r = parseInt(reps, 10) || 1;
  const oneRM = w > 0 ? estimateOneRepMax(w, r) : 0;

  const save = async () => {
    if (!name.trim() || w <= 0) {
      Alert.alert("Champs requis", "Nom d'exercice et poids obligatoires.");
      return;
    }
    await savePR({
      id: uid(),
      exerciseName: name.trim(),
      weight_kg: w,
      reps: r,
      date: new Date().toISOString(),
      notes: notes.trim() || null,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="close-pr" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Nouveau record</Text>
        <Pressable testID="save-pr" onPress={save} hitSlop={12}>
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Exercice</Text>
          <TextInput
            testID="pr-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Développé couché"
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Poids (kg)</Text>
              <TextInput
                testID="pr-weight"
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.onSurfaceTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Répétitions</Text>
              <TextInput
                testID="pr-reps"
                style={styles.input}
                value={reps}
                onChangeText={(t) => setReps(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={colors.onSurfaceTertiary}
              />
            </View>
          </View>

          {oneRM > 0 && (
            <View style={styles.oneRMCard}>
              <Text style={styles.oneRMLabel}>1RM ESTIMÉ (formule Epley)</Text>
              <Text style={styles.oneRMValue}>{oneRM.toFixed(1)} kg</Text>
              <Text style={styles.oneRMHint}>
                w × (1 + reps/30) = {w} × (1 + {r}/30)
              </Text>
            </View>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            testID="pr-notes"
            style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: PR de la semaine !"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },
  row: { flexDirection: "row", gap: spacing.md },
  oneRMCard: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  oneRMLabel: {
    color: "#fff",
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.9,
  },
  oneRMValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 4,
  },
  oneRMHint: { color: "#fff", opacity: 0.85, fontSize: 11, marginTop: 4 },
});
