export async function withMinimumDelay<T>(
  promise: Promise<T>,
  minDelayMs: number = 300,
): Promise<T> {
  const delay = new Promise<void>((resolve) => setTimeout(resolve, minDelayMs));
  const [result] = await Promise.all([promise, delay]);
  return result;
}
