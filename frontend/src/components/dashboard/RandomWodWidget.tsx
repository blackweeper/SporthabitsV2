import { useEffect, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/themes";
import ProgramActionCard from "@/src/components/dashboard/ProgramActionCard";
import { getPlans, Plan } from "@/src/utils/gym-storage";
import { pickRandomWod } from "@/src/utils/wod-random";

/**
 * Pioche un WOD au hasard parmi les séances déjà sauvegardées (`p.wodSource`
 * truthy) et le lance directement — même sélection que "WOD aléatoire" dans
 * l'onglet Entraînements (`pickRandomWod`, partagé). Autonome (charge sa
 * propre liste au montage), rendu `null` si l'utilisateur n'a aucun WOD.
 * Reprend le format `ProgramActionCard` (carte icône/titre/sous-texte) pour
 * cohabiter dans la même grille que les widgets programme — commun aux deux
 * thèmes, `style` permet à l'appelant de contrôler la largeur de tuile.
 */
export default function RandomWodWidget({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [wodPlans, setWodPlans] = useState<Plan[]>([]);

  useEffect(() => {
    getPlans().then((plans) => setWodPlans(plans.filter((p) => p.wodSource)));
  }, []);

  if (wodPlans.length === 0) return null;

  const onLaunch = () => {
    const chosen = pickRandomWod(wodPlans);
    if (chosen) router.push(`/workout/${chosen.id}` as any);
  };

  return (
    <ProgramActionCard
      testID="random-wod-widget"
      icon="shuffle"
      iconColor={theme.colors.data.workout}
      title="WOD aléatoire"
      subtitle={`${wodPlans.length} séance${wodPlans.length > 1 ? "s" : ""}`}
      onPress={onLaunch}
      style={style}
    />
  );
}
