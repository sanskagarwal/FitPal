// Progress from the start weight toward the target weight, clamped to 0-100%.
// Returns null when it can't be computed (missing weights or no target).
export const calculateGoalProgress = (
  startWeight: number | undefined,
  latestWeight: number | undefined,
  targetWeight: number
): number | null => {
  if (latestWeight === undefined || startWeight === undefined || targetWeight <= 0) {
    return null;
  }
  const totalDistance = Math.abs(startWeight - targetWeight);
  if (totalDistance === 0) return 100;
  const remaining = Math.abs(latestWeight - targetWeight);
  return Math.max(0, Math.min(100, ((totalDistance - remaining) / totalDistance) * 100));
};
