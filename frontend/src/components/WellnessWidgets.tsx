import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
import {
  FeelingMood,
  FEELING_MOOD_EMOJI,
  FEELING_MOOD_LABEL,
  patchWellnessLog,
  todayYYYYMMDD,
  WellnessLog,
} from "@/src/utils/gym-storage";

type WidgetProps = {
  log: WellnessLog | null;
  targetWater: number;
  targetCalories: number;
  targetSteps: number;
  onChange: () => void;
};

/**
 * Trio of widget cards: Water / Calories / Steps.
 * Each supports quick +/- and a custom-value modal.
 */
export function WellnessQuickWidgets({
  log,
  targetWater,
  targetCalories,
  targetSteps,
  onChange,
}: WidgetProps) {
  const today = todayYYYYMMDD();
  const water = log?.water_ml ?? 0;
  const calories = log?.calories_kcal ?? 0;
  const steps = log?.steps ?? 0;

  const bump = async (
    field: "water_ml" | "calories_kcal" | "steps",
    delta: number,
  ) => {
    Haptics.selectionAsync().catch(() => {});
    const cur = log?.[field] ?? 0;
    const next = Math.max(0, cur + delta);
    await patchWellnessLog(today, { [field]: next });
    onChange();
  };

  const setValue = async (
    field: "water_ml" | "calories_kcal" | "steps",
    value: number,
  ) => {
    await patchWellnessLog(today, { [field]: Math.max(0, value) });
    onChange();
  };

  return (
    <View style={styles.widgetsGrid}>
      <WellnessCard
        icon="water"
        color="#3B82F6"
        label="Eau"
        value={water}
        target={targetWater}
        unit="ml"
        shortcuts={[
          { label: "+250", delta: 250 },
          { label: "+500", delta: 500 },
        ]}
        onBump={(d) => bump("water_ml", d)}
        onSet={(v) => setValue("water_ml", v)}
        testId="widget-water"
      />
      <WellnessCard
        icon="nutrition"
        color="#F97316"
        label="Calories"
        value={calories}
        target={targetCalories}
        unit="kcal"
        shortcuts={[
          { label: "+200", delta: 200 },
          { label: "+500", delta: 500 },
        ]}
        onBump={(d) => bump("calories_kcal", d)}
        onSet={(v) => setValue("calories_kcal", v)}
        testId="widget-calories"
      />
      <WellnessCard
        icon="footsteps"
        color="#10B981"
        label="Pas"
        value={steps}
        target={targetSteps}
        unit="pas"
        shortcuts={[
          { label: "+1000", delta: 1000 },
          { label: "+2500", delta: 2500 },
        ]}
        onBump={(d) => bump("steps", d)}
        onSet={(v) => setValue("steps", v)}
        testId="widget-steps"
      />
    </View>
  );
}

function WellnessCard({
  icon,
  color,
  label,
  value,
  target,
  unit,
  shortcuts,
  onBump,
  onSet,
  testId,
}: {
  icon: any;
  color: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  shortcuts: { label: string; delta: number }[];
  onBump: (delta: number) => void;
  onSet: (value: number) => void;
  testId?: string;
}) {
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState("");
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const done = pct >= 1;

  const openModal = () => {
    setDraft(String(value));
    setModal(true);
  };

  const submit = () => {
    const n = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) onSet(n);
    setModal(false);
  };

  return (
    <View style={[styles.card, done && { borderColor: color }]} testID={testId}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, { backgroundColor: color + "26" }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
        {done && <Ionicons name="checkmark-circle" size={14} color={color} />}
      </View>
      <Pressable
        testID={`${testId}-value`}
        onPress={openModal}
        style={styles.cardValueWrap}
      >
        <Text style={styles.cardValue}>{formatNumber(value)}</Text>
        <Text style={styles.cardTarget}>
          / {formatNumber(target)} {unit}
        </Text>
      </Pressable>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <View style={styles.cardControls}>
        <Pressable
          testID={`${testId}-minus`}
          style={styles.miniBtn}
          onPress={() => onBump(-shortcuts[0].delta)}
          hitSlop={6}
        >
          <Ionicons name="remove" size={14} color={colors.onSurface} />
        </Pressable>
        {shortcuts.map((s) => (
          <Pressable
            key={s.label}
            testID={`${testId}-${s.label}`}
            style={styles.chipBtn}
            onPress={() => onBump(s.delta)}
          >
            <Text style={styles.chipBtnText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal
        transparent
        visible={modal}
        animationType="fade"
        onRequestClose={() => setModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setModal(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Saisir {label.toLowerCase()}
              </Text>
              <TextInput
                testID={`${testId}-modal-input`}
                style={styles.modalInput}
                value={draft}
                onChangeText={setDraft}
                keyboardType="number-pad"
                placeholder={`0 ${unit}`}
                placeholderTextColor={colors.onSurfaceTertiary}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setModal(false)}
                  style={styles.modalBtnGhost}
                >
                  <Text style={styles.modalBtnGhostText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  style={[styles.modalBtn, { backgroundColor: color }]}
                  testID={`${testId}-modal-save`}
                >
                  <Text style={styles.modalBtnText}>Valider</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
          <Pressable style={{ flex: 1 }} onPress={() => setModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

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

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

const styles = StyleSheet.create({
  widgetsGrid: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  cardValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  cardValue: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "800",
  },
  cardTarget: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  cardControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipBtnText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  modalBtnGhost: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGhostText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "800",
  },
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
