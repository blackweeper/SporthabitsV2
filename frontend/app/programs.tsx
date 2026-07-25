import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { PROGRAMS, LEVEL_LABEL, Program } from "@/src/data/programs";

export default function ProgramsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-programs"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Programmes</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Choisis un programme structuré à suivre jour par jour. Un programme = 30 jours de séances déjà pensées pour toi.
        </Text>
        {PROGRAMS.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            onPress={() => router.push(`/program/${p.id}`)}
          />
        ))}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramCard({
  program,
  onPress,
}: {
  program: Program;
  onPress: () => void;
}) {
  const sessions = program.days.filter((d) => !d.rest).length;
  return (
    <Pressable
      testID={`program-card-${program.id}`}
      style={[styles.card, { borderColor: program.color }]}
      onPress={onPress}
    >
      <View style={[styles.coverEmoji, { backgroundColor: `${program.color}22` }]}>
        <Text style={styles.emojiText}>{program.coverEmoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: program.color }]}>
            <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
          </View>
          <View style={styles.tagOutline}>
            <Text style={styles.tagOutlineText}>
              {program.durationDays} jours
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{program.title}</Text>
        <Text style={styles.cardGoal}>{program.goal}</Text>
        <Text style={styles.cardMeta}>
          {sessions} séances · {program.days.length - sessions} jours de repos
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
    </Pressable>
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  intro: {
    color: colors.onSurfaceTertiary,
    lineHeight: 18,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
  },
  coverEmoji: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 32 },
  tagRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  tagOutline: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagOutlineText: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cardGoal: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  cardMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
});
