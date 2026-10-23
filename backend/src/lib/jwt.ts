import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_SECRET = env.jwtAccessSecret;
const REFRESH_SECRET = env.jwtRefreshSecret;

// Pin the algorithm on verify so a token can't pick its own (e.g. "none").
const ALGORITHMS: jwt.Algorithm[] = ["HS256"];

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "30d";

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
    { algorithm: "HS256", expiresIn: ACCESS_EXPIRY }
  );
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    { ...payload, jti: payload.jti || crypto.randomUUID() },
    REFRESH_SECRET,
    { algorithm: "HS256", expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ALGORITHMS }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: ALGORITHMS }) as RefreshTokenPayload;
}
