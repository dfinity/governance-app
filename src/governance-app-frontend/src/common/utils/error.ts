export const errorMessage = (source: string, message: string): Error => {
  return new Error(`❌ ERROR (${source}): ${message}.`);
};
