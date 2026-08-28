import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import ProgramBrowseList from "@/src/components/ProgramBrowseList";

export default function ProgramsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const isStretch = category === "stretch";
  const isCardio = category === "cardio";
  const title = isStretch
    ? "Programmes d'étirement"
    : isCardio
      ? "Programmes cardio"
      : "Programmes";

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable
            testID="close-programs"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 26 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ProgramBrowseList
            category={isStretch ? "stretch" : isCardio ? "cardio" : undefined}
            router={router}
          />
          <View style={{ height: spacing.xl2 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
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
    scroll: { padding: spacing.lg, gap: spacing.md },
  });
}
