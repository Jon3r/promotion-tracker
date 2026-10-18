type Entry<T> = { value: T; expiresAt: number } | { pending: Promise<T> };

const entries = new Map<string, Entry<unknown>>();

export function envTtlMs(name: string, fallbackMs: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallbackMs;
}

/**
 * Per-instance TTL cache. Concurrent callers share one in-flight load; failed
 * loads are not cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  now: () => number = Date.now
): Promise<T> {
  const entry = entries.get(key) as Entry<T> | undefined;
  if (entry) {
    if ("pending" in entry) return entry.pending;
    if (entry.expiresAt > now()) return entry.value;
  }

  const pending = load();
  entries.set(key, { pending });
  try {
    const value = await pending;
    entries.set(key, { value, expiresAt: now() + ttlMs });
    return value;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}

export function invalidateCache(prefix: string): void {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
