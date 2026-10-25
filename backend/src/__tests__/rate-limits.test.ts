import http from "http";
import express from "express";
import Redis from "ioredis";
import { attachOptionalAuth } from "../middleware/auth";
import { signAccessToken } from "../lib/jwt";
import { buildRateLimiters, parseTrustProxy, RATE_LIMITS, RedisRateLimitStore } from "../middleware/rate-limits";

// SV-1: production budgets must survive the app's own polling, keep users
// apart when they share an IP, and keep the auth limiter per IP.

async function startApp(trustProxy: number | false = false) {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.use(attachOptionalAuth);
  const { globalLimiter, authLimiter } = buildRateLimiters({ production: true });
  app.use(globalLimiter);
  app.post("/api/auth/login", authLimiter, (_req, res) => res.json({ ok: true }));
  app.get("/api/poll", (_req, res) => res.json({ ok: true }));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };
  return { server, base: `http://127.0.0.1:${port}` };
}

const tokenFor = (sub: string, role = "van_operator") => signAccessToken({ sub, role, sessionId: `s-${sub}` });

async function hit(url: string, init: RequestInit = {}, times = 1): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) statuses.push((await fetch(url, init)).status);
  return statuses;
}

describe("production rate limits", () => {
  jest.setTimeout(20000);
  let server: http.Server;
  let base: string;

  beforeEach(async () => ({ server, base } = await startApp()));
  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("lets an operator poll for a full 15-minute shift window without a 429", async () => {
    // incoming every 5 s, shift and route every 10 s, location ping every 10 s,
    // plus 100 taps: 180 + 90 + 90 + 90 + 100 = 550 requests.
    const window = RATE_LIMITS.windowMs / 1000;
    const requests = window / 5 + 3 * (window / 10) + 100;
    const statuses = await hit(`${base}/api/poll`, { headers: { Authorization: `Bearer ${tokenFor("op-1")}` } }, requests);
    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
  });

  it("gives signed-in users behind one IP their own buckets", async () => {
    const userA = { headers: { Authorization: `Bearer ${tokenFor("user-a")}` } };
    const userB = { headers: { Authorization: `Bearer ${tokenFor("user-b")}` } };
    await hit(`${base}/api/poll`, userA, RATE_LIMITS.production.user);
    expect(await hit(`${base}/api/poll`, userA)).toEqual([429]);
    expect(await hit(`${base}/api/poll`, userB)).toEqual([200]);
  });

  it("limits anonymous traffic per IP", async () => {
    const statuses = await hit(`${base}/api/poll`, {}, RATE_LIMITS.production.anonymous + 1);
    expect(statuses.slice(0, -1).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("keeps the auth limiter per IP even for signed-in callers", async () => {
    const login = (sub: string) => ({ method: "POST", headers: { Authorization: `Bearer ${tokenFor(sub)}` } });
    for (let i = 0; i < RATE_LIMITS.production.auth; i++) {
      expect(await hit(`${base}/api/auth/login`, login(`attacker-${i}`))).toEqual([200]);
    }
    expect(await hit(`${base}/api/auth/login`, login("attacker-new"))).toEqual([429]);
  });
});

describe("trust proxy", () => {
  it("separates anonymous clients by X-Forwarded-For when one hop is trusted", async () => {
    const { server, base } = await startApp(1);
    try {
      const fromA = { headers: { "X-Forwarded-For": "198.51.100.1" } };
      const fromB = { headers: { "X-Forwarded-For": "198.51.100.2" } };
      await hit(`${base}/api/poll`, fromA, RATE_LIMITS.production.anonymous);
      expect(await hit(`${base}/api/poll`, fromA)).toEqual([429]);
      expect(await hit(`${base}/api/poll`, fromB)).toEqual([200]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("parses TRUST_PROXY as a hop count", () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
    expect(parseTrustProxy("1")).toBe(1);
    expect(() => parseTrustProxy("true")).toThrow(/TRUST_PROXY/);
    expect(() => parseTrustProxy("-1")).toThrow(/TRUST_PROXY/);
  });
});

describe("RedisRateLimitStore", () => {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true });
  const store = new RedisRateLimitStore(client, `test-${Date.now()}`);
  store.init({ windowMs: 60_000 } as any);

  afterAll(async () => {
    await store.resetKey("k");
    client.disconnect();
  });

  it("counts hits across calls and sets a window expiry", async () => {
    const first = await store.increment("k");
    const second = await store.increment("k");
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(second.resetTime!.getTime()).toBeLessThanOrEqual(first.resetTime!.getTime() + 50);
    expect(second.resetTime!.getTime()).toBeGreaterThan(Date.now());
    await store.decrement("k");
    expect((await store.increment("k")).totalHits).toBe(2);
    await store.resetKey("k");
    expect((await store.increment("k")).totalHits).toBe(1);
  });
});
