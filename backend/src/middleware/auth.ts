import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { isSessionDenied } from "../lib/session-revocation";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    role: string;
    sessionId: string;
  };
}

export async function attachOptionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice(7));
      // A revoked session's token is treated like an invalid one (CS-08, AM-1).
      if (!(await isSessionDenied(payload.sessionId))) req.user = payload;
    } catch {
      // Protected routes return the standard 401 from requireAuth. Keeping this
      // request anonymous prevents an invalid token being attributed in audit.
    }
  }
  next();
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user) return next();

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
  // Logged out, password changed, session revoked or account closed (AM-1).
  if (await isSessionDenied(payload.sessionId)) {
    return res.status(401).json({ error: "Session has ended" });
  }
  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
