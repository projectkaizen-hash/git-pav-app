import { useAppLockStore, setLocalAuthModuleForTesting } from "../features/app-lock/app-lock-store";
import { useAuthStore } from "../features/auth/auth-store";
import { tokenStore } from "../lib/token-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n🔒 RUNNING CS-41 BIOMETRIC LOCK TESTS (MA-3)...\n");

  try {
    // -------------------------------------------------------------------------
    // Test 1: Cold start with biometric lock enabled starts locked (MA-3)
    // -------------------------------------------------------------------------
    await tokenStore.setBiometricEnabled(true);

    // Reset store state
    useAppLockStore.setState({ isLocked: false, requiresBiometric: false });
    useAuthStore.setState({ biometricUnlocked: false });

    await useAppLockStore.getState().hydrateBiometricPreference();

    assert(
      useAppLockStore.getState().requiresBiometric === true,
      "requiresBiometric is true when biometric lock is enabled"
    );
    assert(
      useAppLockStore.getState().isLocked === true,
      "Cold start with biometric lock enabled starts in locked state (MA-3)"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === false,
      "biometricUnlocked remains false until explicitly authenticated"
    );

    // -------------------------------------------------------------------------
    // Test 2: Cold start with biometric lock disabled starts unlocked
    // -------------------------------------------------------------------------
    await tokenStore.setBiometricEnabled(false);

    await useAppLockStore.getState().hydrateBiometricPreference();

    assert(
      useAppLockStore.getState().requiresBiometric === false,
      "requiresBiometric is false when preference is disabled"
    );
    assert(
      useAppLockStore.getState().isLocked === false,
      "Cold start with biometric lock disabled starts unlocked"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === true,
      "biometricUnlocked is set to true when biometrics are not required"
    );

    // -------------------------------------------------------------------------
    // Test 3: No auto-unlock when device has no biometrics enrolled (MA-3 fix)
    // -------------------------------------------------------------------------
    await tokenStore.setBiometricEnabled(true);
    await useAppLockStore.getState().hydrateBiometricPreference();
    assert(useAppLockStore.getState().isLocked === true, "App starts locked");

    // Mock local authentication module to simulate failed/cancelled challenge
    setLocalAuthModuleForTesting({
      hasHardwareAsync: async () => false,
      isEnrolledAsync: async () => false,
      authenticateAsync: async () => ({
        success: false,
        error: "user_cancel",
      }),
    });

    const unlockResultFailed = await useAppLockStore.getState().unlock();
    assert(unlockResultFailed === false, "unlock() returns false when authentication fails");
    assert(
      useAppLockStore.getState().isLocked === true,
      "Device without hardware does NOT auto-unlock (MA-3: never bypasses lock)"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === false,
      "biometricUnlocked remains false when authentication fails"
    );

    // -------------------------------------------------------------------------
    // Test 4: Successful authentication unlocks the app and updates stores
    // -------------------------------------------------------------------------
    setLocalAuthModuleForTesting({
      hasHardwareAsync: async () => true,
      isEnrolledAsync: async () => true,
      authenticateAsync: async () => ({
        success: true,
      }),
    });

    const unlockResultSuccess = await useAppLockStore.getState().unlock();
    assert(unlockResultSuccess === true, "unlock() returns true when authentication succeeds");
    assert(
      useAppLockStore.getState().isLocked === false,
      "App is unlocked (isLocked === false) after successful authentication"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === true,
      "biometricUnlocked is updated to true in auth-store"
    );

    // -------------------------------------------------------------------------
    // Test 5: Background timeout re-locks app and invalidates biometricUnlocked
    // -------------------------------------------------------------------------
    // App was backgrounded 2 minutes ago (timeout is 1 minute default)
    const store = useAppLockStore.getState();
    useAppLockStore.setState({
      requiresBiometric: true,
      isLocked: false,
      backgroundedAt: Date.now() - 120_000,
    });
    useAuthStore.setState({ biometricUnlocked: true });

    assert(store.checkLockRequired() === true, "checkLockRequired() detects elapsed background timeout");

    store.setForegrounded();

    assert(
      useAppLockStore.getState().isLocked === true,
      "App re-locks after foregrounding past timeout"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === false,
      "biometricUnlocked is revoked when app locks after timeout"
    );
    assert(
      useAppLockStore.getState().backgroundedAt === null,
      "backgroundedAt is cleared after foregrounding"
    );

    // -------------------------------------------------------------------------
    // Test 6: Brief backgrounding under timeout does NOT re-lock
    // -------------------------------------------------------------------------
    useAppLockStore.setState({
      requiresBiometric: true,
      isLocked: false,
      backgroundedAt: Date.now() - 10_000, // 10s (under 60s timeout)
    });
    useAuthStore.setState({ biometricUnlocked: true });

    assert(store.checkLockRequired() === false, "checkLockRequired() is false under timeout");

    store.setForegrounded();

    assert(
      useAppLockStore.getState().isLocked === false,
      "App stays unlocked when background duration is under timeout"
    );
    assert(
      useAuthStore.getState().biometricUnlocked === true,
      "biometricUnlocked remains true under timeout"
    );

    console.log("\n🎉 ALL 14 BIOMETRIC LOCK TESTS PASSED (0 FAILURES)!\n");
  } finally {
    await tokenStore.setBiometricEnabled(false);
    setLocalAuthModuleForTesting(null);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
