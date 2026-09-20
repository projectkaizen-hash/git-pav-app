import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { CardField, useStripe, CardFieldInput } from "@stripe/stripe-react-native";
import { ThemedText, Card, Badge, Button } from "@/components";
import {
  usePaymentMethods,
  useRemovePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
} from "@/features/account/account-hooks";
import { accountApi } from "@/features/account/account-api";
import { colors, spacing } from "@/theme";
import { TouchableOpacity } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

export default function PaymentMethodsScreen() {
  const { data: paymentMethods = [] } = usePaymentMethods();
  const removeMethod = useRemovePaymentMethodMutation();
  const setDefault = useSetDefaultPaymentMethodMutation();
  const { confirmSetupIntent } = useStripe();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCard = async () => {
    if (!cardDetails?.complete) {
      Alert.alert("Incomplete Card", "Please enter all card details.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Ask the server for a SetupIntent client secret
      const { clientSecret } = await accountApi.createSetupIntent();

      // 2. Let Stripe tokenise the card — raw PAN never leaves the SDK
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: cardHolder ? { name: cardHolder } : undefined,
        },
      });

      if (error) {
        Alert.alert("Card Error", error.message);
        setIsSaving(false);
        return;
      }

      // 3. Tell our server to store the resulting paymentMethodId
      if (setupIntent?.paymentMethodId) {
        await accountApi.attachPaymentMethod(setupIntent.paymentMethodId);
        queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // optional
      }

      setModalVisible(false);
      setCardDetails(null);
      setCardHolder("");
      Alert.alert("Card Added", "Your payment method has been saved securely.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not save payment card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (id: string, isDefault: boolean) => {
    if (isDefault && paymentMethods.length > 1) {
      Alert.alert("Cannot Remove Default", "Please set another payment method as default before removing this one.");
      return;
    }

    Alert.alert("Remove Payment Method?", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMethod.mutateAsync(id);
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              // optional
            }
          } catch {
            Alert.alert("Error", "Failed to remove payment card.");
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync(id);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // optional
      }
    } catch {
      Alert.alert("Error", "Could not update default card.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <ThemedText variant="subhead" style={styles.headerSub}>
          SAVED PAYMENT METHODS
        </ThemedText>
        <ThemedText variant="caption" style={styles.headerDesc}>
          Cards saved here will be used for deposit authorizations and appointment checkouts. Powered securely by Stripe.
        </ThemedText>
      </View>

      <View style={styles.cardsList}>
        {paymentMethods.map((pm) => (
          <Card key={pm.id} style={styles.paymentCard}>
            <View style={styles.cardTop}>
              <View style={styles.brandRow}>
                <ThemedText style={styles.brandIcon}>
                  {pm.brand === "visa" ? "💳" : "💳"}
                </ThemedText>
                <View>
                  <ThemedText variant="headline" style={styles.cardName}>
                    {pm.brand.toUpperCase()} •••• {pm.last4}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.cardExp}>
                    Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                  </ThemedText>
                </View>
              </View>

              {pm.isDefault ? (
                <Badge variant="success" label="Default" />
              ) : (
                <TouchableOpacity onPress={() => handleSetDefault(pm.id)}>
                  <ThemedText variant="caption" style={styles.setDefaultText}>
                    Make Default
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardBottom}>
              <TouchableOpacity onPress={() => handleRemove(pm.id, pm.isDefault)}>
                <ThemedText variant="caption" style={styles.deleteText}>
                  Remove Card
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </View>

      <Button
        title="+ Add Payment Method"
        variant="secondary"
        onPress={() => setModalVisible(true)}
      />

      {/* Add Card Modal — Stripe CardField */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText variant="headline">Add Card</ThemedText>
            <Button
              title="Close"
              variant="ghost"
              size="sm"
              onPress={() => setModalVisible(false)}
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <ThemedText variant="caption" style={styles.stripeNote}>
              Your card details are encrypted and tokenised by Stripe. Pav Dental never sees your card number.
            </ThemedText>

            {/* Stripe native card input — PCI-compliant */}
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: "4242 4242 4242 4242" }}
              cardStyle={{
                backgroundColor: colors.secondaryBackground as string,
                textColor: colors.label as string,
                placeholderColor: colors.secondaryLabel as string,
                borderColor: colors.separator as string,
                borderWidth: 1,
                borderRadius: 10,
              }}
              style={styles.cardField}
              onCardChange={(details) => setCardDetails(details)}
            />

            <Button
              title={isSaving ? "Saving Card..." : "Save Card Securely"}
              onPress={handleAddCard}
              disabled={isSaving || !cardDetails?.complete}
              loading={isSaving}
            />
          </ScrollView>

          {isSaving && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brandIcon: {
    fontSize: 24,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardBottom: {
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing.xs,
  },
  cardExp: {
    color: colors.secondaryLabel,
  },
  cardField: {
    height: 50,
    marginVertical: spacing.xs,
    width: "100%",
  },
  cardName: {
    color: colors.label,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardsList: {
    gap: spacing.sm,
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
  deleteText: {
    color: colors.danger,
    fontWeight: "500",
  },
  headerBox: {
    gap: spacing.xs,
  },
  headerDesc: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  headerSub: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
  },
  modalContainer: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  modalContent: {
    gap: spacing.lg,
    padding: spacing.md,
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  paymentCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  setDefaultText: {
    color: colors.brand,
    fontWeight: "600",
  },
  stripeNote: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
});
