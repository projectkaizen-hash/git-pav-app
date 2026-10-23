import dotenv from "dotenv";

// Load local development settings before any module reads process.env. Production
// deployments provide these values through their secret manager instead.
dotenv.config();

// Fail closed: NODE_ENV must be set to a known value. Development defaults (and
// mock Stripe) are only ever used for "development" and "test"; any other value,
// including an unset or misspelt one, refuses to boot instead of silently running
// with public default secrets.
const KNOWN_ENVS = ["development", "test", "staging", "production"] as const;
type NodeEnv = (typeof KNOWN_ENVS)[number];

export function parseNodeEnv(value: string | undefined): NodeEnv {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`NODE_ENV must be set to one of: ${KNOWN_ENVS.join(", ")}`);
  }
  if (!(KNOWN_ENVS as readonly string[]).includes(trimmed)) {
    throw new Error(`NODE_ENV "${trimmed}" is not recognised; use one of: ${KNOWN_ENVS.join(", ")}`);
  }
  return trimmed as NodeEnv;
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
const isProduction = nodeEnv === "production";
const isStaging = nodeEnv === "staging";
const isDevelopment = nodeEnv === "development";
const isTest = nodeEnv === "test";

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function parsePort(value: string | undefined): number {
  if (!value) return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) {
    if (isProduction) return [];
    if (isStaging) return ["http://localhost:8081", "http://localhost:19006", "exp://localhost:8081"];
    return ["http://localhost:8081", "http://localhost:19006", "exp://localhost:8081"];
  }

  const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);
  for (const origin of origins) {
    if (origin === "*") throw new Error("ALLOWED_ORIGINS must not include '*'");
    try {
      const parsed = new URL(origin);
      // Allow exp:// protocol for Expo development
      const allowedProtocols = isProduction ? ["https:"] : isStaging ? ["https:", "http:", "exp:"] : ["http:", "https:", "exp:"];
      if (!allowedProtocols.includes(parsed.protocol)) {
        throw new Error("unsupported protocol");
      }
      if (isProduction && parsed.protocol !== "https:") {
        throw new Error("production origins must use HTTPS");
      }
    } catch {
      throw new Error(`ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
    }
  }
  return origins;
}

export function validateDeployedConfig(envName: NodeEnv, values: {
  databaseUrl?: string;
  redisUrl?: string;
  jwtAccessSecret?: string;
  jwtRefreshSecret?: string;
  auditIpHmacSecret?: string;
  encryptionKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePublishableKey?: string;
  allowedOrigins: string[];
}) {
  if (envName !== "production" && envName !== "staging") return;
  const isProduction = envName === "production";

  const missing = [
    ["DATABASE_URL", values.databaseUrl],
    ["REDIS_URL", values.redisUrl],
    ["JWT_ACCESS_SECRET", values.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", values.jwtRefreshSecret],
    ["AUDIT_IP_HMAC_SECRET", values.auditIpHmacSecret],
    ["ENCRYPTION_KEY", values.encryptionKey],
    ["STRIPE_SECRET_KEY", values.stripeSecretKey],
    ["STRIPE_WEBHOOK_SECRET", values.stripeWebhookSecret],
    ["STRIPE_PUBLISHABLE_KEY", values.stripePublishableKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required ${envName} configuration: ${missing.join(", ")}`);
  }
  if (isProduction && values.allowedOrigins.length === 0) {
    throw new Error("ALLOWED_ORIGINS must include at least one HTTPS origin in production");
  }

  for (const [name, secret] of [
    ["JWT_ACCESS_SECRET", values.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", values.jwtRefreshSecret],
    ["AUDIT_IP_HMAC_SECRET", values.auditIpHmacSecret],
    ["ENCRYPTION_KEY", values.encryptionKey],
  ] as const) {
    if (
      !secret ||
      secret.length < 32 ||
      secret.includes("change_me") ||
      secret.includes("default-key") ||
      secret.includes("replace_with") ||
      secret.startsWith("dev_") ||
      secret.startsWith("pavdental_dev_")
    ) {
      throw new Error(`${name} must be a unique ${envName} secret of at least 32 characters`);
    }
  }

  // Production takes live Stripe keys only; staging takes real test-mode keys
  // only. Mock and placeholder keys are rejected in both, so mock payments can
  // never be switched on outside development and test.
  const secretKey = values.stripeSecretKey!;
  const publishableKey = values.stripePublishableKey!;
  const webhookSecret = values.stripeWebhookSecret!;
  const mode = isProduction ? "live" : "test";
  if (
    !(secretKey.startsWith(`sk_${mode}_`) || secretKey.startsWith(`rk_${mode}_`)) ||
    secretKey.startsWith("sk_test_mock") ||
    secretKey.includes("replace_with")
  ) {
    throw new Error(`STRIPE_SECRET_KEY must be a real ${mode}-mode key in ${envName}`);
  }
  if (!publishableKey.startsWith(`pk_${mode}_`) || /placeholder|replace_with/.test(publishableKey)) {
    throw new Error(`STRIPE_PUBLISHABLE_KEY must be a real ${mode}-mode key in ${envName}`);
  }
  if (!webhookSecret.startsWith("whsec_") || webhookSecret.includes("replace_with")) {
    throw new Error(`STRIPE_WEBHOOK_SECRET must be a real webhook signing secret in ${envName}`);
  }
}

function printConfigurationSummary(values: {
  databaseUrl?: string;
  redisUrl?: string;
  jwtAccessSecret?: string;
  jwtRefreshSecret?: string;
  auditIpHmacSecret?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePublishableKey?: string;
  allowedOrigins: string[];
}) {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║          Pav Dental API - Configuration Summary                ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log(`Environment: ${nodeEnv.toUpperCase()}`);
  console.log(`Port: ${parsePort(readOptional("PORT"))}`);
  console.log("");
  console.log("Configuration Status:");
  console.log(`  Database URL: ${values.databaseUrl ? "✓ Configured" : "✗ Missing"}`);
  console.log(`  Redis URL: ${values.redisUrl ? "✓ Configured" : "✗ Missing"}`);
  console.log(`  JWT Access Secret: ${values.jwtAccessSecret ? "✓ Configured" : "✗ Missing (using dev default)"}`);
  console.log(`  JWT Refresh Secret: ${values.jwtRefreshSecret ? "✓ Configured" : "✗ Missing (using dev default)"}`);
  console.log(`  Audit IP HMAC Secret: ${values.auditIpHmacSecret ? "✓ Configured" : "✗ Missing (using dev default)"}`);
  console.log(`  Stripe Secret Key: ${values.stripeSecretKey ? "✓ Configured" : "✗ Missing (using dev default)"}`);
  console.log(`  Stripe Webhook Secret: ${values.stripeWebhookSecret ? "✓ Configured" : "✗ Missing"}`);
  console.log(`  Stripe Publishable Key: ${values.stripePublishableKey ? "✓ Configured" : "✗ Missing (using dev default)"}`);
  console.log(`  Allowed Origins: ${values.allowedOrigins.length} origin(s) configured`);
  console.log("");
  
  if (isProduction) {
    console.log("⚠️  PRODUCTION MODE - All secrets must be properly configured");
  } else if (isStaging) {
    console.log("⚠️  STAGING MODE - Secrets must be properly configured for testing");
  } else {
    console.log("⚠️  DEVELOPMENT MODE - Using development defaults for missing secrets");
    console.log("⚠️  DO NOT use development defaults in production or staging");
  }
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
}

const allowedOrigins = parseOrigins(readOptional("ALLOWED_ORIGINS"));
const values = {
  databaseUrl: readOptional("DATABASE_URL"),
  redisUrl: readOptional("REDIS_URL"),
  jwtAccessSecret: readOptional("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: readOptional("JWT_REFRESH_SECRET"),
  auditIpHmacSecret: readOptional("AUDIT_IP_HMAC_SECRET"),
  encryptionKey: readOptional("ENCRYPTION_KEY"),
  kmsKeyId: readOptional("KMS_KEY_ID"),
  stripeSecretKey: readOptional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: readOptional("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: readOptional("STRIPE_PUBLISHABLE_KEY"),
  allowedOrigins,
};

// Print configuration summary before validation
printConfigurationSummary(values);

// Validate deployed (staging/production) configuration; throws if invalid.
validateDeployedConfig(nodeEnv, values);

const stripeSecretKey = values.stripeSecretKey ?? "sk_test_mock_stripe_key_pav_dental";

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isStaging,
  isDevelopment,
  isTest,
  port: parsePort(readOptional("PORT")),
  databaseUrl: values.databaseUrl,
  redisUrl: values.redisUrl,
  jwtAccessSecret: values.jwtAccessSecret ?? "dev_access_secret_change_me",
  jwtRefreshSecret: values.jwtRefreshSecret ?? "dev_refresh_secret_change_me",
  auditIpHmacSecret: values.auditIpHmacSecret ?? "dev_audit_hmac_secret_change_me",
  encryptionKey: values.encryptionKey ?? "dev_clinical_envelope_kek_32_bytes_minimum_key",
  kmsKeyId: values.kmsKeyId ?? "arn:aws:kms:eu-west-2:000000000000:key/pavdental-clinical-cmk",
  stripeSecretKey,
  // Mock Stripe is only reachable in development and test: validateDeployedConfig
  // rejects mock keys in staging and production.
  isMockStripe: stripeSecretKey.startsWith("sk_test_mock"),
  stripeWebhookSecret: values.stripeWebhookSecret,
  stripePublishableKey: values.stripePublishableKey ?? "pk_test_placeholder",
  allowedOrigins,
  // Where patients read about payment plans. Credit decisions are made by the
  // practice's finance provider, never in the app (decisions log #5).
  financeInfoUrl: readOptional("FINANCE_INFO_URL") ?? "https://www.pavdental.com/services/finance",
});
