/**
 * Email Verification, Password Reset, and OTP Service
 * 
 * Provides functionality for:
 * - Email verification
 * - Password reset
 * - OTP delivery and verification
 * - Rate limiting
 * - Token expiration
 */

import { randomBytes, createHash } from 'crypto';

export interface OTPConfig {
  expirySeconds: number;
  maxAttempts: number;
  cooldownSeconds: number;
}

export interface EmailVerificationConfig extends OTPConfig {
  tokenLength: number;
}

export interface PasswordResetConfig extends OTPConfig {
  tokenLength: number;
}

export interface TwoFactorConfig extends OTPConfig {
  codeLength: number;
}

// Configuration
const EMAIL_VERIFICATION_CONFIG: EmailVerificationConfig = {
  tokenLength: 32,
  expirySeconds: 86400, // 24 hours
  maxAttempts: 5,
  cooldownSeconds: 300, // 5 minutes
};

const PASSWORD_RESET_CONFIG: PasswordResetConfig = {
  tokenLength: 32,
  expirySeconds: 3600, // 1 hour
  maxAttempts: 5,
  cooldownSeconds: 300, // 5 minutes
};

const TWO_FACTOR_CONFIG: TwoFactorConfig = {
  codeLength: 6,
  expirySeconds: 300, // 5 minutes
  maxAttempts: 3,
  cooldownSeconds: 60, // 1 minute
};

/**
 * Generate random token
 */
export function generateToken(length: number): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').substring(0, length);
}

/**
 * Generate OTP code
 */
export function generateOTPCode(length: number): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

/**
 * Hash token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Email Verification Service
 */
export class EmailVerificationService {
  private config: EmailVerificationConfig;

  constructor(config?: EmailVerificationConfig) {
    this.config = config || EMAIL_VERIFICATION_CONFIG;
  }

  /**
   * Generate verification token
   */
  generateVerificationToken(): { token: string; hashedToken: string; expiresAt: Date } {
    const token = generateToken(this.config.tokenLength);
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + this.config.expirySeconds * 1000);

    return { token, hashedToken, expiresAt };
  }

  /**
   * Verify token
   */
  verifyToken(token: string, hashedToken: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      return false;
    }

    const providedHash = hashToken(token);
    return providedHash === hashedToken;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

/**
 * Password Reset Service
 */
export class PasswordResetService {
  private config: PasswordResetConfig;

  constructor(config?: PasswordResetConfig) {
    this.config = config || PASSWORD_RESET_CONFIG;
  }

  /**
   * Generate reset token
   */
  generateResetToken(): { token: string; hashedToken: string; expiresAt: Date } {
    const token = generateToken(this.config.tokenLength);
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + this.config.expirySeconds * 1000);

    return { token, hashedToken, expiresAt };
  }

  /**
   * Verify reset token
   */
  verifyToken(token: string, hashedToken: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      return false;
    }

    const providedHash = hashToken(token);
    return providedHash === hashedToken;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

/**
 * Two-Factor Authentication Service
 */
export class TwoFactorService {
  private config: TwoFactorConfig;

  constructor(config?: TwoFactorConfig) {
    this.config = config || TWO_FACTOR_CONFIG;
  }

  /**
   * Generate OTP code
   */
  generateOTP(): { code: string; hashedCode: string; expiresAt: Date } {
    const code = generateOTPCode(this.config.codeLength);
    const hashedCode = hashToken(code);
    const expiresAt = new Date(Date.now() + this.config.expirySeconds * 1000);

    return { code, hashedCode, expiresAt };
  }

  /**
   * Verify OTP code
   */
  verifyOTP(code: string, hashedCode: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      return false;
    }

    const providedHash = hashToken(code);
    return providedHash === hashedCode;
  }

  /**
   * Check if OTP is expired
   */
  isOTPExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Check if attempts exceeded
   */
  hasExceededAttempts(attempts: number): boolean {
    return attempts >= this.config.maxAttempts;
  }

  /**
   * Check if cooldown is active
   */
  isCooldownActive(lastAttemptAt: Date | null): boolean {
    if (!lastAttemptAt) {
      return false;
    }

    const cooldownEnd = new Date(lastAttemptAt.getTime() + this.config.cooldownSeconds * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * Get cooldown end time
   */
  getCooldownEnd(lastAttemptAt: Date | null): Date | null {
    if (!lastAttemptAt) {
      return null;
    }

    return new Date(lastAttemptAt.getTime() + this.config.cooldownSeconds * 1000);
  }
}

import { redis } from './redis';

/**
 * Rate Limiter
 * Uses Redis for distributed/durable rate limiting with in-memory fallback
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: Date }> = new Map();

  /**
   * Check if rate limit exceeded
   */
  async isRateLimited(key: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
    try {
      const redisKey = `ratelimit:${key}`;
      const current = await redis.incr(redisKey);
      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      return current > maxAttempts;
    } catch {
      // Memory fallback if Redis is unavailable
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSeconds * 1000);

      const record = this.attempts.get(key);

      if (!record || record.firstAttempt < windowStart) {
        this.attempts.set(key, { count: 1, firstAttempt: now });
        return false;
      }

      record.count++;
      return record.count > maxAttempts;
    }
  }

  /**
   * Reset rate limit
   */
  async reset(key: string): Promise<void> {
    try {
      await redis.del(`ratelimit:${key}`);
    } catch {
      // ignore redis error
    }
    this.attempts.delete(key);
  }

  /**
   * Get remaining attempts
   */
  async getRemainingAttempts(key: string, maxAttempts: number, windowSeconds: number): Promise<number> {
    try {
      const redisKey = `ratelimit:${key}`;
      const val = await redis.get(redisKey);
      const count = val ? parseInt(val, 10) : 0;
      return Math.max(0, maxAttempts - count);
    } catch {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSeconds * 1000);

      const record = this.attempts.get(key);

      if (!record || record.firstAttempt < windowStart) {
        return maxAttempts;
      }

      return Math.max(0, maxAttempts - record.count);
    }
  }
}

// Export singleton instances
export const emailVerificationService = new EmailVerificationService();
export const passwordResetService = new PasswordResetService();
export const twoFactorService = new TwoFactorService();
export const rateLimiter = new RateLimiter();

