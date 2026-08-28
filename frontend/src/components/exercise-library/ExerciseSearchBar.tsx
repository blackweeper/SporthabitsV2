import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";

export default function ExerciseSearchBar({
  value,
  onChange,
  placeholder = "Rechercher un exercice…",
  autoFocus,
  testID = "ex-search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Ionicons name="search" size={16} color={theme.colors.onSurfaceTertiary} />
      <TextInput
        testID={testID}
        style={[styles.input, { color: theme.colors.onSurface }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceTertiary}
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange("")} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={theme.colors.onSurfaceTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
});
