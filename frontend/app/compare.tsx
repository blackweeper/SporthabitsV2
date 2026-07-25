import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { getMeasurements, Measurement } from "@/src/utils/gym-storage";

export default function CompareScreen() {
  const router = useRouter();
  const [all, setAll] = useState<Measurement[]>([]);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "before" | "after">(null);

  useEffect(() => {
    (async () => {
      const list = (await getMeasurements()).filter((m) => !!m.photoBase64);
      // sort ascending by date
      list.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setAll(list);
      if (list.length >= 2) {
        setBeforeId(list[0].id);
        setAfterId(list[list.length - 1].id);
      } else if (list.length === 1) {
        setBeforeId(list[0].id);
      }
    })();
  }, []);

  const before = useMemo(
    () => all.find((m) => m.id === beforeId) || null,
    [all, beforeId],
  );
  const after = useMemo(
    () => all.find((m) => m.id === afterId) || null,
    [all, afterId],
  );

  const swap = useCallback(() => {
    setBeforeId(afterId);
    setAfterId(beforeId);
  }, [afterId, beforeId]);

  const daysBetween = useMemo(() => {
    if (!before || !after) return 0;
    const diff = Math.abs(
      new Date(after.date).getTime() - new Date(before.date).getTime(),
    );
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }, [before, after]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-compare"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Avant / Après</Text>
        <Pressable
          testID="swap-compare"
          onPress={swap}
          hitSlop={12}
          disabled={!before || !after}
        >
          <Ionicons
            name="swap-horizontal"
            size={22}
            color={
              before && after ? colors.brand : colors.onSurfaceTertiary
            }
          />
        </Pressable>
      </View>

      {all.length < 2 ? (
        <View style={styles.empty}>
          <Ionicons name="images" size={40} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>
            Ajoute au moins 2 mesures avec photo pour comparer.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Side by side photos */}
          <View style={styles.photosRow}>
            <PhotoColumn
              label="AVANT"
              measurement={before}
              onPick={() => setPicker("before")}
              testIDPrefix="before"
            />
            <View style={styles.photoDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerBadge}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
              <View style={styles.dividerLine} />
            </View>
            <PhotoColumn
              label="APRÈS"
              measurement={after}
              onPick={() => setPicker("after")}
              testIDPrefix="after"
            />
          </View>

          {/* Delta pills */}
          {before && after && (
            <View style={styles.deltaCard}>
              <View style={styles.deltaHeader}>
                <Ionicons name="calendar" size={14} color={colors.brand} />
                <Text style={styles.deltaHeaderText}>
                  {daysBetween} jour{daysBetween > 1 ? "s" : ""} d&apos;écart
                </Text>
              </View>

              <DeltaRow
                label="Poids"
                unit="kg"
                a={before.weight_kg}
                b={after.weight_kg}
                lowerBetter
                testID="delta-weight"
              />
              <DeltaRow
                label="Tour de taille"
                unit="cm"
                a={before.waist_cm}
                b={after.waist_cm}
                lowerBetter
                testID="delta-waist"
              />
              <DeltaRow
                label="Tour de poitrine"
                unit="cm"
                a={before.chest_cm}
                b={after.chest_cm}
                testID="delta-chest"
              />
              <DeltaRow
                label="Tour de cuisse"
                unit="cm"
                a={before.thigh_cm}
                b={after.thigh_cm}
                testID="delta-thigh"
              />
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Picker sheet */}
      <Modal
        transparent
        visible={picker !== null}
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setPicker(null)} />
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerTitle}>
              Choisir la photo {picker === "before" ? "AVANT" : "APRÈS"}
            </Text>
            <ScrollView
              contentContainerStyle={styles.pickerGrid}
              showsVerticalScrollIndicator={false}
            >
              {all.map((m) => {
                const selected =
                  (picker === "before" && m.id === beforeId) ||
                  (picker === "after" && m.id === afterId);
                return (
                  <Pressable
                    key={m.id}
                    testID={`pick-${picker}-${m.id}`}
                    style={[
                      styles.pickCard,
                      selected && styles.pickCardActive,
                    ]}
                    onPress={() => {
                      if (picker === "before") setBeforeId(m.id);
                      else setAfterId(m.id);
                      setPicker(null);
                    }}
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${m.photoBase64}`,
                      }}
                      style={styles.pickImg}
                    />
                    <Text style={styles.pickDate}>{formatShort(m.date)}</Text>
                    {m.weight_kg != null && (
                      <Text style={styles.pickMeta}>{m.weight_kg} kg</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoColumn({
  label,
  measurement,
  onPick,
  testIDPrefix,
}: {
  label: string;
  measurement: Measurement | null;
  onPick: () => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.photoCol}>
      <Text style={styles.photoLabel}>{label}</Text>
      <Pressable
        testID={`pick-${testIDPrefix}`}
        onPress={onPick}
        style={styles.photoPress}
      >
        {measurement && measurement.photoBase64 ? (
          <Image
            source={{
              uri: `data:image/jpeg;base64,${measurement.photoBase64}`,
            }}
            style={styles.photo}
          />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Ionicons
              name="add-circle"
              size={30}
              color={colors.onSurfaceTertiary}
            />
            <Text style={styles.photoEmptyText}>Choisir</Text>
          </View>
        )}
      </Pressable>
      {measurement && (
        <View style={styles.photoMeta}>
          <Text style={styles.photoDate}>{formatShort(measurement.date)}</Text>
          {measurement.weight_kg != null && (
            <Text style={styles.photoWeight}>
              {measurement.weight_kg} kg
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function DeltaRow({
  label,
  unit,
  a,
  b,
  lowerBetter,
  testID,
}: {
  label: string;
  unit: string;
  a: number | null;
  b: number | null;
  lowerBetter?: boolean;
  testID?: string;
}) {
  if (a == null || b == null) return null;
  const diff = b - a;
  const positive = diff > 0;
  const isImprovement = lowerBetter ? diff < 0 : diff > 0;
  const color =
    diff === 0
      ? colors.onSurfaceTertiary
      : isImprovement
        ? colors.success
        : colors.error;
  return (
    <View style={styles.deltaRow} testID={testID}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <View style={styles.deltaVals}>
        <Text style={styles.deltaVal}>
          {a}
          <Text style={styles.deltaUnit}> {unit}</Text>
        </Text>
        <Ionicons
          name="arrow-forward"
          size={12}
          color={colors.onSurfaceTertiary}
        />
        <Text style={styles.deltaVal}>
          {b}
          <Text style={styles.deltaUnit}> {unit}</Text>
        </Text>
        <View style={[styles.deltaChip, { backgroundColor: `${color}22` }]}>
          <Ionicons
            name={
              diff === 0
                ? "remove"
                : positive
                  ? "arrow-up"
                  : "arrow-down"
            }
            size={11}
            color={color}
          />
          <Text style={[styles.deltaChipText, { color }]}>
            {Math.abs(diff).toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

const PHOTO_H = Math.round(Dimensions.get("window").height * 0.42);

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
  scroll: { padding: spacing.md, gap: spacing.lg },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  photosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  photoCol: { flex: 1, gap: 6 },
  photoLabel: {
    color: colors.brand,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  photoPress: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: PHOTO_H,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  photoEmpty: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoEmptyText: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
  },
  photoDivider: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dividerLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    minHeight: 40,
  },
  dividerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  photoMeta: { alignItems: "center", marginTop: 4 },
  photoDate: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  photoWeight: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  deltaCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  deltaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  deltaHeaderText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  deltaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  deltaLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  deltaVals: { flexDirection: "row", alignItems: "center", gap: 6 },
  deltaVal: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 14,
  },
  deltaUnit: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "500",
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: 4,
  },
  deltaChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  pickerTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  pickCard: {
    width: "47%",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pickCardActive: { borderColor: colors.brand },
  pickImg: {
    width: "100%",
    height: 140,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  pickDate: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  pickMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
  },
});
