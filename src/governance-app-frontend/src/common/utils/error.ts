export const triggerError = (fn: string, message: string): never => {
  throw new Error(`❌ ERROR (${fn}): ${message}.`);
};
