import { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirmation dialog.
 * Native: wraps Alert.alert (reliable there).
 * Web: renders a custom in-app Modal instead of window.confirm — browsers can
 * permanently suppress window.confirm after repeated dialogs ("prevent this
 * page from creating additional dialogs"), and standalone/installed PWAs on
 * iOS never show it at all, silently returning false and making buttons look
 * dead.
 *
 * Usage:
 *   const { confirm, ConfirmModal } = useConfirmDialog();
 *   const ok = await confirm({ title: "Supprimer ?", destructive: true });
 *   ...
 *   return <>...<ConfirmModal /></>;
 */
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    if (Platform.OS !== "web") {
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          options.title,
          options.message,
          [
            {
              text: options.cancelLabel ?? "Annuler",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: options.confirmLabel ?? "OK",
              style: options.destructive ? "destructive" : "default",
              onPress: () => resolve(true),
            },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
    }
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const ConfirmModal = (
    <Modal
      visible={dialog !== null}
      animationType="fade"
      transparent
      onRequestClose={() => close(false)}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close(false)}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{dialog?.title}</Text>
          {dialog?.message ? (
            <Text style={styles.message}>{dialog.message}</Text>
          ) : null}
          <View style={styles.btnRow}>
            <Pressable
              testID="confirm-dialog-cancel"
              style={styles.btnCancel}
              onPress={() => close(false)}
            >
              <Text style={styles.btnCancelText}>
                {dialog?.cancelLabel ?? "ANNULER"}
              </Text>
            </Pressable>
            <Pressable
              testID="confirm-dialog-confirm"
              style={[
                styles.btnPrimary,
                dialog?.destructive && styles.btnDestructive,
              ]}
              onPress={() => close(true)}
            >
              <Text style={styles.btnPrimaryText}>
                {dialog?.confirmLabel ?? "OK"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { confirm, ConfirmModal };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.brand,
  },
  btnDestructive: {
    backgroundColor: colors.error,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
