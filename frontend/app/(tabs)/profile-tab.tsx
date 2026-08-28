import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import {
  getGoals,
  getHabitLogs,
  getHabits,
  getMeasurements,
  getPRs,
  getProfile,
  getSessions,
  UserProfile,
} from "@/src/utils/gym-storage";
import { getLibraryMeta } from "@/src/utils/exercise-records";
import { computeXPState, XPState } from "@/src/utils/xp";
import { computeAdvancedStats } from "@/src/utils/stats";
import { computeAchievements } from "@/src/utils/achievements";
import Card from "@/src/components/ui/Card";
import PressableScale from "@/src/components/ui/PressableScale";
import CockpitCard from "@/src/components/CockpitCard";

export default function ProfileTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [librarySubtitle, setLibrarySubtitle] = useState("Chargement…");
  const [xpState, setXpState] = useState<XPState | null>(null);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [currentStreakDays, setCurrentStreakDays] = useState(0);
  const [bestStreakDays, setBestStreakDays] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProfile(await getProfile());
        const [sessions, habits, habitLogs, prs, goals, measurements] = await Promise.all([
          getSessions(),
          getHabits(),
          getHabitLogs(),
          getPRs(),
          getGoals(),
          getMeasurements(),
        ]);
        setXpState(computeXPState({ sessions, habits, habitLogs, prs }));
        setActiveGoalsCount(goals.filter((g) => !g.achievedAt).length);
        const stats = computeAdvancedStats(sessions);
        setCurrentStreakDays(stats.currentStreakDays);
        setBestStreakDays(stats.bestStreakDays);
        const achievementsList = computeAchievements({ sessions, prs, measurements });
        setUnlockedAchievements(achievementsList.filter((a) => a.unlocked).length);
        setTotalAchievements(achievementsList.length);
        const meta = await getLibraryMeta();
        const dateStr = meta.lastUpdatedAt
          ? new Date(meta.lastUpdatedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "jamais";
        setLibrarySubtitle(
          meta.exerciseCount > 0
            ? `${meta.exerciseCount} exercices · Dernière mise à jour : ${dateStr}`
            : "Version, mises à jour et sauvegarde",
        );
      })();
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top"]}
      >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Photo + Name — clickable → edit profile */}
        <PressableScale
          testID="profile-header-row"
          style={styles.headerRowSpacing}
          onPress={() => router.push("/profile")}
        >
          <Card style={styles.headerRowLayout}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.brand }]}>
              {profile?.photoBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }}
                  style={styles.avatarImg}
                />
              ) : (
                <Ionicons name="person" size={30} color={theme.colors.onSurfaceTertiary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                {profile?.name || "Ajouter ton prénom"}
              </Text>
              <Text style={[styles.userSub, { color: theme.colors.onSurfaceTertiary }]}>
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
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceTertiary} />
          </Card>
        </PressableScale>

        {/* Niveau/XP/Streak/Trophées — le Profil est désormais la destination
            permanente de ce résumé (retiré du Dashboard, qui reste un
            cockpit quotidien) : visible dès l'ouverture, pas seulement à un
            tap de distance. Composant partagé avec le Dashboard le cas
            échéant, pour un rendu identique partout où il apparaît. */}
        {xpState && (
          <View style={styles.cockpitSpacing}>
            <CockpitCard
              testID="profile-cockpit-card"
              xpState={xpState}
              currentStreakDays={currentStreakDays}
              bestStreakDays={bestStreakDays}
              unlockedAchievements={unlockedAchievements}
              totalAchievements={totalAchievements}
            />
          </View>
        )}

        <PressableScale
          testID="profile-goals-pill"
          style={styles.goalsPillSpacing}
          onPress={() => router.push("/goals")}
        >
          <Card style={styles.statPill} padding={spacing.sm}>
            <View style={[styles.statPillBadge, { backgroundColor: theme.colors.brand }]}>
              <Ionicons name="flag" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statPillLabel, { color: theme.colors.onSurfaceTertiary }]}>OBJECTIFS</Text>
              <Text style={[styles.statPillValue, { color: theme.colors.onSurface }]}>
                {activeGoalsCount > 0
                  ? `${activeGoalsCount} en cours`
                  : "Aucun objectif"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </Card>
        </PressableScale>

        {/* Sections list */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>SUIVI CORPOREL</Text>
        <ListRow
          icon="resize"
          iconBg="#4FC3F7"
          title="Mesures"
          subtitle="Poids, taille, tour de bras, masse grasse…"
          onPress={() => router.push("/sante" as any)}
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

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>PROGRESSION</Text>
        <ListRow
          icon="flag"
          iconBg={theme.colors.progressSecondary}
          title="Objectifs"
          subtitle="Cibles personnelles"
          onPress={() => router.push("/goals")}
          testID="row-goals"
        />
        <ListRow
          icon="stats-chart"
          iconBg={theme.colors.success}
          title="Statistiques avancées"
          subtitle="Volume, streak, calendrier…"
          onPress={() => router.push("/stats")}
          testID="row-stats"
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>ACTIVITÉ</Text>
        <ListRow
          icon="time"
          iconBg={theme.colors.brand}
          title="Historique des séances"
          subtitle="Toutes tes séances passées"
          onPress={() => router.push("/history")}
          testID="row-history"
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>PARAMÈTRES</Text>
        <ListRow
          icon="color-palette"
          iconBg="#7E57C2"
          title="Apparence"
          subtitle="Affichage du calendrier du Dashboard"
          onPress={() => router.push("/settings" as any)}
          testID="row-settings"
        />
        <ListRow
          icon="fast-food"
          iconBg="#F97316"
          title="Raccourcis repas"
          subtitle="Personnalise les raccourcis de la carte Calories"
          onPress={() => router.push("/meal-presets" as any)}
          testID="row-meal-presets"
        />
        <ListRow
          icon="library"
          iconBg="#26A69A"
          title="Bibliothèque d'exercices"
          subtitle={librarySubtitle}
          onPress={() => router.push("/exercise-library-settings" as any)}
          testID="row-exercise-library"
        />
        <ListRow
          icon="heart"
          iconBg="#EF4444"
          title="Import santé (Health Auto Export)"
          subtitle="Fréquence cardiaque et séances Apple Health"
          onPress={() => router.push("/health-sync-settings" as any)}
          testID="row-health-sync"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
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
  const { theme } = useTheme();
  return (
    <PressableScale testID={testID} onPress={onPress}>
      <Card style={styles.rowLayout}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text style={[styles.rowSub, { color: theme.colors.onSurfaceTertiary }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
      </Card>
    </PressableScale>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: 6, paddingBottom: 60 },
  // Forme de carte (fond/bordure/radius/padding) déléguée au composant Card
  // partagé — ces styles ne portent plus que la mise en page interne.
  headerRowSpacing: { marginBottom: spacing.sm },
  headerRowLayout: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  userName: {
    fontSize: 18,
    fontWeight: "800",
  },
  userSub: {
    fontSize: 12,
    marginTop: 4,
  },
  cockpitSpacing: { marginBottom: spacing.sm },
  goalsPillSpacing: { marginBottom: spacing.md },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statPillBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillBadgeNum: { color: "#fff", fontWeight: "800", fontSize: 15 },
  statPillLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: 4,
  },
  rowLayout: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontWeight: "800", fontSize: 14 },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
