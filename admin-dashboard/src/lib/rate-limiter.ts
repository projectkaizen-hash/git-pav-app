/**
 * Simple Rate Limiter
 *
 * In-memory rate limiting for development.
 * For production, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   *
   * @param identifier - Unique identifier (IP address, user ID, etc.)
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and remaining requests
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired one
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(identifier, newEntry);
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(identifier, entry);
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset a specific identifier (useful for testing)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get current entry count for an identifier
   */
  getCount(identifier: string): number {
    const entry = this.store.get(identifier);
    return entry?.count || 0;
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  limit = 100,
  windowMs: number = 60 * 1000, // 1 minute default
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  return rateLimiter.check(identifier, limit, windowMs);
}

/**
 * Create a rate limiting middleware for Next.js API routes
 */
export function createRateLimitMiddleware(options: {
  limit?: number;
  windowMs?: number;
  identifierFn?: (request: Request) => string;
}) {
  const {
    limit = 100,
    windowMs = 60 * 1000,
    identifierFn = (req) => {
      // Default: use IP address from X-Forwarded-For header
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
      return ip;
    },
  } = options;

  return async function rateLimitMiddleware(request: Request) {
    const identifier = identifierFn(request);
    const result = checkRateLimit(identifier, limit, windowMs);

    if (!result.allowed) {
      return {
        success: false,
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      };
    }

    return {
      success: true,
      remaining: result.remaining,
    };
  };
}

export { rateLimiter };
