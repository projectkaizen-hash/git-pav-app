import type { Request } from "express";
import rateLimit, { type Store, type Options, type IncrementResponse } from "express-rate-limit";
import type Redis from "ioredis";
import type { AuthRequest } from "./auth";

// Budgets per 15-minute window (SV-1).
//
// Signed-in traffic is keyed by user, so one clinic's shared Wi-Fi (or a load
// balancer, if trust proxy is misconfigured) doesn't put everyone in one
// bucket. The budget is sized from the app's own polling: an operator on shift
// polls incoming requests every 5 s and shift and route every 10 s, about 360
// requests per 15 minutes before location pings and taps; a patient on live
// tracking is about 270. 1200 leaves room for both with headroom.
//
// Anonymous traffic is keyed by IP. Auth endpoints stay per IP whoever is
// signed in, because they are what an attacker brute-forces.
export const RATE_LIMITS = {
  windowMs: 15 * 60 * 1000,
  production: { user: 1200, anonymous: 300, auth: 20 },
  // Development and test run suites and simulators from one machine.
  local: { user: 5000, anonymous: 2000, auth: 500 },
} as const;

/** Global limiter key: the verified user when there is one, else the IP. */
export function globalLimiterKey(req: Request): string {
  const user = (req as AuthRequest).user;
  return user?.sub ? `user:${user.sub}` : `ip:${req.ip}`;
}

/**
 * express-rate-limit store on the app's existing Redis, so every API replica
 * shares the same counters (the default store is per process).
 */
export class RedisRateLimitStore implements Store {
  prefix: string;
  private windowMs = RATE_LIMITS.windowMs;

  constructor(private client: Redis, prefix: string) {
    this.prefix = `ratelimit:${prefix}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redisKey = this.prefix + key;
    // NX: the window starts at the first hit and is not extended by later ones.
    const results = await this.client.multi().incr(redisKey).pexpire(redisKey, this.windowMs, "NX").pttl(redisKey).exec();
    if (!results) throw new Error("Rate limit transaction was aborted");
    const [[incrErr, totalHits], , [ttlErr, ttl]] = results;
    if (incrErr || ttlErr) throw incrErr ?? ttlErr;
    const msLeft = typeof ttl === "number" && ttl > 0 ? ttl : this.windowMs;
    return { totalHits: Number(totalHits), resetTime: new Date(Date.now() + msLeft) };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
}

export function buildRateLimiters(opts: { production: boolean; redis?: Redis }) {
  const limits = opts.production ? RATE_LIMITS.production : RATE_LIMITS.local;
  const store = (name: string) => (opts.redis ? new RedisRateLimitStore(opts.redis, name) : undefined);

  const globalLimiter = rateLimit({
    windowMs: RATE_LIMITS.windowMs,
    limit: (req) => ((req as AuthRequest).user?.sub ? limits.user : limits.anonymous),
    keyGenerator: globalLimiterKey,
    standardHeaders: true,
    legacyHeaders: false,
    // A Redis outage must not take the whole API down with it.
    passOnStoreError: true,
    store: store("global"),
  });

  const authLimiter = rateLimit({
    windowMs: RATE_LIMITS.windowMs,
    limit: limits.auth,
    keyGenerator: (req) => `ip:${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: { error: "Too many auth attempts, try again in 15 minutes" },
    store: store("auth"),
  });

  return { globalLimiter, authLimiter };
}

/**
 * TRUST_PROXY: how many proxy hops sit in front of the API (for example 1 for
 * a single load balancer). Without it, req.ip is the proxy's address and every
 * anonymous user shares one bucket. Unset means no proxy.
 */
export function parseTrustProxy(value: string | undefined): number | false {
  if (!value?.trim()) return false;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error("TRUST_PROXY must be the number of proxy hops in front of the API (0-10)");
  }
  return hops === 0 ? false : hops;
}
