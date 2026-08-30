import { Theme } from '@/src/themes/types';
import { RankColorKey } from '@/src/utils/xp';

/**
 * Résout la clé de couleur d'un rang (`RankColorKey`, voir `xp.ts`) vers un
 * token de thème réel — jamais une valeur hexadécimale en dur, garanti
 * cohérent entre Classique et Sunset puisque les deux thèmes exposent
 * exactement les mêmes clés (`theme.colors.data.*`). Centralisé ici pour que
 * `CockpitCard` (Profil) et l'écran Niveau utilisent toujours la même
 * couleur pour un même rang.
 */
export function rankAccentColor(theme: Theme, key: RankColorKey): string {
  switch (key) {
    case 'neutral':
      return theme.colors.rankNeutral;
    case 'cardio':
      return theme.colors.data.cardio;
    case 'strength':
      return theme.colors.data.strength;
    case 'energy':
      return theme.colors.data.energy;
    case 'performance':
      return theme.colors.data.performance;
    case 'achievement':
      return theme.colors.data.achievement;
    case 'success':
      return theme.colors.data.success;
    case 'progress':
      return theme.colors.progress;
    case 'brand':
      return theme.colors.brand;
  }
}
