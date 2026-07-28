import { ReactNode, useRef } from "react";
import { StyleSheet, StyleProp, Text, ViewStyle } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/src/theme";
import { ConfirmOptions, useConfirmDialog } from "@/src/hooks/use-confirm-dialog";

type Props = {
  children: ReactNode;
  onDelete?: () => void | Promise<void>;
  deleteConfirm?: ConfirmOptions;
  deleteLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared swipe gesture for list rows across the app: swipe left reveals a
 * "Supprimer" action (with optional confirmation), swipe right reveals a
 * "Modifier" quick action. Mirrors the pattern originally built for the
 * Séances list so every list in the app behaves the same way.
 */
export default function SwipeableRow({
  children,
  onDelete,
  deleteConfirm,
  deleteLabel = "Supprimer",
  onEdit,
  editLabel = "Modifier",
  testID,
  style,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);
  const { confirm, ConfirmModal } = useConfirmDialog();

  if (!onDelete && !onEdit) {
    return <>{children}</>;
  }

  const handleDelete = async () => {
    if (deleteConfirm) {
      const ok = await confirm(deleteConfirm);
      if (!ok) {
        swipeRef.current?.close();
        return;
      }
    }
    swipeRef.current?.close();
    await onDelete?.();
  };

  const handleEdit = () => {
    swipeRef.current?.close();
    onEdit?.();
  };

  return (
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={
          onDelete
            ? () => (
                <RectButton
                  testID={testID ? `${testID}-swipe-delete` : undefined}
                  style={styles.deleteAction}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.actionText}>{deleteLabel}</Text>
                </RectButton>
              )
            : undefined
        }
        renderLeftActions={
          onEdit
            ? () => (
                <RectButton
                  testID={testID ? `${testID}-swipe-edit` : undefined}
                  style={styles.editAction}
                  onPress={handleEdit}
                >
                  <Ionicons name="pencil" size={20} color="#fff" />
                  <Text style={styles.actionText}>{editLabel}</Text>
                </RectButton>
              )
            : undefined
        }
        overshootRight={false}
        overshootLeft={false}
        friction={1.6}
        rightThreshold={40}
        leftThreshold={40}
        containerStyle={[styles.container, style]}
      >
        {children}
      </Swipeable>
      {onDelete ? ConfirmModal : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 96,
    flexDirection: "column",
    gap: 4,
  },
  editAction: {
    backgroundColor: colors.brand,
    justifyContent: "center",
    alignItems: "center",
    width: 96,
    flexDirection: "column",
    gap: 4,
  },
  actionText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
