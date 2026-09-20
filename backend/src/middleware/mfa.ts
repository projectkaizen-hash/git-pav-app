/**
 * MFA Enforcement Middleware
 * 
 * Enforces multi-factor authentication for clinician and admin users
 * before allowing access to privileged operations.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth';
import crypto from 'crypto';

/**
 * Check if user has MFA enabled
 */
async function isMFAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  return user?.mfaEnabled || false;
}

/**
 * Check if MFA is required for user role
 */
function isMFARequired(role: string): boolean {
  return role === 'clinician' || role === 'admin';
}

/**
 * Verify MFA code
 */
async function verifyMFA(userId: string, code: string): Promise<boolean> {
  const hashedCode = hashMFA(code);
  
  const mfaCode = await prisma.mfaCode.findFirst({
    where: {
      userId,
      code: hashedCode,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!mfaCode) {
    return false;
  }

  // Mark code as used
  await prisma.mfaCode.update({
    where: { id: mfaCode.id },
    data: { usedAt: new Date() },
  });

  return true;
}

/**
 * Hash MFA code
 */
function hashMFA(code: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Check if MFA was verified in current session
 */
async function isMFAVerifiedInSession(userId: string, sessionId: string): Promise<boolean> {
  const verification = await prisma.mfaVerification.findFirst({
    where: {
      userId,
      sessionId,
      expiresAt: { gt: new Date() },
    },
  });

  return !!verification;
}

/**
 * Mark MFA as verified in session
 */
async function markMFAVerifiedInSession(userId: string, sessionId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  await prisma.mfaVerification.create({
    data: {
      userId,
      sessionId,
      verifiedAt: now,
      expiresAt,
    },
  });
}

/**
 * Middleware to require MFA for privileged operations
 */
export function requireMFA(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if MFA is required for this role
  if (!isMFARequired(req.user.role)) {
    return next();
  }

  // Check if MFA is enabled for user
  isMFAEnabled(req.user.sub).then((enabled) => {
    if (!enabled) {
      return res.status(403).json({ 
        error: 'MFA not enabled',
        message: 'Please enable MFA to access this feature',
      });
    }

    // Check if MFA was verified in current session
    isMFAVerifiedInSession(req.user!.sub, req.user!.sessionId).then((verified) => {
      if (verified) {
        return next();
      }

      // MFA not verified
      return res.status(403).json({ 
        error: 'MFA required',
        message: 'Please complete MFA verification',
      });
    });
  });
}

/**
 * Middleware to require MFA for specific roles only
 */
export function requireMFAForRoles(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user role requires MFA
    if (!roles.includes(req.user.role)) {
      return next();
    }

    // Apply MFA requirement
    return requireMFA(req, res, next);
  };
}

/**
 * Middleware to check if MFA is enabled (soft check)
 */
export function checkMFAEnabled(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  isMFAEnabled(req.user.sub).then((enabled) => {
    res.locals.mfaEnabled = enabled;
    next();
  });
}

/**
 * MFA verification endpoint middleware
 */
export async function verifyMFAForRequest(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'MFA code is required' });
  }

  const verified = await verifyMFA(req.user.sub, code);

  if (!verified) {
    return res.status(400).json({ error: 'Invalid or expired MFA code' });
  }

  // Mark MFA as verified in session
  await markMFAVerifiedInSession(req.user.sub, req.user.sessionId);

  return res.json({ message: 'MFA verified successfully' });
}
