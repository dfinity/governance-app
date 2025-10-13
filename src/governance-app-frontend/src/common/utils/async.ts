export async function withMinimumDelay<T>(
  promise: Promise<T>,
  minDelayMs: number = 300,
): Promise<T> {
  const [result] = await Promise.all([promise, delay(minDelayMs)]);
  return result;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const toJson = (response: Response) => response.json();
