import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { ThemedText, Input, Button, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { checkVanCoverage } from "@/features/booking/booking-api";
import { fetchVanAvailability } from "@/features/van/van-api";
import { VanAvailability } from "@/features/van/van-types";
import { useVanStore } from "@/features/van/van-store";

export default function VanServiceAreaScreen() {
  const router = useRouter();
  const setLocationCoverage = useVanStore((s) => s.setLocationCoverage);

  const [postcode, setPostcode] = useState("");
  const [checked, setChecked] = useState(false);
  const [coverageResult, setCoverageResult] = useState<any>(null);
  const [availability, setAvailability] = useState<VanAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [usingGPS, setUsingGPS] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === "web") {
      setLocationPermission("granted");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);

    if (status === "granted") {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setCurrentLocation(coords);
      checkCoverageWithGPS(coords);
    } catch (error) {
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please enter your postcode manually."
      );
    }
  };

  const checkCoverageWithGPS = async (coords: { lat: number; lng: number }) => {
    setLoading(true);
    setUsingGPS(true);
    try {
      const result = await checkVanCoverage({
        lat: coords.lat,
        lng: coords.lng,
      });
      setCoverageResult(result);
      setChecked(true);

      let avail: VanAvailability | null = null;
      if (result.isCovered) {
        try {
          avail = await fetchVanAvailability(coords.lat, coords.lng);
          setAvailability(avail);
        } catch {
          // non-fatal
        }
      }

      setLocationCoverage({
        postcode: result.matchedSector || "SW1A 1AA",
        lat: coords.lat,
        lng: coords.lng,
        isCovered: result.isCovered,
        availability: avail,
      });
    } catch (error) {
      Alert.alert("Coverage Check Failed", "Unable to verify coverage. Please try again.");
      setChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCoverage = async () => {
    if (!postcode.trim()) {
      Alert.alert("Missing Postcode", "Please enter a UK postcode to check coverage.");
      return;
    }

    setLoading(true);
    setUsingGPS(false);
    try {
      const result = await checkVanCoverage({ postcode });
      setCoverageResult(result);
      setChecked(true);

      // Coordinates for London center/sector fallback
      const lat = 51.5074;
      const lng = -0.1278;
      let avail: VanAvailability | null = null;

      if (result.isCovered) {
        try {
          avail = await fetchVanAvailability(lat, lng);
          setAvailability(avail);
        } catch {
          // non-fatal
        }
      }

      setLocationCoverage({
        postcode: postcode.toUpperCase().trim(),
        lat,
        lng,
        isCovered: result.isCovered,
        availability: avail,
      });
    } catch (error) {
      Alert.alert("Coverage Check Failed", "Unable to verify coverage. Please try again.");
      setChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUseGPS = () => {
    if (locationPermission === "granted") {
      getCurrentLocation();
    } else {
      requestLocationPermission();
    }
  };

  const handleChangeLocation = () => {
    setCurrentLocation(null);
    setUsingGPS(false);
    setChecked(false);
    setCoverageResult(null);
    setAvailability(null);
    setPostcode("");
  };

  const handleProceed = () => {
    router.push("/(patient)/van/access-details" as any);
  };

  const isCovered = coverageResult?.isCovered ?? false;
  const isVanOnline = availability?.available ?? false;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Live Van Dispatch Area
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Enter your location to verify coverage and view live estimated arrival times from our active surgery van.
          </ThemedText>
        </View>

        {/* GPS Option */}
        {Platform.OS !== "web" && (
          <View style={styles.gpsSection}>
            <Button
              title={currentLocation ? "📍 Refresh GPS Location" : "📍 Enable GPS Location"}
              variant="secondary"
              onPress={handleUseGPS}
              disabled={loading}
            />
            {currentLocation && (
              <ThemedText variant="caption" style={styles.locationText}>
                Coordinates: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </ThemedText>
            )}
          </View>
        )}

        {/* Manual Postcode Option */}
        <View style={styles.searchBox}>
          <ThemedText variant="subhead" style={styles.orText}>
            {Platform.OS !== "web" ? "Or enter UK postcode manually:" : "Enter UK postcode:"}
          </ThemedText>
          <Input
            label="Postcode"
            placeholder="e.g. SW1A 1AA or W1G 9PQ"
            autoCapitalize="characters"
            value={postcode}
            onChangeText={(val) => {
              setPostcode(val);
              setChecked(false);
              setCoverageResult(null);
              setAvailability(null);
              setUsingGPS(false);
            }}
          />
          <Button
            title={loading ? "Checking Dispatch Status..." : "Check Live Van Availability"}
            variant="secondary"
            loading={loading}
            onPress={handleCheckCoverage}
          />
        </View>

        {/* Results */}
        {checked && (
          isCovered ? (
            <Card elevation="raised" style={styles.coveredCard}>
              <View style={styles.badgeRow}>
                <Badge
                  label={isVanOnline ? "⚡ VAN ON SHIFT" : "○ VAN OFF DUTY"}
                  variant={isVanOnline ? "success" : "default"}
                />
                <ThemedText variant="caption" style={styles.vanUnit}>
                  🚐 {coverageResult?.assignedVan || "Pav Dental Van #1"}
                </ThemedText>
              </View>

              {/* Live Dispatch Status */}
              {isVanOnline ? (
                <View style={styles.dispatchOnlineBanner}>
                  <ThemedText variant="headline" style={styles.dispatchEtaTitle}>
                    ⚡ Estimated Arrival: {availability?.etaLabel || "~20–30 min"}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.dispatchEtaSub}>
                    {availability?.queueLength === 0
                      ? "Van is ready to drive directly to your location."
                      : `${availability?.queueLength} stop(s) ahead in queue. Live tracking updates dynamically.`}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.dispatchOfflineBanner}>
                  <ThemedText variant="headline" style={styles.offlineTitle}>
                    No Van Currently on Duty in Your Area
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.offlineSub}>
                    Our surgery van operates live dispatch shifts. No operator is currently online in this polygon.
                  </ThemedText>
                  <View style={styles.alternativeButtons}>
                    <Button
                      title="Book Central Practice Clinic ›"
                      variant="primary"
                      size="sm"
                      onPress={() => router.push("/(patient)/booking/clinic-picker" as any)}
                    />
                    <Button
                      title="Instant Video Consult (15 min) ›"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push("/(patient)/video/intake" as any)}
                    />
                  </View>
                </View>
              )}

              <ThemedText variant="caption" style={styles.coveredBody}>
                {coverageResult?.message || "Our dental van can visit your private driveway, curb parking, or designated visitor bay."}
              </ThemedText>

              <View style={styles.features}>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ Full GDC Clinical Surgical Suite on Board
                </ThemedText>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ Digital Low-Dose X-Ray & AirFlow Hygiene
                </ThemedText>
                <ThemedText variant="caption" style={styles.featItem}>
                  ✓ Live GPS Tracking & Automatic Phase Updates
                </ThemedText>
              </View>
            </Card>
          ) : (
            <Card style={styles.outOfAreaCard}>
              <ThemedText variant="headline" style={styles.outTitle}>
                Outside Van Coverage Sector
              </ThemedText>
              <ThemedText variant="caption" style={styles.outBody}>
                Our mobile surgery van does not currently cover this postcode. You can book an appointment at our central clinic practice or schedule a video consult.
              </ThemedText>
              <View style={styles.alternativeButtons}>
                <Button
                  title="Try Different Postcode"
                  variant="secondary"
                  size="sm"
                  onPress={handleChangeLocation}
                />
                <Button
                  title="View Clinics Instead"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push("/(patient)/booking/clinic-picker" as any)}
                />
              </View>
            </Card>
          )
        )}
      </ScrollView>

      {/* Action Footer */}
      {checked && isCovered && isVanOnline && (
        <View style={styles.footer}>
          <Button
            title="Continue to Access & Parking Details ›"
            size="lg"
            onPress={handleProceed}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alternativeButtons: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
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
    marginTop: spacing.xs,
  },
  coveredCard: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
    borderWidth: 1.5,
    gap: spacing.xs,
    padding: spacing.md,
  },
  dispatchEtaSub: {
    color: colors.brand,
    marginTop: 2,
  },
  dispatchEtaTitle: {
    color: colors.brand,
    fontWeight: "700",
  },
  dispatchOfflineBanner: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    gap: 4,
    marginVertical: spacing.xs,
    padding: spacing.sm,
  },
  dispatchOnlineBanner: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.brand,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 2,
    marginVertical: spacing.xs,
    padding: spacing.sm,
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
  gpsSection: {
    gap: spacing.xs,
  },
  header: {
    gap: spacing.xxs,
  },
  locationText: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  offlineSub: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  offlineTitle: {
    color: colors.label,
  },
  orText: {
    color: colors.secondaryLabel,
    marginTop: spacing.xs,
  },
  outBody: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  outOfAreaCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.sm,
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
