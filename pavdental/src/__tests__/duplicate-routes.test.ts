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

console.log("\n🛣️  RUNNING DUPLICATE ROUTE & DEEP LINK TESTS (CS-39: MB-1, AT-4, CG-3)...\n");

const appDir = path.resolve(__dirname, "../app");

function getRouteFiles(dir: string, baseDir: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getRouteFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      // Exclude layouts and special expo-router files
      if (entry.name.startsWith("_layout") || entry.name.startsWith("+")) {
        continue;
      }
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files;
}

function fileToRouteUrl(relPath: string): string {
  const segments = relPath.split(path.sep);
  // Strip route groups like (patient), (operator), (auth), (tabs)
  const publicSegments = segments.filter((s) => !/^\(.*\)$/.test(s));

  // Handle last segment (file name)
  const last = publicSegments[publicSegments.length - 1];
  const withoutExt = last.replace(/\.tsx$/, "");

  if (withoutExt === "index") {
    publicSegments.pop();
  } else {
    publicSegments[publicSegments.length - 1] = withoutExt;
  }

  const route = "/" + publicSegments.join("/");
  return route === "//" ? "/" : route;
}

// 1. Zero Duplicate URL Collisions (MB-1)
const routeFiles = getRouteFiles(appDir);
assert(routeFiles.length > 20, `Scanned ${routeFiles.length} route files across app`);

const routesByUrl = new Map<string, string[]>();
for (const file of routeFiles) {
  const url = fileToRouteUrl(file);
  const existing = routesByUrl.get(url) || [];
  existing.push(file);
  routesByUrl.set(url, existing);
}

const collisions: { url: string; files: string[] }[] = [];
for (const [url, files] of routesByUrl.entries()) {
  if (files.length > 1) {
    collisions.push({ url, files });
  }
}

assert(
  collisions.length === 0,
  collisions.length === 0
    ? "zero duplicate URL collisions across all route groups (MB-1)"
    : `Collisions detected: ${collisions.map((c) => `${c.url} -> ${c.files.join(", ")}`).join("; ")}`
);

// 2. Disambiguate /check-in vs /van-check-in (MB-1)
const patientCheckIn = "(patient)/check-in.tsx";
const operatorCheckIn = "(operator)/van-check-in.tsx";

assert(fs.existsSync(path.join(appDir, patientCheckIn)), "patient check-in file exists");
assert(fs.existsSync(path.join(appDir, operatorCheckIn)), "operator van-check-in file exists");
assert(fileToRouteUrl(patientCheckIn) === "/check-in", "/check-in belongs uniquely to patient check-in");
assert(fileToRouteUrl(operatorCheckIn) === "/van-check-in", "/van-check-in belongs uniquely to operator check-in");

// 3. Disambiguate /profile vs /onboarding/profile (MB-1)
const patientProfile = "(patient)/(tabs)/profile/index.tsx";
const onboardingProfile = "onboarding/profile.tsx";

assert(fs.existsSync(path.join(appDir, patientProfile)), "patient profile index file exists");
assert(fs.existsSync(path.join(appDir, onboardingProfile)), "onboarding profile file exists");
assert(fileToRouteUrl(patientProfile) === "/profile", "/profile belongs uniquely to patient profile");
assert(fileToRouteUrl(onboardingProfile) === "/onboarding/profile", "/onboarding/profile belongs uniquely to onboarding flow");

// 4. Aligned Deep Link Routes (AT-4)
const resetRoute = "(auth)/reset-password.tsx";
const verifyRoute = "(auth)/verify-email.tsx";

assert(fs.existsSync(path.join(appDir, resetRoute)), "reset-password route exists");
assert(fs.existsSync(path.join(appDir, verifyRoute)), "verify-email route exists");
assert(fileToRouteUrl(resetRoute) === "/reset-password", "/reset-password route matches email communication link");
assert(fileToRouteUrl(verifyRoute) === "/verify-email", "/verify-email route matches email communication link");

// 5. Configured Universal & App Links in app.json (CG-3)
const appJsonPath = path.resolve(__dirname, "../../app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));

assert(appJson.expo.scheme === "pavdental", "expo.scheme is set to pavdental");
assert(Array.isArray(appJson.expo.ios.associatedDomains), "ios.associatedDomains is configured");
assert(appJson.expo.ios.associatedDomains.includes("applinks:pavdental.com"), "associatedDomains contains applinks:pavdental.com");
assert(appJson.expo.ios.associatedDomains.includes("applinks:staging.pavdental.com"), "associatedDomains contains applinks:staging.pavdental.com");

assert(Array.isArray(appJson.expo.android.intentFilters), "android.intentFilters is configured");
const filters = appJson.expo.android.intentFilters;
assert(filters.some((f: any) => f.autoVerify === true), "intentFilters includes autoVerify: true");
const dataItems = filters.flatMap((f: any) => f.data || []);
assert(dataItems.some((d: any) => d.host === "pavdental.com" && d.pathPrefix === "/reset-password"), "Android intent filter covers /reset-password");
assert(dataItems.some((d: any) => d.host === "pavdental.com" && d.pathPrefix === "/verify-email"), "Android intent filter covers /verify-email");

// 6. Well-known AASA & AssetLinks on Website
const aasaPath = path.resolve(__dirname, "../../../website/public/.well-known/apple-app-site-association");
const assetlinksPath = path.resolve(__dirname, "../../../website/public/.well-known/assetlinks.json");

assert(fs.existsSync(aasaPath), "website serves apple-app-site-association in .well-known");
assert(fs.existsSync(assetlinksPath), "website serves assetlinks.json in .well-known");

const aasa = JSON.parse(fs.readFileSync(aasaPath, "utf-8"));
assert(aasa.applinks?.details?.length > 0, "AASA contains applinks details");

const assetlinks = JSON.parse(fs.readFileSync(assetlinksPath, "utf-8"));
assert(assetlinks[0]?.target?.package_name === "com.pavdental.app", "assetlinks points to com.pavdental.app");

console.log("\n🎉 ALL DUPLICATE ROUTE & DEEP LINK TESTS PASSED (0 FAILURES)!\n");
