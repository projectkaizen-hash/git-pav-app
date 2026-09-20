import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText, Card, Badge, Button, Input } from "@/components";
import {
  useDependants,
  useAddDependantMutation,
  useRemoveDependantMutation,
} from "@/features/account/account-hooks";
import { colors, spacing } from "@/theme";

export default function DependantsScreen() {
  const { data: dependants = [] } = useDependants();
  const addDependant = useAddDependantMutation();
  const removeDependant = useRemoveDependantMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [relationship, setRelationship] = useState<"Son" | "Daughter" | "Ward" | "Other">("Son");

  const handleAdd = async () => {
    if (!firstName || !lastName || !dob) {
      Alert.alert("Missing Fields", "Please complete all required fields for your child/dependant.");
      return;
    }

    try {
      await addDependant.mutateAsync({
        firstName,
        lastName,
        dob,
        relationship,
        consentSigned: true,
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // optional
      }

      setModalVisible(false);
      setFirstName("");
      setLastName("");
      setDob("");
      Alert.alert("Child Profile Linked", `${firstName}'s profile has been linked to your account.`);
    } catch {
      Alert.alert("Error", "Could not link dependant profile.");
    }
  };

  const handleRemove = (id: string, name: string) => {
    Alert.alert("Unlink Dependant?", `Are you sure you want to unlink ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          try {
            await removeDependant.mutateAsync(id);
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              // optional
            }
          } catch {
            Alert.alert("Error", "Could not unlink profile.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <ThemedText variant="subhead" style={styles.headerSub}>
          FAMILY & DEPENDANT ACCOUNTS
        </ThemedText>
        <ThemedText variant="caption" style={styles.headerDesc}>
          Manage linked dental appointments and pediatric records for children under 16 where you hold legal parental responsibility.
        </ThemedText>
      </View>

      <View style={styles.list}>
        {dependants.map((dep) => {
          const age = Math.floor(
            (Date.now() - new Date(dep.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );

          return (
            <Card key={dep.id} style={styles.depCard}>
              <View style={styles.depTop}>
                <View style={styles.avatarCircle}>
                  <ThemedText style={styles.avatarInitial}>{dep.firstName[0]}</ThemedText>
                </View>
                <View style={styles.depInfo}>
                  <View style={styles.nameRow}>
                    <ThemedText variant="headline">{`${dep.firstName} ${dep.lastName}`}</ThemedText>
                    <Badge variant="info" label={`${dep.relationship} · Age ${age}`} />
                  </View>
                  <ThemedText variant="caption" style={styles.dobText}>
                    Date of Birth: {new Date(dep.dob).toLocaleDateString("en-GB")}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.depBottom}>
                <View style={styles.consentBadge}>
                  <ThemedText variant="caption" style={styles.consentText}>
                    {dep.consentSigned ? "✓ Parental Consent Active" : "⚠️ Consent Pending"}
                  </ThemedText>
                </View>

                <TouchableOpacity onPress={() => handleRemove(dep.id, dep.firstName)}>
                  <ThemedText variant="caption" style={styles.unlinkText}>
                    Unlink
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </View>

      <Button
        title="+ Add Child / Dependant Profile"
        variant="secondary"
        onPress={() => setModalVisible(true)}
      />

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText variant="headline">Add Child Profile</ThemedText>
            <Button
              title="Close"
              variant="ghost"
              size="sm"
              onPress={() => setModalVisible(false)}
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input
              label="Child's First Name *"
              placeholder="e.g. Leo"
              value={firstName}
              onChangeText={setFirstName}
            />

            <Input
              label="Child's Last Name *"
              placeholder="e.g. Jenkins"
              value={lastName}
              onChangeText={setLastName}
            />

            <Input
              label="Date of Birth (YYYY-MM-DD) *"
              placeholder="e.g. 2018-06-15"
              value={dob}
              onChangeText={setDob}
            />

            <View style={styles.relSection}>
              <ThemedText variant="subhead" style={styles.relLabel}>
                Relationship *
              </ThemedText>
              <View style={styles.relPills}>
                {(["Son", "Daughter", "Ward", "Other"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRelationship(r)}
                    style={[styles.relPill, relationship === r && styles.relPillActive]}
                  >
                    <ThemedText
                      variant="caption"
                      style={[styles.relPillText, relationship === r && styles.relPillTextActive]}
                    >
                      {r}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title={addDependant.isPending ? "Linking..." : "Link Profile"}
              onPress={handleAdd}
              disabled={addDependant.isPending || !firstName || !lastName}
              loading={addDependant.isPending}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarInitial: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: "700",
  },
  consentBadge: {},
  consentText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "600",
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
  depBottom: {
    alignItems: "center",
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  depCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  depInfo: {
    flex: 1,
    gap: 2,
  },
  depTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  dobText: {
    color: colors.secondaryLabel,
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
  list: {
    gap: spacing.sm,
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
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  relLabel: {
    color: colors.label,
    fontWeight: "600",
  },
  relPill: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  relPillActive: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  relPillText: {
    color: colors.secondaryLabel,
  },
  relPillTextActive: {
    color: colors.brand,
    fontWeight: "700",
  },
  relPills: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  relSection: {
    gap: spacing.xs,
  },
  unlinkText: {
    color: colors.danger,
    fontWeight: "500",
  },
});

