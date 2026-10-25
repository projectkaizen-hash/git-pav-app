import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText, Input, Button, AppIcon, SwipeToStart } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { authApi } from "@/features/auth/auth-api";
import { useAuthStore } from "@/features/auth/auth-store";
import { getMobilePortalPath } from "@/features/auth/auth-routing";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    const { user, accessToken } = useAuthStore.getState();
    if (user && accessToken) {
      router.push(getMobilePortalPath(user.role) as any);
      return;
    }
    setShowEmailSheet(true);
  };

  const handleContinueWithEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await authApi.checkEmail(trimmedEmail);

      if (result.exists) {
        router.push({
          pathname: "/(auth)/sign-in",
          params: { email: trimmedEmail },
        });
      } else {
        router.push({
          pathname: "/(auth)/sign-up",
          params: { email: trimmedEmail },
        });
      }
    } catch (err: any) {
      setError(err?.message || "Could not verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Full-bleed photography */}
      <Image
        source={require("../../../assets/images/welcome-hero.jpg")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
      />

      {/* Dark gradient for text readability and cinematic depth */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.55)",
          "transparent",
          "rgba(0,0,0,0.3)",
          "rgba(0,0,0,0.92)",
        ]}
        locations={[0, 0.25, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* Top Header: Logo + Menu pill */}
        <View style={styles.topHeader}>
          <View style={styles.brandGroup}>
            <View style={styles.brandIconBox}>
              <AppIcon name="plus" size={16} color={colors.alwaysWhite} />
            </View>
            <ThemedText variant="headline" style={styles.brandName}>
              Pav Dental
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with email"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowEmailSheet((prev) => !prev);
            }}
            style={styles.pillBtn}
          >
            <ThemedText variant="caption" style={styles.pillBtnText}>
              {showEmailSheet ? "Back" : "Sign In"}
            </ThemedText>
          </Pressable>
        </View>

        {/* Bottom Container: Either the Hero Swipe to Start, or the Email Sheet */}
        {!showEmailSheet ? (
          <View style={[styles.bottomContent, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
            <ThemedText variant="largeTitle" style={styles.heroTitle}>
              Oral Wellness{"\n"}& Aesthetic Dentistry
            </ThemedText>

            <ThemedText variant="body" style={styles.heroSub}>
              Track daily brushing habits and improve overall oral care.
            </ThemedText>

            {/* Slider pill */}
            <View style={styles.sliderWrap}>
              <SwipeToStart label="Swipe To Start" onComplete={handleStart} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with email address"
              onPress={() => setShowEmailSheet(true)}
              style={styles.emailOption}
            >
              <ThemedText variant="caption" style={styles.emailOptionText}>
                Or sign in with email address ›
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetContainer}
          >
            <ScrollView
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
            >
              <ThemedText variant="largeTitle" style={styles.sheetTitle}>
                Welcome back
              </ThemedText>
              <ThemedText variant="subhead" style={styles.sheetSub}>
                Enter your email to sign in or create an account.
              </ThemedText>

              {error ? (
                <View style={styles.errorBox}>
                  <ThemedText variant="caption" style={styles.errorText}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              {/* Dev Quick Fillers */}
              {__DEV__ ? (
                <View style={styles.demoPills}>
                  {[
                    { label: "Patient", email: "patient@pavdental.com" },
                    { label: "New User", email: `user_${Date.now().toString().slice(-4)}@pavdental.com` },
                  ].map((demo) => (
                    <Pressable
                      key={demo.label}
                      accessibilityRole="button"
                      accessibilityLabel={`Fill ${demo.label} demo account`}
                      onPress={() => {
                        setEmail(demo.email);
                        if (error) setError(null);
                      }}
                      style={styles.demoPill}
                    >
                      <ThemedText variant="caption" style={styles.demoPillText}>
                        {demo.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Input
                label="Email address"
                placeholder="name@example.co.uk"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
              />

              <Button
                title="Continue"
                size="lg"
                loading={loading}
                onPress={handleContinueWithEmail}
                style={styles.continueBtn}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomContent: {
    gap: spacing.md,
    marginTop: "auto",
    paddingHorizontal: spacing.lg,
  },
  brandGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  brandIconBox: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: radius.md,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  brandName: {
    color: colors.alwaysWhite,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  container: {
    backgroundColor: colors.alwaysBlack,
    flex: 1,
  },
  continueBtn: {
    marginTop: spacing.md,
  },
  demoPill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  demoPillText: {
    color: colors.alwaysWhite,
    fontWeight: "600",
  },
  demoPills: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  emailOption: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  emailOptionText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  heroSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    lineHeight: 22,
  },
  heroTitle: {
    color: colors.alwaysWhite,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  pillBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillBtnText: {
    color: colors.alwaysWhite,
    fontWeight: "600",
  },
  safe: {
    flex: 1,
    justifyContent: "space-between",
  },
  sheetContainer: {
    backgroundColor: "rgba(20, 20, 24, 0.94)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: "auto",
    padding: spacing.lg,
  },
  sheetScroll: {
    gap: spacing.sm,
  },
  sheetSub: {
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    color: colors.alwaysWhite,
    fontSize: 26,
    fontWeight: "700",
  },
  sliderWrap: {
    marginTop: spacing.xs,
  },
  topHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
