import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DefaultTheme } from "expo-router/react-navigation";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useAuthStore } from "@/features/auth/auth-store";
import { tokenStore } from "@/lib/token-store";
import { authApi } from "@/features/auth/auth-api";
import { useAppLockStore } from "@/features/app-lock/app-lock-store";
import { AppLockScreen } from "@/features/app-lock/app-lock-screen";
import { useNotificationManager } from "@/features/notifications/notification-hooks";

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_STRIPE_PK ?? "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    },
  },
});

// ─── Notification registrar ──────────────────────────────────────────────────
// Rendered inside QueryClientProvider: useNotificationManager uses React Query
// hooks, so it must live below the provider (not in RootLayout's own body).
function NotificationSetup() {
  const { setupNotifications } = useNotificationManager();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken || __DEV__) return;
    setupNotifications().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────
// Hydrates auth state from SecureStore before rendering any route.
// Shows nothing (splash continues) until hydration is complete.
export default function RootLayout() {
  const { isHydrating, setHydrating } = useAuthStore();
  const { setBackgrounded, setForegrounded, isLocked } = useAppLockStore();

  // ── Hydrate auth on cold start ──────────────────────────────────────────
  // Attempt a silent refresh using the stored refresh token.
  // If it fails, user is considered logged out — no flash of wrong screen.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const refreshToken = await tokenStore.getRefreshToken();
        if (refreshToken) {
          // Attempt silent refresh using stored refresh token
          await authApi.refresh();
        }
      } catch {
        // Refresh failed — stay logged out
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [setHydrating]);

  // ── App state monitoring for app lock ───────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setBackgrounded();
      } else if (nextAppState === 'active') {
        setForegrounded();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [setBackgrounded, setForegrounded]);

  // ── Gate on hydration — splash continues while this is true ─────────────
  if (isHydrating) return null;

  // ── Show app lock screen if locked ───────────────────────────────────────
  if (isLocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.pavdental">
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={DefaultTheme}>
              <StatusBar style="dark" />
              <NotificationSetup />
              <AppLockScreen />
            </ThemeProvider>
          </QueryClientProvider>
        </StripeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.pavdental">
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={DefaultTheme}>
              <StatusBar style="dark" />
              <NotificationSetup />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(patient)" />
                <Stack.Screen name="(clinician)" />
                <Stack.Screen name="(operator)" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ThemeProvider>
          </QueryClientProvider>
        </StripeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

