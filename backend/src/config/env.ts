import dotenv from "dotenv";

// Load local development settings before any module reads process.env. Production
// deployments provide these values through their secret manager instead.
dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const isStaging = nodeEnv === "staging";
const isDevelopment = nodeEnv === "development";

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

function validateProductionSecrets(values: {
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
  if (!isProduction && !isStaging) return;

  const missing = [
    ["DATABASE_URL", values.databaseUrl],
    ["REDIS_URL", values.redisUrl],
    ["JWT_ACCESS_SECRET", values.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", values.jwtRefreshSecret],
    ["AUDIT_IP_HMAC_SECRET", values.auditIpHmacSecret],
    ["STRIPE_SECRET_KEY", values.stripeSecretKey],
    ["STRIPE_WEBHOOK_SECRET", values.stripeWebhookSecret],
    ["STRIPE_PUBLISHABLE_KEY", values.stripePublishableKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    const envName = isProduction ? "production" : "staging";
    throw new Error(`Missing required ${envName} configuration: ${missing.join(", ")}`);
  }
  if (isProduction && values.allowedOrigins.length === 0) {
    throw new Error("ALLOWED_ORIGINS must include at least one HTTPS origin in production");
  }

  for (const [name, secret] of [
    ["JWT_ACCESS_SECRET", values.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", values.jwtRefreshSecret],
    ["AUDIT_IP_HMAC_SECRET", values.auditIpHmacSecret],
  ] as const) {
    if (!secret || secret.length < 32 || secret.includes("change_me") || secret.startsWith("dev_")) {
      const envName = isProduction ? "production" : "staging";
      throw new Error(`${name} must be a unique ${envName} secret of at least 32 characters`);
    }
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
  stripeSecretKey: readOptional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: readOptional("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: readOptional("STRIPE_PUBLISHABLE_KEY"),
  allowedOrigins,
};

// Print configuration summary before validation
printConfigurationSummary(values);

// Validate production secrets (will throw if invalid)
validateProductionSecrets(values);

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isStaging,
  isDevelopment,
  port: parsePort(readOptional("PORT")),
  databaseUrl: values.databaseUrl,
  redisUrl: values.redisUrl,
  jwtAccessSecret: values.jwtAccessSecret ?? "dev_access_secret_change_me",
  jwtRefreshSecret: values.jwtRefreshSecret ?? "dev_refresh_secret_change_me",
  auditIpHmacSecret: values.auditIpHmacSecret ?? "dev_audit_hmac_secret_change_me",
  stripeSecretKey: values.stripeSecretKey ?? "sk_test_mock_stripe_key_pav_dental",
  stripeWebhookSecret: values.stripeWebhookSecret,
  stripePublishableKey: values.stripePublishableKey ?? "pk_test_placeholder",
  allowedOrigins,
});
