import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_SECRET = env.jwtAccessSecret;
const REFRESH_SECRET = env.jwtRefreshSecret;

// Pin the algorithm on verify so a token can't pick its own (e.g. "none").
const ALGORITHMS: jwt.Algorithm[] = ["HS256"];

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "30d";

// Every token names who issued it and what it is for (CS-03, JW-1), so an
// access token can't be replayed as a refresh token, or the reverse, even if
// the two secrets were ever set to the same value.
const ISSUER = "pavdental-api";
const ACCESS_AUDIENCE = "pavdental-access";
const REFRESH_AUDIENCE = "pavdental-refresh";

// Refresh tokens issued before iss/aud were added last 30 days. Until this date
// a token with no aud at all is still accepted, so nobody is signed out by the
// deploy; a token with the wrong aud never is.
export const LEGACY_TOKEN_CUTOFF = new Date("2026-12-01T00:00:00Z");

export interface AccessTokenPayload {
  sub: string;       // user UUID
  role: string;
  sessionId: string;
  jti?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  jti?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    { ...payload, jti: payload.jti || crypto.randomUUID() },
    ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: ACCESS_EXPIRY, issuer: ISSUER, audience: ACCESS_AUDIENCE }
  );
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    { ...payload, jti: payload.jti || crypto.randomUUID() },
    REFRESH_SECRET,
    { algorithm: "HS256", expiresIn: REFRESH_EXPIRY, issuer: ISSUER, audience: REFRESH_AUDIENCE }
  );
}

function verifyFor<T>(token: string, secret: string, audience: string, now: Date): T {
  const payload = jwt.verify(token, secret, { algorithms: ALGORITHMS }) as jwt.JwtPayload;
  const isLegacy = payload.aud === undefined && payload.iss === undefined;
  if (isLegacy && now < LEGACY_TOKEN_CUTOFF) return payload as T;
  if (payload.iss !== ISSUER || payload.aud !== audience) {
    throw new jwt.JsonWebTokenError("token issuer or audience is not accepted");
  }
  return payload as T;
}

export function verifyAccessToken(token: string, now = new Date()): AccessTokenPayload {
  return verifyFor<AccessTokenPayload>(token, ACCESS_SECRET, ACCESS_AUDIENCE, now);
}

export function verifyRefreshToken(token: string, now = new Date()): RefreshTokenPayload {
  return verifyFor<RefreshTokenPayload>(token, REFRESH_SECRET, REFRESH_AUDIENCE, now);
}
