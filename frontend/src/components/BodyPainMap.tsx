import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import Svg, { Circle, Rect, Ellipse } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import GlassCard from "@/src/components/ui/GlassCard";
import {
  PainEntry,
  PainZone,
  PAIN_ZONE_LABEL,
  painIntensityColor,
} from "@/src/utils/gym-storage";

type ViewSide = "front" | "back";

type ZoneSpot = { zone: PainZone; x: number; y: number; r: number };

const SHARED_SPOTS: ZoneSpot[] = [
  { zone: "head", x: 110, y: 28, r: 16 },
  { zone: "neck", x: 110, y: 54, r: 9 },
  { zone: "shoulders", x: 66, y: 72, r: 10 },
  { zone: "shoulders", x: 154, y: 72, r: 10 },
  { zone: "arms", x: 40, y: 105, r: 9 },
  { zone: "arms", x: 180, y: 105, r: 9 },
  { zone: "elbows", x: 40, y: 150, r: 9 },
  { zone: "elbows", x: 180, y: 150, r: 9 },
  { zone: "wrists", x: 40, y: 195, r: 8 },
  { zone: "wrists", x: 180, y: 195, r: 8 },
  { zone: "hips", x: 110, y: 165, r: 12 },
  { zone: "knees", x: 87, y: 248, r: 9 },
  { zone: "knees", x: 133, y: 248, r: 9 },
  { zone: "calves", x: 87, y: 300, r: 8 },
  { zone: "calves", x: 133, y: 300, r: 8 },
  { zone: "ankles", x: 87, y: 328, r: 7 },
  { zone: "ankles", x: 133, y: 328, r: 7 },
];

const FRONT_ONLY_SPOTS: ZoneSpot[] = [{ zone: "chest", x: 110, y: 95, r: 13 }];
const BACK_ONLY_SPOTS: ZoneSpot[] = [
  { zone: "back", x: 110, y: 90, r: 13 },
  { zone: "lowerBack", x: 110, y: 130, r: 10 },
];

/**
 * Visual, tappable body silhouette for logging localized pain — replaces the
 * old free-text field. Tapping a zone opens a small modal for intensity
 * (0-10, color-coded green→red — échelle sémantique de douleur, volontairement
 * hors du système de thème/accent) et un commentaire optionnel.
 */
export default function BodyPainMap({
  value,
  onChange,
  testID,
}: {
  value: PainEntry[];
  onChange: (next: PainEntry[]) => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  const [side, setSide] = useState<ViewSide>("front");
  const [editingZone, setEditingZone] = useState<PainZone | null>(null);

  const spots = [...SHARED_SPOTS, ...(side === "front" ? FRONT_ONLY_SPOTS : BACK_ONLY_SPOTS)];
  const entryFor = (zone: PainZone) => value.find((p) => p.zone === zone) ?? null;

  const saveZone = (zone: PainZone, intensity: number, comment: string | null) => {
    const next = value.filter((p) => p.zone !== zone);
    if (intensity > 0) next.push({ zone, intensity, comment });
    onChange(next);
    setEditingZone(null);
  };

  const removeZone = (zone: PainZone) => {
    onChange(value.filter((p) => p.zone !== zone));
    setEditingZone(null);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.headRow}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>Douleurs</Text>
        <View style={styles.sideToggle}>
          <Pressable
            testID="pain-view-front"
            style={[
              styles.sideChip,
              { borderRadius: theme.radius.pill, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary, borderColor: theme.colors.border },
              side === "front" &&
                (isGlass
                  ? { backgroundColor: withAlpha(theme.colors.brand, 22), borderColor: withAlpha(theme.colors.brand, 50) }
                  : { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }),
            ]}
            onPress={() => setSide("front")}
          >
            <Text
              style={[
                styles.sideChipText,
                { color: theme.colors.onSurfaceTertiary },
                side === "front" && { color: isGlass ? theme.colors.brand : "#fff" },
              ]}
            >
              FACE
            </Text>
          </Pressable>
          <Pressable
            testID="pain-view-back"
            style={[
              styles.sideChip,
              { borderRadius: theme.radius.pill, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary, borderColor: theme.colors.border },
              side === "back" &&
                (isGlass
                  ? { backgroundColor: withAlpha(theme.colors.brand, 22), borderColor: withAlpha(theme.colors.brand, 50) }
                  : { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }),
            ]}
            onPress={() => setSide("back")}
          >
            <Text
              style={[
                styles.sideChipText,
                { color: theme.colors.onSurfaceTertiary },
                side === "back" && { color: isGlass ? theme.colors.brand : "#fff" },
              ]}
            >
              DOS
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.figureBox}>
        <Svg width={220} height={356} viewBox="0 0 220 356">
          <Circle cx={110} cy={28} r={20} fill={theme.colors.surfaceTertiary} />
          <Rect x={98} y={46} width={24} height={14} rx={6} fill={theme.colors.surfaceTertiary} />
          <Rect x={58} y={58} width={104} height={90} rx={26} fill={theme.colors.surfaceTertiary} />
          <Rect x={30} y={64} width={22} height={140} rx={11} fill={theme.colors.surfaceTertiary} />
          <Rect x={168} y={64} width={22} height={140} rx={11} fill={theme.colors.surfaceTertiary} />
          <Rect x={68} y={140} width={84} height={50} rx={20} fill={theme.colors.surfaceTertiary} />
          <Rect x={72} y={182} width={30} height={140} rx={15} fill={theme.colors.surfaceTertiary} />
          <Rect x={118} y={182} width={30} height={140} rx={15} fill={theme.colors.surfaceTertiary} />
          <Ellipse cx={87} cy={338} rx={17} ry={9} fill={theme.colors.surfaceTertiary} />
          <Ellipse cx={133} cy={338} rx={17} ry={9} fill={theme.colors.surfaceTertiary} />
        </Svg>

        {spots.map((s, i) => {
          const entry = entryFor(s.zone);
          const color = entry ? painIntensityColor(entry.intensity) : theme.colors.border;
          return (
            <Pressable
              key={`${s.zone}-${i}`}
              testID={`pain-zone-${s.zone}`}
              onPress={() => setEditingZone(s.zone)}
              style={[
                styles.spot,
                {
                  left: s.x - s.r,
                  top: s.y - s.r,
                  width: s.r * 2,
                  height: s.r * 2,
                  borderRadius: s.r,
                  backgroundColor: entry ? color : "rgba(255,255,255,0.08)",
                  borderColor: entry ? color : theme.colors.borderStrong,
                },
              ]}
            >
              {entry && <Text style={styles.spotText}>{entry.intensity}</Text>}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendDot color="#4CAF50" label="1-3" textColor={theme.colors.onSurfaceTertiary} />
        <LegendDot color="#FFC107" label="4-6" textColor={theme.colors.onSurfaceTertiary} />
        <LegendDot color="#FF9800" label="7-8" textColor={theme.colors.onSurfaceTertiary} />
        <LegendDot color="#F44336" label="9-10" textColor={theme.colors.onSurfaceTertiary} />
      </View>

      {value.length > 0 && (
        <View style={styles.chipsRow}>
          {value.map((p) => (
            <Pressable
              key={p.zone}
              testID={`pain-chip-${p.zone}`}
              style={[
                styles.zoneChip,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceSecondary,
                  borderColor: painIntensityColor(p.intensity),
                },
              ]}
              onPress={() => setEditingZone(p.zone)}
            >
              <View
                style={[styles.zoneChipDot, { backgroundColor: painIntensityColor(p.intensity) }]}
              />
              <Text style={[styles.zoneChipText, { color: theme.colors.onSurface }]}>
                {PAIN_ZONE_LABEL[p.zone]} · {p.intensity}/10
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {editingZone && (
        <PainZoneModal
          theme={theme}
          zone={editingZone}
          entry={entryFor(editingZone)}
          onSave={(intensity, comment) => saveZone(editingZone, intensity, comment)}
          onRemove={() => removeZone(editingZone)}
          onClose={() => setEditingZone(null)}
        />
      )}
    </View>
  );
}

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function PainZoneModal({
  theme,
  zone,
  entry,
  onSave,
  onRemove,
  onClose,
}: {
  theme: Theme;
  zone: PainZone;
  entry: PainEntry | null;
  onSave: (intensity: number, comment: string | null) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const isGlass = theme.card.mode === "glass";
  const [intensity, setIntensity] = useState(entry?.intensity ?? 0);
  const [comment, setComment] = useState(entry?.comment ?? "");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[
            styles.modalCard,
            { borderRadius: theme.radius.lg },
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>{PAIN_ZONE_LABEL[zone]}</Text>

          <Text style={[styles.modalSub, { color: theme.colors.onSurfaceTertiary }]}>
            Intensité : {intensity === 0 ? "aucune" : `${intensity}/10`}
          </Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: 11 }, (_, n) => n).map((n) => (
              <Pressable
                key={n}
                testID={`pain-intensity-${n}`}
                onPress={() => setIntensity(n)}
                style={[
                  styles.intensityDot,
                  { backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary, borderColor: theme.colors.border },
                  n > 0 && n <= intensity && { backgroundColor: painIntensityColor(intensity) },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.modalSub, { color: theme.colors.onSurfaceTertiary }]}>Commentaire (optionnel)</Text>
          <TextInput
            testID="pain-comment-input"
            style={[
              styles.commentInput,
              {
                borderRadius: theme.radius.md,
                backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                borderColor: theme.colors.border,
                color: theme.colors.onSurface,
              },
            ]}
            value={comment}
            onChangeText={setComment}
            placeholder="Ex: tension en fin de séance"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            multiline
          />

          <View style={styles.modalActions}>
            {entry && (
              <Pressable
                testID="pain-remove"
                style={[styles.btnGhost, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
                onPress={onRemove}
              >
                <Ionicons name="trash" size={16} color={theme.colors.error} />
              </Pressable>
            )}
            <Pressable
              testID="pain-cancel"
              style={[styles.btnGhost, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnGhostText, { color: theme.colors.onSurfaceSecondary }]}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="pain-save"
              style={[
                styles.btnPrimary,
                { borderRadius: theme.radius.md },
                isGlass
                  ? [
                      { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                      coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                    ]
                  : { backgroundColor: theme.colors.brand },
              ]}
              onPress={() => onSave(intensity, comment.trim() ? comment.trim() : null)}
            >
              <Text style={[styles.btnPrimaryText, isGlass && { color: theme.colors.brand }]}>Valider</Text>
            </Pressable>
          </View>
        </GlassCard>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  sideToggle: { flexDirection: "row", gap: 4 },
  sideChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  sideChipText: { fontWeight: "800", fontSize: 10 },
  figureBox: {
    alignSelf: "center",
    width: 220,
    height: 356,
    position: "relative",
  },
  spot: {
    position: "absolute",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  spotText: { color: "#fff", fontWeight: "800", fontSize: 9 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  zoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  zoneChipDot: { width: 8, height: 8, borderRadius: 4 },
  zoneChipText: { fontWeight: "700", fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontWeight: "800", fontSize: 17 },
  modalSub: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  dotsRow: { flexDirection: "row", gap: 4 },
  intensityDot: {
    flex: 1,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
  },
  commentInput: {
    padding: spacing.md,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: "center",
  },
  btnGhost: {
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  btnGhostText: { fontWeight: "800" },
  btnPrimary: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
