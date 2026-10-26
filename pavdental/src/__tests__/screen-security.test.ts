import { createScreenGuard, type ScreenCaptureApi } from "../features/screen-security/screen-guard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n🛡️  RUNNING D-14 SCREENSHOT BLOCKING TESTS...\n");
  const calls: string[] = [];
  const protectScreen = createScreenGuard(() => ({
    preventScreenCaptureAsync: async (key) => void calls.push(`prevent:${key}`),
    allowScreenCaptureAsync: async (key) => void calls.push(`allow:${key}`),
    enableAppSwitcherProtectionAsync: async () => void calls.push("switcher:on"),
    disableAppSwitcherProtectionAsync: async () => void calls.push("switcher:off"),
  }));

  const releaseRecords = protectScreen("records");
  const releaseClinician = protectScreen("clinician");
  assert(
    calls.join() === "prevent:records,switcher:on,prevent:clinician",
    "blocks capture for each protected screen and hides the app switcher once",
  );

  releaseRecords();
  releaseRecords();
  assert(calls.join().endsWith("prevent:clinician,allow:records"), "lifting one screen keeps the other protected, and is safe twice");

  releaseClinician();
  assert(calls.join().endsWith("allow:clinician,switcher:off"), "the app switcher preview comes back when no protected screen is open");

  // A native failure is reported, not thrown, so the screen still opens.
  const failing: ScreenCaptureApi = {
    preventScreenCaptureAsync: async () => {
      throw new Error("not available");
    },
    allowScreenCaptureAsync: async () => {},
    enableAppSwitcherProtectionAsync: async () => {},
    disableAppSwitcherProtectionAsync: async () => {},
  };
  let threw = false;
  try {
    createScreenGuard(() => failing)("records")();
    await new Promise((r) => setTimeout(r, 0));
  } catch {
    threw = true;
  }
  assert(!threw, "a native failure doesn't stop the screen opening");
  assert(createScreenGuard(() => null)("records") instanceof Function, "does nothing on web");
}

runTests();
