import { useEffect, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/themes";
import { getPlans, Plan } from "@/src/utils/gym-storage";
import { pickRandomWod } from "@/src/utils/wod-random";
import TrainingActionCard from "@/src/components/dashboard/TrainingActionCard";

/**
 * Bouton principal du Dashboard — pioche un WOD au hasard parmi les séances
 * déjà sauvegardées (`p.wodSource` truthy) et le lance directement, même
 * sélection que "WOD aléatoire" dans l'onglet Entraînements (`pickRandomWod`,
 * partagé, aucune deuxième logique de tirage). Remplace l'ancien CTA
 * "Démarrer une séance" — un seul point d'accès au WOD aléatoire (avant :
 * ce widget existait ET dans la grille des programmes, en double). Autonome
 * (charge sa propre liste au montage), rendu `null` si l'utilisateur n'a
 * aucun WOD sauvegardé — jamais un bouton qui ne mène nulle part.
 *
 * Rendu délégué à `TrainingActionCard` (partagé avec les cartes de
 * programme actif) — plus de structure/dimensions propres à ce widget,
 * pour que hauteur/paddings/CTA restent garantis identiques aux autres
 * cartes "lancer un entraînement" du Dashboard.
 */
export default function RandomWodWidget({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [wodPlans, setWodPlans] = useState<Plan[]>([]);

  useEffect(() => {
    getPlans().then((plans) => setWodPlans(plans.filter((p) => p.wodSource)));
  }, []);

  if (wodPlans.length === 0) return null;

  const color = theme.colors.data.workout;

  const onLaunch = () => {
    const chosen = pickRandomWod(wodPlans);
    if (chosen) router.push(`/workout/${chosen.id}` as any);
  };

  return (
    <TrainingActionCard
      testID="random-wod-widget"
      icon="shuffle"
      iconColor={color}
      title="WOD ALÉATOIRE"
      subtitle={`${wodPlans.length} séance${wodPlans.length > 1 ? "s" : ""} disponible${wodPlans.length > 1 ? "s" : ""}`}
      onPress={onLaunch}
      style={style}
    />
  );
}
