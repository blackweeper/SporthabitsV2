import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/src/theme';
import { WorkoutSession, CardioActivity } from '@/src/utils/gym-storage';

type Props = {
  sessions: WorkoutSession[];
  monthOffset?: number;
  onChangeMonth?: (offset: number) => void;
};

/**
 * Colored calendar view (30 days):
 *  🟢 Séance réalisée (musculation/mixte)
 *  🔴 Manquée (jour attendu sans session)  → we consider "missed" only if user has active program
 *  🔵 Running (cardio_activity === course, or planType cardio + course)
 *  🟣 Mobilité / Étirement
 *  🟡 Repos actif (planType hiit or absent)
 * We simplify: color from session data if present, otherwise gray.
 */
export default function CalendarView({
  sessions,
  monthOffset = 0,
  onChangeMonth,
}: Props) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();

  const monthName = target.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // start weekday (0=Sun in JS, we want Monday-first)
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon

  // group sessions by date string YYYY-MM-DD
  const byDate: Record<string, WorkoutSession[]> = {};
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const k = d.toISOString().slice(0, 10);
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(s);
  }

  const cellsByWeek: (
    | { type: 'empty' }
    | { type: 'day'; day: number; dateStr: string; sessions: WorkoutSession[] }
  )[][] = [];
  const allCells: (
    | { type: 'empty' }
    | { type: 'day'; day: number; dateStr: string; sessions: WorkoutSession[] }
  )[] = [];
  for (let i = 0; i < startWeekday; i++) allCells.push({ type: 'empty' });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().slice(0, 10);
    allCells.push({
      type: 'day',
      day: d,
      dateStr,
      sessions: byDate[dateStr] ?? [],
    });
  }
  // pad end to multiple of 7
  while (allCells.length % 7 !== 0) allCells.push({ type: 'empty' });
  for (let i = 0; i < allCells.length; i += 7) {
    cellsByWeek.push(allCells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Pressable
          testID="cal-prev"
          onPress={() => onChangeMonth?.(monthOffset - 1)}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={18} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthName}</Text>
        <Pressable
          testID="cal-next"
          onPress={() => onChangeMonth?.(monthOffset + 1)}
          hitSlop={12}
          disabled={monthOffset >= 0}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={monthOffset >= 0 ? colors.surfaceTertiary : colors.onSurface}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((w, i) => (
          <Text key={i} style={styles.weekDay}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cellsByWeek.map((week, wi) => (
          <View key={wi} style={styles.weekLine}>
            {week.map((c, ci) => {
              if (c.type === 'empty')
                return <View key={ci} style={styles.cell} />;
              const color = pickColor(c.sessions);
              const label = pickLabel(c.sessions);
              const isToday =
                c.dateStr === new Date().toISOString().slice(0, 10);
              return (
                <View
                  key={ci}
                  style={[
                    styles.cell,
                    { backgroundColor: color },
                    isToday && styles.cellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      color === 'transparent' && { color: colors.onSurfaceTertiary },
                    ]}
                  >
                    {c.day}
                  </Text>
                  {label ? <Text style={styles.dayLabel}>{label}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <LegendItem color="#00E676" label="Séance" />
        <LegendItem color="#2196F3" label="Course" />
        <LegendItem color="#AB47BC" label="Étirement" />
        <LegendItem color="#FFC107" label="Repos" />
      </View>
    </View>
  );
}

function pickColor(sessions: WorkoutSession[]): string {
  if (!sessions.length) return 'transparent';
  // Priority: running > stretch > workout
  const kinds = sessions.map(sessionKind);
  if (kinds.includes('running')) return '#2196F3';
  if (kinds.includes('stretch')) return '#AB47BC';
  if (kinds.includes('rest')) return '#FFC107';
  return '#00E676'; // workout done
}

function pickLabel(sessions: WorkoutSession[]): string | null {
  if (!sessions.length) return null;
  const kinds = new Set(sessions.map(sessionKind));
  if (kinds.has('running')) return '🏃';
  if (kinds.has('stretch')) return '🧘';
  if (kinds.has('rest')) return '💤';
  return '✓';
}

function sessionKind(s: WorkoutSession): 'running' | 'stretch' | 'rest' | 'workout' {
  if (s.cardio_activity === 'course') return 'running';
  if (s.planType === 'stretch') return 'stretch';
  if (s.planType === 'cardio') return 'running';
  return 'workout';
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  monthLabel: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    gap: 4,
  },
  weekLine: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellToday: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  dayNum: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  dayLabel: { fontSize: 10 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: '600' },
});
