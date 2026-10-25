/**
 * Automated tests for CS-43: Build Configuration (CG-1, CG-2, CG-3, CG-4).
 *
 * Verifies:
 * 1. app.json includes EAS projectId, runtimeVersion policy, and required plugins:
 *    - expo-notifications (CG-1)
 *    - @stripe/stripe-react-native with Apple Pay merchant ID (CG-2)
 *    - iOS entitlements for Apple Pay
 * 2. eas.json defines distinct per-profile environment keys:
 *    - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY per profile (CG-2)
 *    - preview profile uses pk_test_ key
 *    - production profile uses pk_live_ key
 *    - submit.production.ios.appleTeamId matches standard 10-character Apple Team ID format (CG-3)
 * 3. .env.example cleanliness (CG-4):
 *    - Dead variables EXPO_PUBLIC_DAILY_URL and EXPO_PUBLIC_DSPT_MODE are removed
 *    - EAS project ID and LAN configuration are documented
 */

import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n📦 RUNNING CS-43 BUILD CONFIGURATION TESTS...\n");

const rootDir = path.resolve(__dirname, "../..");
const appJsonPath = path.join(rootDir, "app.json");
const easJsonPath = path.join(rootDir, "eas.json");
const envExamplePath = path.join(rootDir, ".env.example");

// 1. app.json Inspection
assert(fs.existsSync(appJsonPath), "app.json exists");
const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf-8")).expo;

// EAS Project ID
const projectId = appConfig.extra?.eas?.projectId;
assert(
  typeof projectId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId),
  `app.json specifies a valid UUID format for extra.eas.projectId (${projectId})`
);

// Runtime version policy
assert(
  appConfig.runtimeVersion?.policy === "appVersion",
  "app.json specifies runtimeVersion policy: 'appVersion' for updates"
);

// Plugins
const plugins = appConfig.plugins || [];
const notificationsPlugin = plugins.find(
  (p: any) => p === "expo-notifications" || (Array.isArray(p) && p[0] === "expo-notifications")
);
assert(notificationsPlugin !== undefined, "app.json includes 'expo-notifications' plugin (CG-1)");

const stripePlugin = plugins.find(
  (p: any) =>
    p === "@stripe/stripe-react-native" ||
    (Array.isArray(p) && p[0] === "@stripe/stripe-react-native")
);
assert(stripePlugin !== undefined, "app.json includes '@stripe/stripe-react-native' plugin (CG-2)");
if (Array.isArray(stripePlugin)) {
  const stripeOptions = stripePlugin[1] || {};
  assert(
    stripeOptions.merchantIdentifier === "merchant.com.pavdental.app",
    "Stripe plugin specifies merchant.com.pavdental.app"
  );
  assert(stripeOptions.enableGooglePay === true, "Stripe plugin enables Google Pay");
}

// iOS Merchant ID & Entitlements
assert(
  appConfig.ios?.merchantId === "merchant.com.pavdental.app",
  "app.json ios.merchantId is merchant.com.pavdental.app"
);
const inAppPayments = appConfig.ios?.entitlements?.["com.apple.developer.in-app-payments"];
assert(
  Array.isArray(inAppPayments) && inAppPayments.includes("merchant.com.pavdental.app"),
  "app.json ios.entitlements includes merchant.com.pavdental.app"
);

// 2. eas.json Inspection
assert(fs.existsSync(easJsonPath), "eas.json exists");
const easConfig = JSON.parse(fs.readFileSync(easJsonPath, "utf-8"));

const devEnv = easConfig.build?.development?.env;
const previewEnv = easConfig.build?.preview?.env;
const prodEnv = easConfig.build?.production?.env;

assert(devEnv?.EXPO_PUBLIC_API_URL !== undefined, "Development profile has API URL");
assert(previewEnv?.EXPO_PUBLIC_API_URL !== undefined, "Preview profile has API URL");
assert(prodEnv?.EXPO_PUBLIC_API_URL !== undefined, "Production profile has API URL");

// Stripe publishable keys per profile (CG-2)
assert(
  typeof previewEnv?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string" &&
    previewEnv.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_"),
  "Preview build profile specifies pk_test_ Stripe key"
);
assert(
  typeof prodEnv?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string" &&
    prodEnv.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_"),
  "Production build profile specifies pk_live_ Stripe key"
);

// Apple Team ID format (CG-3: exactly 10 alphanumeric characters)
const appleTeamId = easConfig.submit?.production?.ios?.appleTeamId;
assert(
  typeof appleTeamId === "string" && /^[A-Z0-9]{10}$/.test(appleTeamId),
  `submit.production.ios.appleTeamId is a standard 10-char format: ${appleTeamId}`
);

// 3. .env.example Cleanliness (CG-4)
assert(fs.existsSync(envExamplePath), ".env.example exists");
const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");

assert(
  !envExampleContent.includes("EXPO_PUBLIC_DAILY_URL"),
  ".env.example does not contain unused EXPO_PUBLIC_DAILY_URL"
);
assert(
  !envExampleContent.includes("EXPO_PUBLIC_DSPT_MODE"),
  ".env.example does not contain unused EXPO_PUBLIC_DSPT_MODE"
);
assert(
  envExampleContent.includes("EXPO_PUBLIC_EAS_PROJECT_ID"),
  ".env.example documents EXPO_PUBLIC_EAS_PROJECT_ID"
);
assert(
  envExampleContent.includes("192.168."),
  ".env.example documents local LAN IP configuration for physical devices"
);

console.log("\n🎉 ALL 16 CS-43 BUILD CONFIGURATION TESTS PASSED!\n");
