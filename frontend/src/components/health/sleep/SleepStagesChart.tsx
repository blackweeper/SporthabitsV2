import { useState } from "react";
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import { spacing, coloredShadow, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import GlassCard from "@/src/components/ui/GlassCard";
import { parseHealthTimestamp } from "@/src/utils/health-data-storage";

export type SleepStageKey = "deep" | "light" | "rem" | "awake";

/** Un vrai épisode horodaté (stade + fenêtre réelle) — Health Auto Export
 * n'envoie AUJOURD'HUI que des totaux agrégés par nuit (`sleepStart`/
 * `sleepEnd`/`deep`/`core`/`rem`/`awake` en heures, sans séquence), donc ce
 * tableau est toujours vide en pratique. Le type existe pour que ce
 * composant puisse afficher une vraie timeline positionnée dès qu'une future
 * source fournirait cette granularité — sans réécriture, voir §6/§19 du
 * brief Sommeil ("prévoir l'architecture, ne jamais inventer"). */
export type SleepStageEpisode = { stage: SleepStageKey; startISO: string; endISO: string };

const STAGE_LABEL: Record<SleepStageKey, string> = { deep: "Sommeil profond", light: "Sommeil léger", rem: "Sommeil REM", awake: "Éveillé" };

function formatClock(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function hourTicks(start: Date, end: Date): Date[] {
  const totalHours = (end.getTime() - start.getTime()) / 3600000;
  const interval = totalHours <= 6 ? 1 : totalHours <= 10 ? 2 : 3;
  const ticks: Date[] = [];
  const first = new Date(start);
  first.setMinutes(0, 0, 0);
  if (first.getTime() < start.getTime()) first.setHours(first.getHours() + 1);
  for (let t = new Date(first); t.getTime() <= end.getTime(); t.setHours(t.getHours() + interval)) {
    ticks.push(new Date(t));
  }
  return ticks;
}

/**
 * "PHASES DE SOMMEIL" — vraie timeline horizontale quand des épisodes
 * horodatés existent (`episodes`), sinon repli honnête : une simple fenêtre
 * "période de sommeil" (coucher→réveil, sans subdivision par stade, jamais
 * une séquence inventée) avec un axe horaire réel. Interaction tactile
 * (tap sur un segment → badge contextuel) seulement en mode épisodes, la
 * seule où une phase précise à un instant précis a un sens.
 */
export default function SleepStagesChart({
  nightStart,
  nightEnd,
  episodes,
}: {
  nightStart: string | null;
  nightEnd: string | null;
  episodes?: SleepStageEpisode[];
}) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const start = nightStart ? parseHealthTimestamp(nightStart) : null;
  const end = nightEnd ? parseHealthTimestamp(nightEnd) : null;
  if (!start || !end || end.getTime() <= start.getTime()) return null;

  const span = end.getTime() - start.getTime();
  const ticks = hourTicks(start, end);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const hasEpisodes = !!episodes && episodes.length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>PHASES DE SOMMEIL</Text>
      <GlassCard level="card" style={styles.card}>
        <View style={styles.track} onLayout={onLayout}>
          {width > 0 &&
            (hasEpisodes ? (
              episodes!.map((ep, i) => {
                const epStart = parseHealthTimestamp(ep.startISO);
                const epEnd = parseHealthTimestamp(ep.endISO);
                if (!epStart || !epEnd) return null;
                const left = Math.max(0, ((epStart.getTime() - start.getTime()) / span) * width);
                const w = Math.max(3, ((epEnd.getTime() - epStart.getTime()) / span) * width);
                const color = theme.colors.sleepStages[ep.stage];
                return (
                  <Pressable
                    key={i}
                    testID={`sleep-stage-episode-${i}`}
                    style={[styles.segment, { left, width: w, backgroundColor: color }]}
                    onPress={() => setSelected(selected === i ? null : i)}
                  />
                );
              })
            ) : (
              <View
                style={[
                  styles.windowBar,
                  { backgroundColor: withAlpha(solidSleepColor(theme), 55), borderColor: solidSleepColor(theme) },
                ]}
              />
            ))}
          {hasEpisodes && selected != null && episodes![selected] && width > 0 && (
            <SegmentTooltip episode={episodes![selected]} start={start} span={span} width={width} theme={theme} />
          )}
        </View>
        <View style={styles.axisRow}>
          {ticks.map((t, i) => (
            <Text
              key={i}
              style={[
                styles.axisLabel,
                { color: theme.colors.onSurfaceTertiary, left: width > 0 ? ((t.getTime() - start.getTime()) / span) * width - 16 : undefined },
              ]}
            >
              {t.getHours().toString().padStart(2, "0")}
            </Text>
          ))}
        </View>
        {!hasEpisodes && (
          <Text style={[styles.fallbackHint, { color: theme.colors.onSurfaceTertiary }]}>
            Détail minute par minute non disponible avec les données actuellement importées — voir la répartition ci-dessous.
          </Text>
        )}
      </GlassCard>
    </View>
  );
}

function solidSleepColor(theme: Theme): string {
  const c = theme.colors.metricColors.sleep;
  return Array.isArray(c) ? c[1] : c;
}

function SegmentTooltip({
  episode,
  start,
  span,
  width,
  theme,
}: {
  episode: SleepStageEpisode;
  start: Date;
  span: number;
  width: number;
  theme: Theme;
}) {
  const epStart = parseHealthTimestamp(episode.startISO)!;
  const epEnd = parseHealthTimestamp(episode.endISO)!;
  const durationMin = Math.round((epEnd.getTime() - epStart.getTime()) / 60000);
  const centerX = ((epStart.getTime() - start.getTime()) / span) * width;
  const color = theme.colors.sleepStages[episode.stage];
  const left = Math.max(0, Math.min(width - 110, centerX - 55));

  return (
    <View
      style={[
        styles.tooltip,
        { left, borderColor: withAlpha(color, 55), backgroundColor: theme.colors.surfaceSecondary },
        coloredShadow(color, { offsetY: 2, opacity: 0.28, radius: 8, elevation: 4 }),
      ]}
    >
      <Text style={[styles.tooltipTime, { color: theme.colors.onSurfaceTertiary }]}>{formatClock(epStart)}</Text>
      <Text style={[styles.tooltipStage, { color }]}>{STAGE_LABEL[episode.stage]}</Text>
      <Text style={[styles.tooltipDuration, { color: theme.colors.onSurface }]}>{durationMin} min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  // `paddingTop` généreux — le tooltip du segment sélectionné se positionne
  // au-dessus du tracé mais DOIT rester dans les bornes de cette carte
  // (`GlassCard` a `overflow:"hidden"` pour masquer proprement flou/reflet) :
  // un `top` négatif qui s'échappe de ce padding serait rogné plutôt
  // qu'affiché, confirmé en direct (le tooltip apparaissait tronqué).
  card: { paddingTop: 46, paddingBottom: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  track: { height: 34, position: "relative", justifyContent: "center" },
  segment: { position: "absolute", top: 6, height: 22, borderRadius: 5 },
  windowBar: { height: 16, borderRadius: 8, borderWidth: 1, width: "100%" },
  axisRow: { height: 14, position: "relative" },
  axisLabel: { position: "absolute", fontSize: 9.5, fontWeight: "700", width: 32, textAlign: "center" },
  fallbackHint: { fontSize: 10.5, fontStyle: "italic", lineHeight: 14 },
  tooltip: {
    position: "absolute",
    top: -38,
    width: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 1,
  },
  tooltipTime: { fontSize: 9, fontWeight: "800" },
  tooltipStage: { fontSize: 10, fontWeight: "800" },
  tooltipDuration: { fontSize: 11, fontWeight: "800" },
});
