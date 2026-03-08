const LONG_TIMELINE_ANIMATION_THRESHOLD = 180;

export const getAdaptiveAxisLabelInterval = (totalPoints: number, targetLabels: number): number => {
  if (targetLabels <= 1 || totalPoints <= targetLabels) {
    return 0;
  }

  return Math.max(0, Math.ceil(totalPoints / targetLabels) - 1);
};

export const shouldDisableChartAnimation = (totalPoints: number): boolean => (
  totalPoints >= LONG_TIMELINE_ANIMATION_THRESHOLD
);
