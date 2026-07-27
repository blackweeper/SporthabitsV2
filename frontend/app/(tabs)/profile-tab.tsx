import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { getProfile, UserProfile } from "@/src/utils/gym-storage";
import { progressionHref } from "@/src/utils/progression-nav";

export default function ProfileTab() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProfile(await getProfile());
      })();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Photo + Name — clickable → edit profile */}
        <Pressable
          testID="profile-header-row"
          style={styles.headerRow}
          onPress={() => router.push("/profile")}
        >
          <View style={styles.avatarCircle}>
            {profile?.photoBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }}
                style={styles.avatarImg}
              />
            ) : (
              <Ionicons name="person" size={30} color={colors.onSurfaceTertiary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {profile?.name || "Ajouter ton prénom"}
            </Text>
            <Text style={styles.userSub}>
              {[
                profile?.sex ? capitalize(profile.sex) : null,
                profile?.age ? `${profile.age} ans` : null,
                profile?.weight_kg ? `${profile.weight_kg} kg` : null,
                profile?.height_cm ? `${profile.height_cm} cm` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Renseigne tes infos personnelles"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
        </Pressable>

        {/* Sections list */}
        <Text style={styles.sectionLabel}>SUIVI CORPOREL</Text>
        <ListRow
          icon="resize"
          iconBg="#4FC3F7"
          title="Mesures"
          subtitle="Poids, taille, tour de bras, masse grasse…"
          onPress={() => router.push(progressionHref("transformation") as any)}
          testID="row-measurements"
        />
        <ListRow
          icon="camera"
          iconBg="#AB47BC"
          title="Photos de progression"
          subtitle="Comparateur avant/après"
          onPress={() => router.push("/compare")}
          testID="row-photos"
        />

        <Text style={styles.sectionLabel}>PROGRESSION</Text>
        <ListRow
          icon="trophy"
          iconBg="#FFC107"
          title="Succès"
          subtitle="Badges & trophées"
          onPress={() => router.push("/achievements")}
          testID="row-achievements"
        />
        <ListRow
          icon="flag"
          iconBg="#B39DDB"
          title="Objectifs"
          subtitle="Cibles personnelles"
          onPress={() => router.push("/goals")}
          testID="row-goals"
        />
        <ListRow
          icon="stats-chart"
          iconBg="#00E676"
          title="Statistiques avancées"
          subtitle="Volume, streak, calendrier…"
          onPress={() => router.push("/stats")}
          testID="row-stats"
        />

        <Text style={styles.sectionLabel}>ACTIVITÉ</Text>
        <ListRow
          icon="time"
          iconBg={colors.brand}
          title="Historique des séances"
          subtitle="Toutes tes séances passées"
          onPress={() => router.push("/history")}
          testID="row-history"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ListRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: any;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
    </Pressable>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: 6, paddingBottom: 60 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  userName: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  userSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  rowSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 2,
  },
});
