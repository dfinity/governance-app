export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const inConfidenceRange = (
  referenceValue: number,
  valueToCheck: number,
  range: number,
): boolean => {
  const min = referenceValue * (1 - range);
  const max = referenceValue * (1 + range);
  return valueToCheck >= min && valueToCheck <= max;
};
