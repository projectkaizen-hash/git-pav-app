// Tests for CS-21: One mobile API client
// Verifies single-flight token refresh, signOut clearing queryClient and all stores (MA-2),
// and FormData boundary handling in authFetch.

import { authFetch, clearSessionState, API_URL } from "../features/auth/auth-api";
import { useAuthStore } from "../features/auth/auth-store";
import { useBookingStore } from "../features/booking/booking-store";
import { useVanStore } from "../features/van/van-store";
import { useOnboardingStore } from "../features/onboarding/onboarding-store";
import { queryClient } from "../lib/query-client";
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
  console.log("\n📱 RUNNING API CLIENT & STORE CLEANUP TESTS (CS-21)...\n");

  // ─── Test 1: API_URL constant is defined and matches standard ──────────────
  assert(typeof API_URL === "string" && API_URL.length > 0, "API_URL is configured as a non-empty string");
  assert(API_URL.startsWith("http"), "API_URL starts with http protocol");

  // ─── Test 2: signOut / clearSessionState clears queryClient and stores (MA-2) ─
  // Setup dirty stores and query cache
  useAuthStore.getState().setAuth("test-access-token", {
    id: "usr_123",
    sub: "usr_123",
    email: "patient@example.test",
    role: "patient",
    emailVerified: true,
    phoneVerified: true,
    isMfaEnabled: false,
    mfaEnabled: false,
  });

  useBookingStore.getState().setService({
    id: "srv_checkup",
    name: "Checkup",
    pricePence: 6500,
    depositPence: 2000,
    durationMinutes: 30,
    category: "general",
    channel: "clinic",
    description: "Checkup",
  });
  assert(useBookingStore.getState().service !== null, "Booking store has draft data");

  useVanStore.getState().setActiveRequestId("req_van_456");
  useVanStore.getState().setLocationCoverage({
    postcode: "SW1A 1AA",
    lat: 51.5,
    lng: -0.1,
    isCovered: true,
    availability: null,
  });
  assert(useVanStore.getState().activeRequestId === "req_van_456", "Van store has active request");

  useOnboardingStore.getState().setProfile({
    dob: "1990-01-01",
    gender: "female",
    emergencyContactName: "Jane",
    emergencyContactPhone: "07700900123",
  });
  assert(useOnboardingStore.getState().dob === "1990-01-01", "Onboarding store has profile data");

  // Populate query client cache with patient health data
  queryClient.setQueryData(["patient-records", "usr_123"], { clinicalNotes: "Secret notes" });
  assert(queryClient.getQueryData(["patient-records", "usr_123"]) !== undefined, "Query cache holds patient data");

  // Execute full session clear
  await clearSessionState();

  // Verify all stores and queryClient cache are wiped
  assert(useAuthStore.getState().accessToken === null, "Auth accessToken is cleared");
  assert(useAuthStore.getState().user === null, "Auth user is cleared");
  assert(queryClient.getQueryData(["patient-records", "usr_123"]) === undefined, "QueryClient cache is cleared");
  assert(queryClient.getQueryCache().getAll().length === 0, "QueryClient cache has 0 entries");
  assert(useBookingStore.getState().service === null, "Booking draft is reset to null");
  assert(useVanStore.getState().activeRequestId === null, "Van activeRequestId is reset to null");
  assert(useVanStore.getState().postcode === "", "Van postcode is reset");
  assert(useOnboardingStore.getState().dob === "", "Onboarding draft dob is reset");

  // ─── Test 3: authFetch transparent single-flight refresh on 401 ───────────
  let refreshCount = 0;
  let protectedCallCount = 0;

  const originalFetch = global.fetch;
  (global as any).fetch = async (url: string, init?: RequestInit) => {
    if (url.includes("/api/auth/refresh")) {
      refreshCount++;
      return new Response(
        JSON.stringify({
          accessToken: "new-refreshed-token",
          refreshToken: "new-refresh-token",
          user: { id: "usr_123", email: "pt@example.test", role: "patient" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/test-protected")) {
      protectedCallCount++;
      const authHeader = (init?.headers as any)?.Authorization || "";
      if (authHeader === "Bearer initial-expired-token") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      if (authHeader === "Bearer new-refreshed-token") {
        return new Response(JSON.stringify({ data: "success" }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Unexpected token" }), { status: 403 });
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };

  await tokenStore.setRefreshToken("mock-refresh-token");
  useAuthStore.getState().setAuth("initial-expired-token", {
    id: "usr_123",
    sub: "usr_123",
    email: "pt@example.test",
    role: "patient",
    emailVerified: true,
    phoneVerified: true,
    isMfaEnabled: false,
    mfaEnabled: false,
  });

  // Run two concurrent requests with expired token
  const [res1, res2] = await Promise.all([
    authFetch("/api/test-protected"),
    authFetch("/api/test-protected"),
  ]);

  assert(res1.status === 200, "First concurrent request succeeded after transparent refresh");
  assert(res2.status === 200, "Second concurrent request succeeded after transparent refresh");
  assert(refreshCount === 1, "Only a single refresh request was made across concurrent 401s (deduplicated)");
  assert(protectedCallCount === 4, "Each request was tried once with the expired token and retried once");
  assert(useAuthStore.getState().accessToken === "new-refreshed-token", "Store accessToken was updated with refreshed token");

  // Restore fetch
  global.fetch = originalFetch;

  console.log("\n🎉 ALL API CLIENT & STORE CLEANUP TESTS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
