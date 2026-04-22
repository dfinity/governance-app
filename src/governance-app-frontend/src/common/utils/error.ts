export const errorMessage = (source: string, message: string): Error => {
  return new Error(`❌ ERROR (${source}): ${message}.`);
};

export const firstComponentFromStack = (componentStack: string): string =>
  /\s+at\s+(\w+)/.exec(componentStack)?.[1] ?? 'Unknown';
