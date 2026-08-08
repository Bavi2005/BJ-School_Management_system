export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500,
  backoffFactor = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(backoffFactor, attempt)));
      }
    }
  }

  throw lastError;
}