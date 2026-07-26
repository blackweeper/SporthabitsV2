import { useState, useMemo } from "react";
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
import {
  estimateOneRepMax,
  formatDurationHMS,
  formatPace,
  paceSecondsPerKm,
  PRType,
  savePR,
  uid,
} from "@/src/utils/gym-storage";

const RUN_PRESETS: { label: string; meters: number }[] = [
  { label: "1 km", meters: 1000 },
  { label: "5 km", meters: 5000 },
  { label: "10 km", meters: 10000 },
  { label: "Semi", meters: 21097 },
  { label: "Marathon", meters: 42195 },
];

export default function NewPRScreen() {
  const router = useRouter();
  const [type, setType] = useState<PRType>("weight");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // Weight & Reps fields
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");

  // Run fields
  const [distanceMeters, setDistanceMeters] = useState<number>(5000);
  const [customDistance, setCustomDistance] = useState<string>(""); // km input for custom
  const [useCustomDist, setUseCustomDist] = useState<boolean>(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const w = parseFloat(weight.replace(",", ".")) || 0;
  const r = parseInt(reps, 10) || 1;
  const oneRM = w > 0 ? estimateOneRepMax(w, r) : 0;

  const totalRunSec = useMemo(() => {
    const h = parseInt(hours || "0", 10) || 0;
    const m = parseInt(minutes || "0", 10) || 0;
    const s = parseInt(seconds || "0", 10) || 0;
    return h * 3600 + m * 60 + s;
  }, [hours, minutes, seconds]);

  const finalDistanceMeters = useMemo(() => {
    if (useCustomDist) {
      const km = parseFloat(customDistance.replace(",", "."));
      if (!isNaN(km) && km > 0) return Math.round(km * 1000);
      return 0;
    }
    return distanceMeters;
  }, [useCustomDist, customDistance, distanceMeters]);

  const pace = paceSecondsPerKm(finalDistanceMeters, totalRunSec);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Champ requis", "Renseigne le nom de l'exercice.");
      return;
    }
    if (type === "weight" && w <= 0) {
      Alert.alert("Champ requis", "Renseigne un poids > 0 kg.");
      return;
    }
    if (type === "reps" && r <= 0) {
      Alert.alert("Champ requis", "Renseigne au moins 1 répétition.");
      return;
    }
    if (type === "run" && (finalDistanceMeters <= 0 || totalRunSec <= 0)) {
      Alert.alert(
        "Champ requis",
        "Renseigne une distance et un temps valides.",
      );
      return;
    }

    await savePR({
      id: uid(),
      exerciseName: name.trim(),
      type,
      weight_kg: type === "weight" ? w : 0,
      reps: type === "weight" || type === "reps" ? r : 0,
      distance_m: type === "run" ? finalDistanceMeters : null,
      time_seconds: type === "run" ? totalRunSec : null,
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
          {/* Type selector */}
          <View style={styles.typeRow}>
            <TypeBtn
              active={type === "weight"}
              label="POIDS"
              subtitle="kg × reps"
              icon="barbell"
              onPress={() => setType("weight")}
              testID="type-weight"
            />
            <TypeBtn
              active={type === "reps"}
              label="RÉPÉTITIONS"
              subtitle="sans poids"
              icon="repeat"
              onPress={() => setType("reps")}
              testID="type-reps"
            />
            <TypeBtn
              active={type === "run"}
              label="COURSE"
              subtitle="temps/dist"
              icon="stopwatch"
              onPress={() => setType("run")}
              testID="type-run"
            />
          </View>

          <Text style={styles.label}>Exercice</Text>
          <TextInput
            testID="pr-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={
              type === "run"
                ? "Ex: Course à pied"
                : type === "reps"
                ? "Ex: Pompes"
                : "Ex: Développé couché"
            }
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          {type === "weight" && (
            <>
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
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>1RM ESTIMÉ (Epley)</Text>
                  <Text style={styles.previewValue}>{oneRM.toFixed(1)} kg</Text>
                  <Text style={styles.previewHint}>
                    {w} kg × (1 + {r}/30)
                  </Text>
                </View>
              )}
            </>
          )}

          {type === "reps" && (
            <>
              <Text style={styles.label}>Max de répétitions</Text>
              <TextInput
                testID="pr-max-reps"
                style={styles.input}
                value={reps}
                onChangeText={(t) => setReps(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="Ex: 25 pompes"
                placeholderTextColor={colors.onSurfaceTertiary}
              />
              {r > 0 && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>APERÇU % DE TON MAX</Text>
                  <View style={styles.previewGrid}>
                    {[50, 60, 70, 80, 90].map((p) => (
                      <View key={p} style={styles.previewChip}>
                        <Text style={styles.previewChipPct}>{p}%</Text>
                        <Text style={styles.previewChipVal}>
                          {Math.round((r * p) / 100)}
                        </Text>
                        <Text style={styles.previewChipUnit}>reps</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {type === "run" && (
            <>
              <Text style={styles.label}>Distance</Text>
              <View style={styles.presetRow}>
                {RUN_PRESETS.map((p) => {
                  const active =
                    !useCustomDist && distanceMeters === p.meters;
                  return (
                    <Pressable
                      key={p.meters}
                      testID={`preset-dist-${p.meters}`}
                      style={[
                        styles.distChip,
                        active && styles.distChipActive,
                      ]}
                      onPress={() => {
                        setUseCustomDist(false);
                        setDistanceMeters(p.meters);
                      }}
                    >
                      <Text
                        style={[
                          styles.distChipText,
                          active && { color: "#fff" },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  testID="preset-dist-custom"
                  style={[
                    styles.distChip,
                    useCustomDist && styles.distChipActive,
                  ]}
                  onPress={() => setUseCustomDist(true)}
                >
                  <Text
                    style={[
                      styles.distChipText,
                      useCustomDist && { color: "#fff" },
                    ]}
                  >
                    Perso
                  </Text>
                </Pressable>
              </View>

              {useCustomDist && (
                <View style={styles.customDistBox}>
                  <TextInput
                    testID="pr-custom-dist"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={customDistance}
                    onChangeText={setCustomDistance}
                    placeholder="Distance en km (ex: 7.5)"
                    placeholderTextColor={colors.onSurfaceTertiary}
                  />
                  <Text style={styles.customDistHint}>
                    Saisis ta distance en kilomètres
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Temps</Text>
              <View style={styles.timeRow}>
                <TimeBox
                  label="H"
                  value={hours}
                  onChange={setHours}
                  testID="pr-hours"
                />
                <Text style={styles.timeSep}>:</Text>
                <TimeBox
                  label="MIN"
                  value={minutes}
                  onChange={setMinutes}
                  testID="pr-minutes"
                />
                <Text style={styles.timeSep}>:</Text>
                <TimeBox
                  label="SEC"
                  value={seconds}
                  onChange={setSeconds}
                  testID="pr-seconds"
                />
              </View>

              {finalDistanceMeters > 0 && totalRunSec > 0 && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>ALLURE</Text>
                  <Text style={styles.previewValue}>{formatPace(pace)}</Text>
                  <Text style={styles.previewHint}>
                    {formatDurationHMS(totalRunSec)} pour{" "}
                    {(finalDistanceMeters / 1000).toFixed(2)} km
                  </Text>
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            testID="pr-notes"
            style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Après 8 semaines de prépa"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypeBtn({
  active,
  label,
  subtitle,
  icon,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.typeBtn, active && styles.typeBtnActive]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? "#fff" : colors.brand}
      />
      <Text
        style={[
          styles.typeBtnLabel,
          active && { color: "#fff" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.typeBtnSub,
          active && { color: "#ffffffcc" },
        ]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function TimeBox({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  return (
    <View style={styles.timeBox}>
      <TextInput
        testID={testID}
        style={styles.timeInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 3))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.onSurfaceTertiary}
      />
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
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
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 2,
  },
  typeBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  typeBtnLabel: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  typeBtnSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
  },
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
  previewCard: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  previewLabel: {
    color: "#fff",
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.9,
  },
  previewValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  previewHint: { color: "#fff", opacity: 0.85, fontSize: 11, marginTop: 4 },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  previewChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    alignItems: "center",
    minWidth: 54,
  },
  previewChipPct: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.85,
  },
  previewChipVal: { color: "#fff", fontSize: 18, fontWeight: "800" },
  previewChipUnit: { color: "#fff", fontSize: 9, opacity: 0.75 },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  distChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  distChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  customDistBox: { gap: 4 },
  customDistHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontStyle: "italic",
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  timeBox: { flex: 1, alignItems: "center" },
  timeInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 12,
    width: "100%",
  },
  timeLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
  },
  timeSep: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: -14,
  },
});
