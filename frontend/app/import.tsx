import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { Exercise, Plan, savePlan, uid } from "@/src/utils/gym-storage";

const AI_BG =
  "https://images.unsplash.com/photo-1673347765440-ce248bebc94d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjBsaW5lcyUyMHNjYW5uaW5nfGVufDB8fHx8MTc4NDk4MTQ0Mnww&ixlib=rb-4.1.0&q=85";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export default function ImportScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"pick" | "scanning" | "result">("pick");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{
    title: string;
    exercises: Omit<Exercise, "id">[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickImage(fromCamera: boolean) {
    setError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission requise",
        fromCamera
          ? "Autorise l'accès à la caméra pour photographier ton plan."
          : "Autorise l'accès aux photos pour importer ton plan.",
      );
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setError("Impossible de lire l'image");
      return;
    }
    setImageUri(asset.uri);
    await sendToAI(asset.base64);
  }

  async function sendToAI(base64: string) {
    setPhase("scanning");
    try {
      const resp = await fetch(`${BACKEND}/api/parse-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setParsed({
        title: data.title,
        exercises: data.exercises,
      });
      setPhase("result");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'analyse");
      setPhase("pick");
    }
  }

  async function saveParsed() {
    if (!parsed) return;
    const plan: Plan = {
      id: uid(),
      title: parsed.title,
      type: "mixte",
      createdAt: new Date().toISOString(),
      exercises: parsed.exercises.map((e) => ({ ...e, id: uid() })),
    };
    await savePlan(plan);
    router.replace(`/plan/${plan.id}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-import"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Importer un plan</Text>
        <View style={{ width: 26 }} />
      </View>

      {phase === "pick" && (
        <View style={styles.pickContent}>
          <View style={styles.instructionBox}>
            <Ionicons name="sparkles" size={22} color={colors.brand} />
            <Text style={styles.instructionTitle}>
              IA analyse ton plan sportif
            </Text>
            <Text style={styles.instructionText}>
              Prends une photo claire de ton plan (papier, écran, PDF). L&apos;IA
              extrait automatiquement les exercices, séries, répétitions et
              temps de pause.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            testID="btn-camera"
            style={styles.bigBtn}
            onPress={() => pickImage(true)}
          >
            <Ionicons name="camera" size={22} color="#fff" />
            <Text style={styles.bigBtnText}>PRENDRE UNE PHOTO</Text>
          </Pressable>

          <Pressable
            testID="btn-gallery"
            style={[styles.bigBtn, styles.bigBtnSecondary]}
            onPress={() => pickImage(false)}
          >
            <Ionicons name="images" size={22} color={colors.brand} />
            <Text style={[styles.bigBtnText, { color: colors.brand }]}>
              CHOISIR DEPUIS LA GALERIE
            </Text>
          </Pressable>
        </View>
      )}

      {phase === "scanning" && (
        <View style={styles.scanContainer}>
          <Image source={{ uri: AI_BG }} style={styles.scanBg} />
          <LinearGradient
            colors={["rgba(14,14,14,0.6)", "rgba(14,14,14,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          )}
          <View style={styles.scanContent}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.scanTitle}>ANALYSE IA EN COURS</Text>
            <Text style={styles.scanSub}>
              Extraction des exercices, séries et pauses…
            </Text>
          </View>
        </View>
      )}

      {phase === "result" && parsed && (
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.successText}>
              {parsed.exercises.length} exercice
              {parsed.exercises.length > 1 ? "s" : ""} détecté
              {parsed.exercises.length > 1 ? "s" : ""}
            </Text>
          </View>
          <Text style={styles.resultTitle}>{parsed.title}</Text>
          {parsed.exercises.map((ex, i) => (
            <View key={i} style={styles.exCard} testID={`parsed-ex-${i}`}>
              <View style={styles.exHeader}>
                <View style={styles.exBadge}>
                  <Text style={styles.exBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.exName}>{ex.name}</Text>
                <View style={styles.modeTag}>
                  <Text style={styles.modeTagText}>
                    {ex.mode?.toUpperCase() ?? "REPS"}
                  </Text>
                </View>
              </View>
              <View style={styles.exMetaRow}>
                {ex.mode === "amrap" ? (
                  <>
                    <MetaChip
                      label="Durée"
                      value={formatSec(ex.duration_seconds ?? 0)}
                    />
                    {ex.notes ? <MetaChip label="Consigne" value={ex.notes} /> : null}
                  </>
                ) : ex.mode === "time" ? (
                  <>
                    <MetaChip label="Séries" value={String(ex.sets)} />
                    <MetaChip
                      label="Durée"
                      value={formatSec(ex.duration_seconds ?? 0)}
                    />
                    {ex.rest_seconds ? (
                      <MetaChip label="Repos" value={`${ex.rest_seconds}s`} />
                    ) : null}
                  </>
                ) : (
                  <>
                    <MetaChip label="Séries" value={String(ex.sets)} />
                    <MetaChip label="Reps" value={ex.reps} />
                    <MetaChip
                      label="Repos"
                      value={`${ex.rest_seconds}s`}
                    />
                    {ex.weight ? <MetaChip label="Poids" value={ex.weight} /> : null}
                  </>
                )}
              </View>
              {ex.notes && ex.mode !== "amrap" && (
                <Text style={styles.exNotes}>{ex.notes}</Text>
              )}
            </View>
          ))}
          <Pressable
            testID="btn-save-plan"
            style={styles.bigBtn}
            onPress={saveParsed}
          >
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.bigBtnText}>ENREGISTRER LE PLAN</Text>
          </Pressable>
          <Pressable
            testID="btn-retry"
            style={styles.linkBtn}
            onPress={() => {
              setParsed(null);
              setImageUri(null);
              setPhase("pick");
            }}
          >
            <Text style={styles.linkText}>Recommencer</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipVal}>{value}</Text>
    </View>
  );
}

function formatSec(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m}min`;
  return `${m}min${s}s`;
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  pickContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  instructionBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  instructionTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
  },
  instructionText: {
    color: colors.onSurfaceTertiary,
    lineHeight: 20,
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: "#3A0000",
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: { color: colors.error, flex: 1, fontSize: 13 },
  bigBtn: {
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  bigBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  bigBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  scanContainer: { flex: 1, position: "relative" },
  scanBg: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  previewImg: {
    position: "absolute",
    top: 40,
    left: 40,
    right: 40,
    height: 260,
    borderRadius: radius.md,
    opacity: 0.5,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  scanContent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: 80,
  },
  scanTitle: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: spacing.lg,
  },
  scanSub: { color: colors.onSurfaceTertiary, textAlign: "center" },
  resultScroll: { padding: spacing.lg, gap: spacing.md },
  successBanner: {
    backgroundColor: "#0F2F1A",
    borderColor: colors.success,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  successText: { color: colors.success, fontWeight: "600" },
  resultTitle: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginVertical: spacing.sm,
  },
  exCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  exHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  exBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  exBadgeText: { color: colors.brandSecondary, fontWeight: "800" },
  exName: { color: colors.onSurface, fontWeight: "700", fontSize: 15, flex: 1 },
  exMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  chipLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 0.5 },
  chipVal: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  exNotes: { color: colors.onSurfaceTertiary, fontSize: 12, fontStyle: "italic" },
  modeTag: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modeTagText: {
    color: colors.brandSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  linkBtn: { padding: spacing.md, alignItems: "center" },
  linkText: {
    color: colors.onSurfaceSecondary,
    textDecorationLine: "underline",
  },
});
