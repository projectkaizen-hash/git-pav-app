import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, Card } from "@/components";
import { colors, spacing } from "@/theme";

export default function VanAccessDetailsScreen() {
  const router = useRouter();
  const [parkingType, setParkingType] = useState<"driveway" | "street" | "private">("driveway");
  const [hasGatedAccess, setHasGatedAccess] = useState(false);
  const [gateCode, setGateCode] = useState("");
  const [hasExternalPower, setHasExternalPower] = useState(false);
  const [parkingNotes, setParkingNotes] = useState("");

  const handleContinue = () => {
    router.push("/(patient)/van/slots" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Van Parking & Property Access
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Our clinical vehicle is an extended wheelbase Mercedes Sprinter (7.4m length, 2.9m height).
          </ThemedText>
        </View>

        {/* Parking Type Selector */}
        <View style={styles.section}>
          <ThemedText variant="headline">Where will the van park?</ThemedText>
          <View style={styles.optionGroup}>
            <Card
              padding="sm"
              style={[styles.optionCard, parkingType === "driveway" && styles.optionCardActive]}
            >
              <ThemedText
                variant="body"
                style={[styles.optionTitle, parkingType === "driveway" && styles.optionTitleActive]}
                onPress={() => setParkingType("driveway")}
              >
                🏠 Private Driveway (Recommended)
              </ThemedText>
              <ThemedText variant="caption" style={styles.optionSub}>
                Sufficient space for a 7.4m vehicle off the main road.
              </ThemedText>
            </Card>

            <Card
              padding="sm"
              style={[styles.optionCard, parkingType === "street" && styles.optionCardActive]}
            >
              <ThemedText
                variant="body"
                style={[styles.optionTitle, parkingType === "street" && styles.optionTitleActive]}
                onPress={() => setParkingType("street")}
              >
                🛣 On-Street Kerbside Parking
              </ThemedText>
              <ThemedText variant="caption" style={styles.optionSub}>
                Resident permit or visitor parking voucher will be provided.
              </ThemedText>
            </Card>

            <Card
              padding="sm"
              style={[styles.optionCard, parkingType === "private" && styles.optionCardActive]}
            >
              <ThemedText
                variant="body"
                style={[styles.optionTitle, parkingType === "private" && styles.optionTitleActive]}
                onPress={() => setParkingType("private")}
              >
                🏢 Corporate / Office Visitor Bay
              </ThemedText>
              <ThemedText variant="caption" style={styles.optionSub}>
                Pre-authorized commercial or industrial parking area.
              </ThemedText>
            </Card>
          </View>
        </View>

        {/* Security / Gate Code */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <ThemedText variant="headline">Gated Entrance / Security Barrier</ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Does our van driver require an intercom, buzzer, or gate code?
            </ThemedText>
          </View>
          <Switch
            value={hasGatedAccess}
            onValueChange={setHasGatedAccess}
            trackColor={{ true: colors.brand, false: colors.separator }}
          />
        </View>

        {hasGatedAccess ? (
          <Input
            label="Gate / Access Code"
            placeholder="e.g. #1402 or 'Call flat 4 on arrival'"
            value={gateCode}
            onChangeText={setGateCode}
          />
        ) : null}

        {/* Self-Powered Van Note */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <ThemedText variant="headline">Mains Electric Outlet Available (Optional)</ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Our van carries clean lithium batteries, but plugging in reduces generator noise.
            </ThemedText>
          </View>
          <Switch
            value={hasExternalPower}
            onValueChange={setHasExternalPower}
            trackColor={{ true: colors.brand, false: colors.separator }}
          />
        </View>

        {/* Access Notes */}
        <Input
          label="Additional Driver Instructions"
          placeholder="e.g. Low hanging tree branches, one-way street, narrow turning circle"
          multiline
          numberOfLines={3}
          value={parkingNotes}
          onChangeText={setParkingNotes}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Select Van Arrival Time ›"
          size="lg"
          onPress={handleContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  optionCard: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
  },
  optionCardActive: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  optionGroup: {
    gap: spacing.xs,
  },
  optionSub: {
    color: colors.secondaryLabel,
  },
  optionTitle: {
    color: colors.label,
    fontWeight: "600",
  },
  optionTitleActive: {
    color: colors.brand,
    fontWeight: "700",
  },
  section: {
    gap: spacing.xs,
  },
  sub: {
    color: colors.secondaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  switchInfo: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  title: {
    color: colors.label,
  },
});

