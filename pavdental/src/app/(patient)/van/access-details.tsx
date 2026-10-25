import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText, Input, Button, Card, AppIcon } from "@/components";
import { colors, spacing } from "@/theme";
import { useVanStore } from "@/features/van/van-store";
import { fetchServices } from "@/features/van/van-api";
import { Service } from "@/features/van/van-types";

export default function VanAccessDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useVanStore();

  const [addressLine1, setAddressLine1] = useState(store.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(store.addressLine2 || "");
  const [city, setCity] = useState(store.city || "London");
  const [parkingType, setParkingType] = useState<
    "private_driveway" | "permit_bay" | "visitor" | "other"
  >(store.parkingType || "private_driveway");
  const [hasGatedAccess, setHasGatedAccess] = useState(!!store.gateCode);
  const [gateCode, setGateCode] = useState(store.gateCode || "");
  const [accessNotes, setAccessNotes] = useState(store.accessNotes || "");

  // Fetch services from API
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(store.serviceId || "");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const vanServices = await fetchServices("van");
      setServices(vanServices);
      
      // Set default service if none selected or if the stored service is not available
      if (!selectedServiceId || !vanServices.find(s => s.id === selectedServiceId)) {
        if (vanServices.length > 0) {
          setSelectedServiceId(vanServices[0].id);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load available services. Please try again.");
      console.error("Failed to load services:", error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleContinue = () => {
    if (!addressLine1.trim()) {
      Alert.alert("Missing Address", "Please enter your street address for the van arrival.");
      return;
    }

    const chosenService = services.find((s) => s.id === selectedServiceId) || services[0];
    if (!chosenService) {
      Alert.alert("No Service Selected", "We couldn't load the van services. Please try again.");
      return;
    }

    store.setService({
      serviceId: chosenService.id,
      serviceName: chosenService.name,
      servicePricePence: chosenService.pricePence,
      serviceDurationMinutes: chosenService.durationMinutes,
      serviceDepositPence: chosenService.depositPence ?? null,
    });

    store.setAccessDetails({
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim() || "London",
      parkingType,
      gateCode: hasGatedAccess ? gateCode.trim() : undefined,
      accessNotes: accessNotes.trim() || undefined,
    });

    // In live dispatch mode, bypass calendar slots and route directly to review & confirm!
    router.push("/(patient)/van/confirm" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Van Parking & Property Access
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Our clinical surgical suite is a Mercedes Sprinter (7.4m length). Please provide arrival and parking details.
          </ThemedText>
        </View>

        {/* Destination Address */}
        <Card elevation="raised" style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <AppIcon name="mapPin" size={18} color={colors.ink} />
            <ThemedText variant="headline">Destination Address</ThemedText>
          </View>
          <Input
            label="Street Address"
            placeholder="e.g. 14 Harley Street"
            value={addressLine1}
            onChangeText={setAddressLine1}
          />
          <Input
            label="Apartment, suite, or flat (optional)"
            placeholder="e.g. Flat 3B"
            value={addressLine2}
            onChangeText={setAddressLine2}
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Postcode"
                value={store.postcode || "SW1A 1AA"}
                editable={false}
              />
            </View>
          </View>
        </Card>

        {/* Treatment Selection */}
        <View style={styles.section}>
          <ThemedText variant="headline">Select Clinical Treatment</ThemedText>
          {loadingServices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.ink} />
              <ThemedText variant="caption" style={styles.loadingText}>
                Loading available services...
              </ThemedText>
            </View>
          ) : services.length === 0 ? (
            <Card style={styles.errorCard}>
              <ThemedText variant="caption" style={styles.errorText}>
                No services available for van visits at this time.
              </ThemedText>
            </Card>
          ) : (
            <View style={styles.optionGroup}>
              {services.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <Pressable
                    key={srv.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedServiceId(srv.id)}
                  >
                    <Card
                      padding="sm"
                      style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                    >
                      <View style={styles.serviceRow}>
                        <ThemedText
                          variant="headline"
                          style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}
                        >
                          {srv.name}
                        </ThemedText>
                        <ThemedText variant="mono" style={styles.priceText}>
                          £{(srv.pricePence / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" style={styles.serviceDesc}>
                        {srv.description} · {srv.durationMinutes} min visit
                      </ThemedText>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Parking Type Selector */}
        <View style={styles.section}>
          <ThemedText variant="headline">Where will the surgical van park?</ThemedText>
          <View style={styles.optionGroup}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: parkingType === "private_driveway" }}
              onPress={() => setParkingType("private_driveway")}
            >
              <Card
                padding="sm"
                style={[styles.optionCard, parkingType === "private_driveway" && styles.optionCardActive]}
              >
                <ThemedText
                  variant="body"
                  style={[styles.optionTitle, parkingType === "private_driveway" && styles.optionTitleActive]}
                >
                  Private driveway (recommended)
                </ThemedText>
                <ThemedText variant="caption" style={styles.optionSub}>
                  Sufficient space for a 7.4m vehicle off the main road.
                </ThemedText>
              </Card>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: parkingType === "permit_bay" }}
              onPress={() => setParkingType("permit_bay")}
            >
              <Card
                padding="sm"
                style={[styles.optionCard, parkingType === "permit_bay" && styles.optionCardActive]}
              >
                <ThemedText
                  variant="body"
                  style={[styles.optionTitle, parkingType === "permit_bay" && styles.optionTitleActive]}
                >
                  On-street kerbside permit bay
                </ThemedText>
                <ThemedText variant="caption" style={styles.optionSub}>
                  Resident permit or visitor voucher will be provided on arrival.
                </ThemedText>
              </Card>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: parkingType === "visitor" }}
              onPress={() => setParkingType("visitor")}
            >
              <Card
                padding="sm"
                style={[styles.optionCard, parkingType === "visitor" && styles.optionCardActive]}
              >
                <ThemedText
                  variant="body"
                  style={[styles.optionTitle, parkingType === "visitor" && styles.optionTitleActive]}
                >
                  Corporate / office visitor parking bay
                </ThemedText>
                <ThemedText variant="caption" style={styles.optionSub}>
                  Pre-authorized commercial or industrial parking area.
                </ThemedText>
              </Card>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: parkingType === "other" }}
              onPress={() => setParkingType("other")}
            >
              <Card
                padding="sm"
                style={[styles.optionCard, parkingType === "other" && styles.optionCardActive]}
              >
                <ThemedText
                  variant="body"
                  style={[styles.optionTitle, parkingType === "other" && styles.optionTitleActive]}
                >
                  Other safe kerb / loading bay
                </ThemedText>
                <ThemedText variant="caption" style={styles.optionSub}>
                  Legal stopping area with safe pedestrian and clinical access.
                </ThemedText>
              </Card>
            </Pressable>
          </View>
        </View>

        {/* Security / Gate Code */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <ThemedText variant="headline">Gated Entrance / Intercom Code</ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Does our team require a buzzer, door code or security gate pass?
            </ThemedText>
          </View>
          <Switch
            value={hasGatedAccess}
            onValueChange={setHasGatedAccess}
            trackColor={{ true: colors.ink, false: colors.separator }}
            accessibilityRole="switch"
            accessibilityLabel="Gated Entrance or Intercom Code"
          />
        </View>

        {hasGatedAccess && (
          <Input
            label="Gate / Buzzer Instructions"
            placeholder="e.g. #1402 or 'Ring Flat 4 on arrival'"
            value={gateCode}
            onChangeText={setGateCode}
          />
        )}

        {/* Driver Instructions */}
        <Input
          label="Additional Driver Instructions"
          placeholder="e.g. One-way road, low hanging branches, narrow turning circle"
          multiline
          numberOfLines={2}
          value={accessNotes}
          onChangeText={setAccessNotes}
        />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title="Review & Dispatch Van ›"
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
  errorCard: {
    backgroundColor: colors.secondaryBackground,
    padding: spacing.md,
  },
  errorText: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  flex1: {
    flex: 1,
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
  loadingContainer: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.secondaryLabel,
  },
  optionCard: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
  },
  optionCardActive: {
    backgroundColor: colors.inkSubtle,
    borderColor: colors.ink,
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
    color: colors.ink,
    fontWeight: "700",
  },
  priceText: {
    color: colors.ink,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  sectionCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  serviceCard: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  serviceCardActive: {
    backgroundColor: colors.inkSubtle,
    borderColor: colors.ink,
  },
  serviceDesc: {
    color: colors.secondaryLabel,
  },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  serviceTitle: {
    color: colors.label,
    flex: 1,
  },
  serviceTitleActive: {
    color: colors.ink,
    fontWeight: "700",
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
