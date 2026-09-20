import { redis } from "./redis";

// Idempotency key storage for preventing duplicate operations
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

interface IdempotencyResult {
  exists: boolean;
  data?: any;
}

export async function checkIdempotency(key: string): Promise<IdempotencyResult> {
  const redisKey = `idempotency:${key}`;
  const existing = await redis.get(redisKey);
  
  if (existing) {
    return {
      exists: true,
      data: JSON.parse(existing),
    };
  }
  
  return { exists: false };
}

export async function storeIdempotencyResult(key: string, result: any): Promise<void> {
  const redisKey = `idempotency:${key}`;
  await redis.setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(result));
}

export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  const check = await checkIdempotency(key);
  
  if (check.exists) {
    return check.data as T;
  }
  
  const result = await operation();
  await storeIdempotencyResult(key, result);
  
  return result;
}

// Generate idempotency key from request parameters
export function generateIdempotencyKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join("|");
  return `${prefix}:${sortedParams}`;
}
