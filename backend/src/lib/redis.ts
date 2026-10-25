import Redis from "ioredis";
import { env } from "../config/env";
import { safeError } from "./log-safety";

const REDIS_URL = env.redisUrl ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", safeError(err));
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});
