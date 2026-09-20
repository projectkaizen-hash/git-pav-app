import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_SECRET = env.jwtAccessSecret;
const REFRESH_SECRET = env.jwtRefreshSecret;

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "30d";

export interface AccessTokenPayload {
  sub: string;       // user UUID
  role: string;
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  jti?: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    { ...payload, jti: payload.jti || crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}
