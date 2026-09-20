import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { ThemedText, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Hero / illustration area */}
        <View style={styles.hero}>
          {/* TODO: branded illustration */}
          <View style={styles.logoMark} />
          <ThemedText variant="largeTitle" style={styles.headline}>
            Your dental care,{"\n"}wherever you are.
          </ThemedText>
          <ThemedText variant="subhead" style={styles.sub}>
            Book a van visit, video consult, or clinic appointment — all in one place.
          </ThemedText>
        </View>

        {/* CTAs — thumb zone */}
        <View style={styles.actions}>
          <Button
            title="Get started"
            size="lg"
            onPress={() => router.push("/(auth)/sign-up")}
          />
          <Button
            title="I already have an account"
            variant="ghost"
            size="lg"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  headline: {
    color: colors.label,
    textAlign: "center",
  },
  hero: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
  },
  logoMark: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 24,
    height: 80,
    width: 80,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  sub: {
    color: colors.secondaryLabel,
    paddingHorizontal: spacing.xl,
    textAlign: "center",
  },
});

