import jwt from "jsonwebtoken";
import { env, parseNodeEnv, validateDeployedConfig } from "../config/env";
import { signAccessToken, verifyAccessToken } from "../lib/jwt";

// Synthetic values only: none of these are real keys.
const strong = (label: string) => `${label}_unit_test_secret_0123456789abcdef0123`;

function deployed(overrides: Record<string, unknown> = {}) {
  return {
    databaseUrl: "postgresql://u:p@db:5432/pav",
    redisUrl: "redis://cache:6379",
    jwtAccessSecret: strong("access"),
    jwtRefreshSecret: strong("refresh"),
    auditIpHmacSecret: strong("audit"),
    encryptionKey: strong("kek"),
    stripeSecretKey: "sk_live_unittestnotarealkey",
    stripeWebhookSecret: "whsec_unittestnotarealsecret",
    stripePublishableKey: "pk_live_unittestnotarealkey",
    allowedOrigins: ["https://app.example.com"],
    ...overrides,
  };
}

describe("parseNodeEnv", () => {
  it.each(["development", "test", "staging", "production"])("accepts %s", (value) => {
    expect(parseNodeEnv(value)).toBe(value);
  });

  it.each([undefined, "", "  ", "prod", "Production", "dev", "local"])("rejects %p", (value) => {
    expect(() => parseNodeEnv(value)).toThrow(/NODE_ENV/);
  });
});

describe("module boot", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it("refuses to load with an unknown NODE_ENV instead of using dev defaults", () => {
    process.env.NODE_ENV = "prod";
    jest.isolateModules(() => {
      expect(() => require("../config/env")).toThrow(/not recognised/);
    });
  });
});

describe("validateDeployedConfig", () => {
  it("accepts a complete production config", () => {
    expect(() => validateDeployedConfig("production", deployed())).not.toThrow();
  });

  it("skips checks in development and test", () => {
    expect(() => validateDeployedConfig("development", { allowedOrigins: [] })).not.toThrow();
    expect(() => validateDeployedConfig("test", { allowedOrigins: [] })).not.toThrow();
  });

  it("rejects missing secrets", () => {
    expect(() => validateDeployedConfig("production", deployed({ jwtAccessSecret: undefined }))).toThrow(
      /JWT_ACCESS_SECRET/
    );
  });

  it.each([
    "dev_access_secret_change_me_padding_padding",
    "pavdental_dev_jwt_access_secret_super_secure_32chars_min",
    "replace_with_a_long_random_value_0123456789",
    "short",
  ])("rejects dev or weak JWT secret %p", (secret) => {
    expect(() => validateDeployedConfig("production", deployed({ jwtAccessSecret: secret }))).toThrow(
      /JWT_ACCESS_SECRET/
    );
  });

  it.each(["sk_test_mock_stripe_key_pav_dental", "sk_test_realtestkey", "sk_live_replace_with_key"])(
    "production rejects Stripe secret key %p",
    (key) => {
      expect(() => validateDeployedConfig("production", deployed({ stripeSecretKey: key }))).toThrow(
        /STRIPE_SECRET_KEY/
      );
    }
  );

  it("staging rejects mock and live Stripe keys but accepts real test keys", () => {
    const staging = (overrides: Record<string, unknown>) =>
      deployed({ stripePublishableKey: "pk_test_unittestnotarealkey", ...overrides });
    expect(() => validateDeployedConfig("staging", staging({ stripeSecretKey: "sk_test_mock_e2e" }))).toThrow(
      /STRIPE_SECRET_KEY/
    );
    expect(() => validateDeployedConfig("staging", staging({ stripeSecretKey: "sk_live_unittest" }))).toThrow(
      /STRIPE_SECRET_KEY/
    );
    expect(() => validateDeployedConfig("staging", staging({ stripeSecretKey: "sk_test_unittest" }))).not.toThrow();
  });

  it.each(["pk_test_placeholder", "pk_live_placeholder"])("production rejects publishable key %p", (key) => {
    expect(() => validateDeployedConfig("production", deployed({ stripePublishableKey: key }))).toThrow(
      /STRIPE_PUBLISHABLE_KEY/
    );
  });

  it("rejects a placeholder webhook secret", () => {
    expect(() =>
      validateDeployedConfig("production", deployed({ stripeWebhookSecret: "whsec_replace_with_stripe_webhook_secret" }))
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("requires an HTTPS origin in production", () => {
    expect(() => validateDeployedConfig("production", deployed({ allowedOrigins: [] }))).toThrow(/ALLOWED_ORIGINS/);
  });
});

describe("JWT algorithm pinning", () => {
  it("round-trips an HS256 token", () => {
    const token = signAccessToken({ sub: "u1", role: "patient", sessionId: "s1" });
    expect(verifyAccessToken(token).sub).toBe("u1");
  });

  it("rejects a token signed with any other algorithm, even with the right secret", () => {
    const other = jwt.sign({ sub: "u1", role: "operator", sessionId: "s1" }, env.jwtAccessSecret, {
      algorithm: "HS384",
    });
    expect(() => verifyAccessToken(other)).toThrow(/invalid algorithm/);
  });
});
