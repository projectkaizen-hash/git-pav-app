import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Button, Card } from "@/components";
import { colors, spacing } from "@/theme";
import { checkVanCoverage } from "@/features/booking/booking-api";

export default function ChangeLocationScreen() {
  const router = useRouter();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckLocation = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert("Invalid Coordinates", "Please enter valid latitude and longitude values.");
      return;
    }

    if (latNum < -90 || latNum > 90) {
      Alert.alert("Invalid Latitude", "Latitude must be between -90 and 90.");
      return;
    }

    if (lngNum < -180 || lngNum > 180) {
      Alert.alert("Invalid Longitude", "Longitude must be between -180 and 180.");
      return;
    }

    setLoading(true);
    try {
      const result = await checkVanCoverage({ lat: latNum, lng: lngNum });
      
      if (result.isCovered) {
        Alert.alert(
          "Location Valid",
          "This location is within our van service area!",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Continue", 
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert(
          "Outside Service Area",
          "This location is not currently covered by our van service. Please try a different location."
        );
      }
    } catch (error) {
      Alert.alert("Check Failed", "Unable to verify location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    // This would trigger GPS location check
    router.back();
  };

  const popularLocations = [
    { name: "Central London", lat: 51.5074, lng: -0.1278 },
    { name: "Westminster", lat: 51.5007, lng: -0.1246 },
    { name: "Kensington", lat: 51.4990, lng: -0.1938 },
    { name: "Chelsea", lat: 51.4875, lng: -0.1687 },
    { name: "Hammersmith", lat: 51.4926, lng: -0.2299 },
  ];

  const handleSelectPopularLocation = (location: typeof popularLocations[0]) => {
    setLat(location.lat.toString());
    setLng(location.lng.toString());
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Change Location
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Enter coordinates or select a popular location to check van service availability.
          </ThemedText>
        </View>

        {/* GPS Option */}
        <Card style={styles.card}>
          <Button
            title="📍 Use Current GPS Location"
            variant="secondary"
            onPress={handleUseCurrentLocation}
          />
        </Card>

        {/* Manual Coordinates */}
        <Card style={styles.card}>
          <ThemedText variant="headline" style={styles.cardTitle}>
            Enter Coordinates
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Latitude (e.g. 51.5074)"
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Longitude (e.g. -0.1278)"
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
            />
          </View>
          <Button
            title={loading ? "Checking..." : "Check Coverage"}
            variant="secondary"
            loading={loading}
            onPress={handleCheckLocation}
          />
        </Card>

        {/* Popular Locations */}
        <Card style={styles.card}>
          <ThemedText variant="headline" style={styles.cardTitle}>
            Popular London Locations
          </ThemedText>
          <View style={styles.locationsList}>
            {popularLocations.map((location) => (
              <Button
                key={location.name}
                title={location.name}
                variant="ghost"
                size="sm"
                onPress={() => handleSelectPopularLocation(location)}
              />
            ))}
          </View>
        </Card>

        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.label,
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
  header: {
    gap: spacing.xxs,
  },
  input: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    flex: 1,
    padding: spacing.md,
    color: colors.label,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  locationsList: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});