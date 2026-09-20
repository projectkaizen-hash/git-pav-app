import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    role: string;
    sessionId: string;
  };
}

export function attachOptionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // Protected routes return the standard 401 from requireAuth. Keeping this
      // request anonymous prevents an invalid token being attributed in audit.
    }
  }
  next();
}

export function requireAuth(
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
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
