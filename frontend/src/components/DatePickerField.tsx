import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

// On native we lazy-require the picker so web bundles don't crash if resolution fails.
let RNDateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RNDateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {
    RNDateTimePicker = null;
  }
}

type Props = {
  value: string; // ISO string
  onChange: (iso: string) => void;
  testID?: string;
  maxDate?: Date; // default: today (no future)
  minDate?: Date;
  label?: string;
};

/**
 * Cross-platform date picker button.
 * - iOS: opens a modal with the native spinner
 * - Android: opens the native dialog
 * - Web: falls back to a hidden HTML <input type="date">
 */
export default function DatePickerField({
  value,
  onChange,
  testID,
  maxDate,
  minDate,
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const currentDate = new Date(value);
  const effectiveMax = maxDate ?? new Date();

  const setToday = () => {
    onChange(new Date().toISOString());
  };

  // ------- WEB -------
  if (Platform.OS === "web") {
    const isoDate = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const maxStr = effectiveMax.toISOString().slice(0, 10);
    const minStr = minDate ? minDate.toISOString().slice(0, 10) : undefined;
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.card} testID={testID}>
          <Ionicons name="calendar" size={16} color={colors.brand} />
          <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
          {/* @ts-expect-error DOM input for web only */}
          <input
            type="date"
            value={isoDate}
            max={maxStr}
            min={minStr}
            data-testid={testID ? `${testID}-input` : "date-input"}
            onChange={(e: any) => {
              const v = e.target.value;
              if (!v) return;
              // Preserve current time to avoid TZ shift losing the day.
              const nd = new Date(v + "T12:00:00");
              onChange(nd.toISOString());
            }}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
              border: 0,
              padding: 0,
              background: "transparent",
            }}
          />
          <Pressable
            testID={testID ? `${testID}-today` : "date-today"}
            onPress={setToday}
            hitSlop={8}
            style={styles.todayBtn}
          >
            <Text style={styles.todayText}>AUJOURD&apos;HUI</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ------- NATIVE -------
  const isAndroid = Platform.OS === "android";
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.card}
        onPress={() => setOpen(true)}
        testID={testID}
      >
        <Ionicons name="calendar" size={16} color={colors.brand} />
        <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        <Pressable
          testID={testID ? `${testID}-today` : "date-today"}
          onPress={setToday}
          hitSlop={8}
          style={styles.todayBtn}
        >
          <Text style={styles.todayText}>AUJOURD&apos;HUI</Text>
        </Pressable>
      </Pressable>

      {open && RNDateTimePicker && isAndroid && (
        <RNDateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          maximumDate={effectiveMax}
          minimumDate={minDate}
          onChange={(_: any, d?: Date) => {
            setOpen(false);
            if (d) onChange(d.toISOString());
          }}
        />
      )}

      {open && RNDateTimePicker && !isAndroid && (
        <Modal
          transparent
          animationType="slide"
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={styles.sheetCancel}>Annuler</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Choisir la date</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={styles.sheetDone}>OK</Text>
              </Pressable>
            </View>
            <RNDateTimePicker
              value={currentDate}
              mode="date"
              display="spinner"
              maximumDate={effectiveMax}
              minimumDate={minDate}
              textColor={colors.onSurface}
              onChange={(_: any, d?: Date) => {
                if (d) onChange(d.toISOString());
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  card: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    color: colors.onSurface,
    fontWeight: "600",
    flex: 1,
    textTransform: "capitalize",
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary ?? "rgba(255,107,0,0.15)",
  },
  todayText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  sheetCancel: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
  },
  sheetDone: {
    color: colors.brand,
    fontWeight: "800",
  },
});
