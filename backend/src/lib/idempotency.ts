import { redis } from "./redis";

// Replays the result of an operation retried with the same key, so a client
// that lost a response can safely send the request again (ID-1).
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours
// How long a key stays claimed while its first attempt is still running.
const IN_FLIGHT_TTL = 60;
const IN_FLIGHT = "__in_flight__";
const CLIENT_KEY = /^[A-Za-z0-9_:-]{8,128}$/;

/**
 * Reads a client's Idempotency-Key header: null when absent, "invalid" when
 * it isn't a short opaque token.
 */
export function idempotencyKeyFrom(header: string | undefined): string | null | "invalid" {
  if (header === undefined || header === "") return null;
  return CLIENT_KEY.test(header) ? header : "invalid";
}

/**
 * Runs `operation` once per key. The key is claimed atomically before it
 * runs, so a concurrent retry gets a 409 instead of running it twice. Only a
 * successful result (one without `error`) is kept and replayed; a failure
 * frees the key, so the client can retry after fixing the cause. A null key
 * runs the operation without any of this.
 */
export async function withIdempotency<T>(key: string | null, operation: () => Promise<T>): Promise<T> {
  if (!key) return operation();
  const redisKey = `idempotency:${key}`;

  const claimed = await redis.set(redisKey, IN_FLIGHT, "EX", IN_FLIGHT_TTL, "NX");
  if (!claimed) {
    const existing = await redis.get(redisKey);
    if (existing && existing !== IN_FLIGHT) return JSON.parse(existing) as T;
    return { error: "This request is already being processed. Please wait a moment.", status: 409 } as T;
  }

  try {
    const result = await operation();
    if (result && typeof result === "object" && "error" in result) {
      await redis.del(redisKey);
    } else {
      await redis.set(redisKey, JSON.stringify(result), "EX", IDEMPOTENCY_TTL);
    }
    return result;
  } catch (error) {
    await redis.del(redisKey).catch(() => {});
    throw error;
  }
}

// Generate idempotency key from request parameters
export function generateIdempotencyKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join("|");
  return `${prefix}:${sortedParams}`;
}
