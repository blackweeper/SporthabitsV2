import {
  Goal,
  GOAL_CATEGORY_LABEL,
  PersonalRecord,
} from '@/src/utils/gym-storage';

export type Highlight = {
  key: string;
  emoji: string;
  title: string;
  subtitle?: string;
};

const SEVEN_DAYS_MS = 7 * 86400000;
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

/**
 * Turns raw data already loaded elsewhere (records, streak, score trend,
 * goals) into a short list of "story" moments — the app should say what
 * changed, not just display numbers. Deliberately returns nothing rather
 * than a placeholder when there's nothing to celebrate yet.
 */
export function computeHighlights({
  prs,
  goals,
  streakDays,
  scoreTrendPts,
}: {
  prs: PersonalRecord[];
  goals: Goal[];
  streakDays: number;
  /** Point difference of the daily score vs. 7 days ago (same convention as
   * the day-over-day delta already shown elsewhere) — null when there isn't
   * enough history yet to compare. */
  scoreTrendPts: number | null;
}): Highlight[] {
  const highlights: Highlight[] = [];
  const cutoff = Date.now() - SEVEN_DAYS_MS;

  const recentPRs = prs
    .filter((p) => new Date(p.date).getTime() >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (recentPRs.length > 0) {
    highlights.push({
      key: 'record',
      emoji: '🏆',
      title: 'Nouveau record',
      subtitle: recentPRs[0].exerciseName,
    });
  }

  if (STREAK_MILESTONES.includes(streakDays)) {
    highlights.push({
      key: 'streak',
      emoji: '🔥',
      title: `Série de ${streakDays} jour${streakDays > 1 ? 's' : ''}`,
    });
  }

  if (scoreTrendPts != null && Math.abs(scoreTrendPts) >= 5) {
    highlights.push({
      key: 'trend',
      emoji: scoreTrendPts > 0 ? '📈' : '📉',
      title: `${scoreTrendPts > 0 ? '+' : ''}${Math.round(scoreTrendPts)}% cette semaine`,
    });
  }

  for (const g of goals) {
    if (!g.achievedAt) continue;
    if (new Date(g.achievedAt).getTime() < cutoff) continue;
    highlights.push({
      key: `goal-${g.id}`,
      emoji: '🎯',
      title: 'Objectif atteint',
      subtitle: g.title || GOAL_CATEGORY_LABEL[g.category],
    });
  }

  return highlights;
}
