export type UserLevel = 'bronze' | 'silver' | 'gold';

/**
 * Calculate user level based on completed order count and thresholds
 */
export const calculateUserLevel = (
  completedOrderCount: number,
  thresholdSilver: number,
  thresholdGold: number
): UserLevel => {
  if (completedOrderCount >= thresholdGold) {
    return 'gold';
  }
  if (completedOrderCount >= thresholdSilver) {
    return 'silver';
  }
  return 'bronze';
};

/**
 * Get progress towards next level
 */
export const getLevelProgress = (
  completedOrderCount: number,
  thresholdSilver: number,
  thresholdGold: number
): { 
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  ordersToNextLevel: number;
  progressPercent: number;
} => {
  const currentLevel = calculateUserLevel(completedOrderCount, thresholdSilver, thresholdGold);
  
  if (currentLevel === 'gold') {
    return {
      currentLevel,
      nextLevel: null,
      ordersToNextLevel: 0,
      progressPercent: 100,
    };
  }
  
  if (currentLevel === 'silver') {
    const ordersToNextLevel = thresholdGold - completedOrderCount;
    const progressPercent = ((completedOrderCount - thresholdSilver) / (thresholdGold - thresholdSilver)) * 100;
    return {
      currentLevel,
      nextLevel: 'gold',
      ordersToNextLevel,
      progressPercent: Math.min(progressPercent, 100),
    };
  }
  
  // Bronze level
  const ordersToNextLevel = thresholdSilver - completedOrderCount;
  const progressPercent = (completedOrderCount / thresholdSilver) * 100;
  return {
    currentLevel,
    nextLevel: 'silver',
    ordersToNextLevel,
    progressPercent: Math.min(progressPercent, 100),
  };
};
