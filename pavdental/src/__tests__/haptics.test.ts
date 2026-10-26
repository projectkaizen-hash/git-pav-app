import { createHapticsManager, type HapticsBackend, type AccessibilityBackend } from "../lib/haptics-core";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n📳 RUNNING UX-04 REDUCE MOTION & SAFE HAPTICS TESTS...\n");

  const calls: string[] = [];
  const mockHaptics: HapticsBackend = {
    impactAsync: async (style: string) => { calls.push(`impact:${style}`); },
    notificationAsync: async (type: string) => { calls.push(`notification:${type}`); },
    selectionAsync: async () => { calls.push("selection"); },
  };

  let listenerCallback: ((enabled: boolean) => void) | null = null;
  const mockA11y: AccessibilityBackend = {
    isReduceMotionEnabled: async () => false,
    addEventListener: (event, handler) => {
      if (event === "reduceMotionChanged") {
        listenerCallback = handler;
      }
      return { remove: () => {} };
    },
  };

  const manager = createHapticsManager(mockHaptics, mockA11y);

  // 1. When reduceMotion is false, haptics fire normally
  await manager.impactAsync("light");
  await manager.notificationAsync("success");
  await manager.selectionAsync();

  assert(
    calls.join(",") === "impact:light,notification:success,selection",
    "Fires haptic impacts and notifications when Reduce Motion is disabled",
  );

  // 2. Clear calls and enable Reduce Motion via setting
  calls.length = 0;
  manager.setReduceMotion(true);

  await manager.impactAsync("medium");
  await manager.notificationAsync("error");
  await manager.selectionAsync();

  assert(
    calls.length === 0,
    "Suppresses all haptics when Reduce Motion is enabled",
  );

  // 3. Listener callback changes Reduce Motion dynamically
  if (listenerCallback) {
    const cb: (enabled: boolean) => void = listenerCallback;
    cb(false);
  }
  await manager.impactAsync("heavy");
  assert(
    calls.join(",") === "impact:heavy",
    "Restores haptic feedback when Reduce Motion is disabled by user in system settings",
  );

  // 4. Catches native device failures silently without throwing
  calls.length = 0;
  const failingHaptics: HapticsBackend = {
    impactAsync: async () => { throw new Error("Hardware unavailable"); },
    notificationAsync: async () => { throw new Error("Hardware unavailable"); },
    selectionAsync: async () => { throw new Error("Hardware unavailable"); },
  };
  const failingManager = createHapticsManager(failingHaptics, mockA11y);

  let threw = false;
  try {
    await failingManager.impactAsync("light");
    await failingManager.notificationAsync("success");
    await failingManager.selectionAsync();
  } catch {
    threw = true;
  }
  assert(!threw, "Handles hardware/simulator/web absence gracefully without throwing errors");

  console.log("\n🎉 ALL UX-04 REDUCE MOTION HAPTIC TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
