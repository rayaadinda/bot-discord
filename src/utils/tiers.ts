import { config } from '../config';
import { TierInfo } from '../types/discord';

export function calculateTier(points: number): 'rookie_rider' | 'pro_racer' | 'hpz_legend' {
  if (points >= config.tiers.hpz_legend.minPoints) {
    return 'hpz_legend';
  } else if (points >= config.tiers.pro_racer.minPoints) {
    return 'pro_racer';
  } else {
    return 'rookie_rider';
  }
}

export function getTierInfo(points: number): TierInfo {
  const tier = calculateTier(points);
  const tierConfig = config.tiers[tier as keyof typeof config.tiers];

  if (!tierConfig) {
    throw new Error(`Tier configuration not found for tier: ${tier}`);
  }

  const maxPoints = 'maxPoints' in tierConfig ? tierConfig.maxPoints : Infinity;
  const result: TierInfo = {
    name: tierConfig.name,
    currentPoints: points,
    maxPoints,
    benefits: tierConfig.benefits,
    progress: 0,
  };

  // Calculate progress within current tier
  if (tier === 'rookie_rider') {
    result.progress = Math.min((points / (maxPoints || 1)) * 100, 100);
  } else if (tier === 'pro_racer') {
    const tierPoints = points - config.tiers.pro_racer.minPoints + 1;
    const tierMaxPoints = (maxPoints || 1500) - config.tiers.pro_racer.minPoints + 1;
    result.progress = Math.min((tierPoints / tierMaxPoints) * 100, 100);
  } else {
    result.progress = 100; // HPZ Legend is max tier
  }

  // Add next tier info if not at max
  if (tier !== 'hpz_legend') {
    if (tier === 'rookie_rider') {
      result.nextTier = {
        name: config.tiers.pro_racer.name,
        pointsNeeded: Math.max(0, config.tiers.pro_racer.minPoints - points),
        benefits: config.tiers.pro_racer.benefits,
      };
    } else if (tier === 'pro_racer') {
      result.nextTier = {
        name: config.tiers.hpz_legend.name,
        pointsNeeded: Math.max(0, config.tiers.hpz_legend.minPoints - points),
        benefits: config.tiers.hpz_legend.benefits,
      };
    }
  }

  return result;
}

export function getTierEmoji(tier: string): string {
  switch (tier) {
    case 'rookie_rider':
      return '🏁';
    case 'pro_racer':
      return '🏍️';
    case 'hpz_legend':
      return '🏆';
    default:
      return '❓';
  }
}

export function formatTierName(tier: string): string {
  switch (tier) {
    case 'rookie_rider':
      return 'Rookie Rider';
    case 'pro_racer':
      return 'Pro Racer';
    case 'hpz_legend':
      return 'HPZ Legend';
    default:
      return 'Unknown';
  }
}