/**
 * APY Color Interpolation Utilities
 *
 * Provides consistent color interpolation for APY displays across the app.
 * Colors transition from orange (min APY) to green (max APY).
 */

/**
 * Interpolate from orange rgb(234, 88, 12) to green rgb(22, 163, 74)
 * @param t - Normalized position 0-1 (0 = min/orange, 1 = max/green)
 * @param opacity - Optional opacity value (default: 1)
 */
export function interpolateApyColor(t: number, opacity: number = 1): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(234 - 212 * clamped);
  const g = Math.round(88 + 75 * clamped);
  const b = Math.round(12 + 62 * clamped);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Calculate the normalized position of an APY value between min and max
 * @param value - Current APY value
 * @param min - Minimum APY value
 * @param max - Maximum APY value
 * @returns Normalized position 0-1
 */
export function getApyNormalizedPosition(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Get all APY-related colors for a given normalized position
 * @param normalizedPosition - Value between 0-1
 */
export function getApyColors(normalizedPosition: number) {
  return {
    textColor: interpolateApyColor(normalizedPosition),
    bgColor: interpolateApyColor(normalizedPosition, 0.1),
    borderColor: interpolateApyColor(normalizedPosition, 0.3),
  };
}

/**
 * Check if the APY value is at or above the current network maximum
 */
export function isMaxApy(value: number, maxApy: number): boolean {
  return Number(value.toFixed(2)) >= Number(maxApy.toFixed(2));
}
