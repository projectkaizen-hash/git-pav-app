import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { checkVanCoverage } from "@/features/booking/booking-api";

export default function VanServiceAreaScreen() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [checked, setChecked] = useState(false);
  const [coverageResult, setCoverageResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckCoverage = async () => {
    if (!postcode.trim()) {
      Alert.alert("Missing Postcode", "Please enter a UK postcode to check coverage.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await checkVanCoverage(postcode);
      setCoverageResult(result);
      setChecked(true);
    } catch (error) {
      Alert.alert("Coverage Check Failed", "Unable to verify coverage. Please try again.");
      setChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    router.push("/(patient)/van/access-details" as any);
  };

  const isCovered = coverageResult?.isCovered ?? false;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Mobile Van Service Area
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Enter your UK postcode to check if our mobile dental surgery van operates in your neighbourhood.
          </ThemedText>
        </View>

        {/* Postcode Search Box */}
        <View style={styles.searchBox}>
          <Input
            label="Enter UK Postcode"
            placeholder="e.g. SW1A 1AA or W1G 9PQ"
            autoCapitalize="characters"
            value={postcode}
            onChangeText={(val) => {
              setPostcode(val);
              setChecked(false);
              setCoverageResult(null);
            }}
          />
          <Button
            title={loading ? "Checking..." : "Verify Coverage"}
            variant="secondary"
            loading={loading}
            onPress={handleCheckCoverage}
          />
        </View>

        {/* Coverage Status Card */}
        {checked ? (
          isCovered ? (
            <Card elevation="raised" style={styles.coveredCard}>
              <View style={styles.badgeRow}>
                <Badge label="Van Service Active" variant="success" />
                <ThemedText variant="caption" style={styles.vanUnit}>
                  🚐 {coverageResult?.assignedVan || "Pav Dental Van #1"} ({coverageResult?.activeSector || "Central London Sector"})
                </ThemedText>
              </View>

              <ThemedText variant="headline" style={styles.coveredTitle}>
                Great news! Van visits are available for {postcode.toUpperCase()}.
              </ThemedText>

              <ThemedText variant="subhead" style={styles.coveredBody}>
                {coverageResult?.message || "Our dental van can visit your private driveway, curb parking, or designated corporate visitor bay."}
              </ThemedText>

              <View style={styles.features}>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ Fully equipped GDC clinical surgical suite
                </ThemedText>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ Digital low-dose X-ray on board
                </ThemedText>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ AirFlow hygiene & gentle fillings
                </ThemedText>
              </View>
            </Card>
          ) : (
            <Card style={styles.outOfAreaCard}>
              <ThemedText variant="headline" style={styles.outTitle}>
                Outside Van Territory
              </ThemedText>
              <ThemedText variant="caption" style={styles.outBody}>
                {coverageResult?.message || `Our mobile surgery van does not currently cover ${postcode.toUpperCase()}. You can still book an instant Video Consultation or visit our central clinic practice.`}
              </ThemedText>
              <Button
                title="View Central Clinics Instead"
                variant="secondary"
                size="sm"
                onPress={() => router.push("/(patient)/booking/clinic-picker" as any)}
              />
            </Card>
          )
        ) : null}
      </ScrollView>

      {/* Action Footer */}
      {checked && isCovered ? (
        <View style={styles.footer}>
          <Button
            title="Continue to Access Details ›"
            size="lg"
            onPress={handleProceed}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  coveredBody: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  coveredCard: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
    borderWidth: 1.5,
    gap: spacing.xs,
    padding: spacing.md,
  },
  coveredTitle: {
    color: colors.label,
    marginTop: 2,
  },
  featItem: {
    color: colors.brand,
    fontWeight: "600",
  },
  features: {
    borderTopColor: colors.brand,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  outBody: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  outOfAreaCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  outTitle: {
    color: colors.label,
  },
  searchBox: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  vanUnit: {
    color: colors.brand,
    fontWeight: "600",
  },
});

