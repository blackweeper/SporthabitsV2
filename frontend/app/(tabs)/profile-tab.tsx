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
  getMeasurements,
  getPRs,
  getProfile,
  getSessions,
  UserProfile,
} from "@/src/utils/gym-storage";
import { getLibraryMeta } from "@/src/utils/exercise-records";
import { computeLevelState, LevelState, syncXPLedger } from "@/src/utils/xp";
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
  const [levelState, setLevelState] = useState<LevelState | null>(null);
  const [currentStreakDays, setCurrentStreakDays] = useState(0);
  const [bestStreakDays, setBestStreakDays] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProfile(await getProfile());
        const [sessions, prs, measurements] = await Promise.all([
          getSessions(),
          getPRs(),
          getMeasurements(),
        ]);
        const stats = computeAdvancedStats(sessions);
        setCurrentStreakDays(stats.currentStreakDays);
        setBestStreakDays(stats.bestStreakDays);
        const achievementsList = computeAchievements({ sessions, prs, measurements });
        setUnlockedAchievements(achievementsList.filter((a) => a.unlocked).length);
        setTotalAchievements(achievementsList.length);
        const ledger = await syncXPLedger({ sessions, prs, achievements: achievementsList });
        setLevelState(computeLevelState(ledger.reduce((sum, e) => sum + e.amount, 0)));
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
        {levelState && (
          <View style={styles.cockpitSpacing}>
            <CockpitCard
              testID="profile-cockpit-card"
              levelState={levelState}
              currentStreakDays={currentStreakDays}
              bestStreakDays={bestStreakDays}
              unlockedAchievements={unlockedAchievements}
              totalAchievements={totalAchievements}
            />
          </View>
        )}

        {/* Sections list — 4 entrées claires plutôt qu'une longue liste
            plate (POLISH V2). Mesures/Photos (déjà accessibles depuis
            Santé) et Objectifs (système remplacé par Défis) sont retirés de
            cette liste — leurs écrans/données restent intacts ailleurs. */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>PROFIL & PRÉFÉRENCES</Text>
        <ListRow
          icon="color-palette"
          iconBg="#7E57C2"
          title="Apparence"
          subtitle="Thème, fond d'écran"
          onPress={() => router.push("/settings" as any)}
          testID="row-settings"
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>ENTRAÎNEMENT</Text>
        <ListRow
          icon="stats-chart"
          iconBg={theme.colors.success}
          title="Historique & statistiques"
          subtitle="Séances passées, progression, évolution"
          onPress={() => router.push("/history")}
          testID="row-history"
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>SANTÉ</Text>
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

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>APPLICATION</Text>
        <ListRow
          icon="book"
          iconBg="#8D6E63"
          title="Journal"
          subtitle="Note du jour et historique"
          onPress={() => router.push("/journal-history" as any)}
          testID="row-journal"
        />
        <ListRow
          icon="alarm"
          iconBg="#5C6BC0"
          title="Rappels"
          subtitle="Séances, hydratation, mesures…"
          onPress={() => router.push("/reminders-list" as any)}
          testID="row-reminders"
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
  cockpitSpacing: { marginBottom: spacing.md },
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
