import { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";
import { SelectedDot, PointerLabel } from "@/src/components/health/InteractiveHealthChart";

function shortDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).slice(0, 1).toUpperCase();
}

// Barres nettement plus grandes qu'avant (retour utilisateur : "trop
// petites") + espacement recalculé en conséquence, avec une marge de
// sécurité généreuse — jamais de `width`/`yAxisLabelWidth` forcés sur le
// `BarChart` (essayé puis abandonné) : la colonne d'étiquettes Y de la
// librairie s'auto-dimensionne selon le nombre de chiffres affichés
// (largeur non exposée de façon fiable), donc contraindre `width` à une
// valeur calculée à la main pouvait pousser la dernière barre hors de la
// zone réellement dessinée — bug confirmé (barre du jour manquante malgré
// une vraie valeur). Laisser la librairie se dimensionner elle-même avec un
// espacement volontairement un peu généreux est plus sûr qu'un calage exact.
const BAR_WIDTH = 28;
const INITIAL_SPACING = 10;

function Bar({ pct, color }: { pct: number; color: string }) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);
  useEffect(() => {
    const cfg = theme.ringFill;
    fill.value =
      cfg.type === "spring"
        ? withSpring(pct, { damping: cfg.damping, stiffness: cfg.stiffness })
        : withTiming(pct, { duration: cfg.duration, easing: Easing.out(Easing.cubic) });
  }, [pct, theme.ringFill, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Animated.View style={[styles.fill, style, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * Fiche premium pour les métriques "objectif quotidien" (Pas/Distance/
 * Calories actives) — reprend la structure de la référence fournie (icône+
 * libellé, %, grande valeur, barre fine, "Objectif", MOYENNE, historique en
 * barres) avec l'identité IronFlow (`color` = accent de la métrique, jamais
 * l'orange de la référence). Toutes les valeurs viennent de
 * `computeMetricKpis`/`loadHealthMetricSeries` (aucune seconde source) ;
 * masquée section par section quand une donnée est absente.
 *
 * Historique en barres — habillage inspiré d'une référence vidéo fournie
 * (barres arrondies façon pilule, glissé tactile avec point rond agrandi +
 * badge daté, jamais de ligne verticale/croix — retirées sur retour
 * utilisateur, trop chargées) : même point/badge que `InteractiveHealthChart`
 * (`SelectedDot`/`PointerLabel`, réutilisés tels quels), jamais une deuxième
 * implémentation de tooltip. Couleur toujours celle propre à la métrique
 * appelante, jamais une teinte neutre. La pastille de jour glissant sous
 * l'axe (vue dans la référence) n'a pas pu être reproduite de façon fiable —
 * sa position dépend d'une largeur de colonne d'axe interne à la librairie
 * non exposée de façon stable d'un environnement de rendu à l'autre ; même
 * limite déjà rencontrée et documentée sur le graphique à courbe.
 */
export default function MetricGoalCard({
  icon,
  label,
  color,
  todayValue,
  target,
  unit,
  formatValue,
  formatMainValue,
  average,
  best,
  history,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  todayValue: number | null;
  target: number;
  unit: string;
  formatValue: (v: number) => string;
  /** Nombre seul (sans unité) pour la grande valeur héro — voir
   * `MetricDetailScreen.tsx`. */
  formatMainValue: (v: number) => string;
  average: number | null;
  best: number | null;
  history: DailyMetricPoint[];
}) {
  const { theme } = useTheme();
  const hasToday = todayValue != null;
  const pct = hasToday ? Math.max(0, Math.min(1, todayValue! / target)) : 0;
  const pctLabel = hasToday ? `${Math.round(pct * 100)}%` : "—";
  const chartW = Dimensions.get("window").width - spacing.lg * 2 - spacing.lg * 2;

  // Bug trouvé en vérifiant cette carte en direct : `history` arrive du
  // parent déjà à longueur 7 dès le premier rendu, mais avec des valeurs
  // TOUTES à 0 tant que l'import Santé async (steps/sommeil) n'a pas résolu
  // — le `BarChart` (animé, `isAnimated`) montait donc une première fois sur
  // des données vides, jouait son animation de croissance vers 0 (donc
  // rien), puis ne la rejouait jamais quand les vraies valeurs arrivaient
  // ensuite (confirmé en inspectant le DOM : le calque de remplissage
  // interne restait figé à une hauteur de 0.1px malgré un conteneur
  // correctement dimensionné). La clé ci-dessous force UN SEUL remontage au
  // moment précis où une vraie donnée non nulle apparaît pour la première
  // fois — l'animation de croissance rejoue alors correctement vers les
  // vraies valeurs. Sans effet sur une semaine réellement à 0 partout
  // (aucun remontage, jamais de bug à corriger dans ce cas).
  const hasRealData = history.some((h) => h.value > 0);
  // `overflowTop` (essayé d'abord) s'est révélé être un simple booléen en
  // interne dans cette version de la librairie pour `BarChart` (toute valeur
  // non nulle retombe sur la même constante fixe, jamais la valeur passée —
  // confirmé en mesurant la position réelle du badge dans le DOM, identique
  // à 70 et à 110) — inutilisable pour réserver une vraie marge. La barre la
  // plus haute touchait donc le plafond du graphique, ne laissant aucune
  // place pour le badge daté au-dessus d'elle. Fixé à la place par une
  // marge de 25% au-dessus du maximum réel (`maxValue`, un prop qui, lui,
  // fonctionne réellement) — pratique de représentation graphique courante
  // (la barre la plus haute ne doit jamais toucher le plafond), pas une
  // donnée modifiée : les valeurs et proportions relatives entre barres
  // restent exactement les mêmes, seule l'échelle gagne de l'air en haut.
  const dataMax = Math.max(...history.map((h) => h.value), 1);
  const maxValue = dataMax * 1.25;
  const barCount = Math.max(1, history.length);
  // Marge de sécurité (-12) volontaire : la colonne d'étiquettes Y auto-
  // dimensionnée par la librairie mange une partie de `chartW` non connue à
  // l'avance — mieux vaut des barres légèrement plus resserrées que risquer
  // de pousser la dernière hors de la zone visible (voir le commentaire plus haut).
  const barSpacing = Math.max(8, (chartW - INITIAL_SPACING) / barCount - BAR_WIDTH - 12);
  // `autoAdjustPointerLabelPosition` place TOUJOURS le badge au-dessus du
  // point pour ce `BarChart` (jamais en dessous, quelle que soit la barre
  // sélectionnée — vérifié en mesurant le DOM : le badge rend exactement à
  // la même position, qu'on sélectionne la barre la plus haute ou une
  // barre quasi vide), et cette position est systématiquement ~40-45px
  // au-dessus du haut réel de la zone de dessin du graphique. `maxValue`
  // (au-dessus) évite que la barre touche le plafond, mais ne change rien
  // à CE décalage-là. Compensé ici par un simple `marginTop` sur le
  // contenu du badge (dans `pointerLabelComponent` ci-dessous) plutôt que
  // par une nouvelle tentative sur un prop de la librairie.
  const POINTER_LABEL_SHIFT = 52;

  return (
    <GlassCard level="elevated" accent={color} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={[styles.headerLabel, { color }]}>{label.toUpperCase()}</Text>
        </View>
        <Text style={[styles.headerPct, { color }]}>{pctLabel}</Text>
      </View>

      <View style={styles.valueRow}>
        <AnimatedNumber
          value={hasToday ? todayValue! : 0}
          formatter={(v) => (hasToday ? formatMainValue(v) : "—")}
          style={[styles.value, { color: theme.colors.onSurface }]}
        />
        <Text style={[styles.unit, { color: theme.colors.onSurfaceTertiary }]}>{unit}</Text>
      </View>

      <Bar pct={pct} color={color} />
      <Text style={[styles.goalCaption, { color: theme.colors.onSurfaceTertiary }]}>Objectif · {formatValue(target)}</Text>

      {average != null && (
        <View style={styles.averageBlock}>
          <Text style={[styles.averageLabel, { color: theme.colors.onSurfaceTertiary }]}>MOYENNE</Text>
          <Text style={[styles.averageValue, { color: theme.colors.onSurface }]}>{formatValue(average)}</Text>
          {best != null && (
            <Text style={[styles.bestCaption, { color: theme.colors.onSurfaceSecondary }]}>
              Meilleur jour · {formatValue(best)}
            </Text>
          )}
        </View>
      )}

      {history.length >= 2 && (
        <View style={styles.chartWrap}>
          <BarChart
            key={hasRealData ? "data" : "empty"}
            data={history.map((h) => ({ value: h.value, label: shortDay(h.date), date: h.date, frontColor: color }))}
            height={110}
            barWidth={BAR_WIDTH}
            spacing={barSpacing}
            initialSpacing={INITIAL_SPACING}
            barBorderRadius={BAR_WIDTH / 2}
            rulesType="dashed"
            rulesColor={withAlpha(theme.colors.onSurface, 8)}
            rulesThickness={1}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
            noOfSections={5}
            maxValue={maxValue}
            isAnimated
            pointerConfig={{
              showPointerStrip: false,
              pointerColor: color,
              radius: 5,
              activatePointersInstantlyOnTouch: true,
              persistPointer: true,
              autoAdjustPointerLabelPosition: true,
              pointerLabelWidth: 140,
              pointerLabelHeight: 60,
              pointerComponent: () => <SelectedDot color={color} />,
              pointerLabelComponent: (items: { value: number; label: string; date: string }[]) => (
                <View style={{ marginTop: POINTER_LABEL_SHIFT }}>
                  <PointerLabel items={items} color={color} formatValue={formatValue} />
                </View>
              ),
            }}
          />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  headerPct: { fontSize: 13, fontWeight: "800" },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.xs },
  value: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  unit: { fontSize: 14, fontWeight: "700", marginBottom: 8, textTransform: "lowercase" },
  track: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", borderRadius: 3 },
  goalCaption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  averageBlock: { marginTop: spacing.md, gap: 2 },
  averageLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1 },
  averageValue: { fontSize: 22, fontWeight: "800" },
  bestCaption: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  chartWrap: { marginTop: spacing.md },
});
