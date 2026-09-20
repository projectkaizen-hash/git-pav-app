import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { ThemedText, Card } from "@/components";
import { colors, spacing } from "@/theme";
import { useDocumentVault } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";

export default function DocumentVaultScreen() {
  const user = useCurrentUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000000";
  const { data: documents, isLoading, isError, refetch } = useDocumentVault(userId);

  const getDocIcon = (type: string) => {
    switch (type) {
      case "xray":
        return "🩻";
      case "prescription":
        return "💊";
      case "invoice":
        return "🧾";
      default:
        return "📄";
    }
  };

  const handleDownload = (url: string) => {
    if (url && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Document Vault
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Digital health documents, X-rays, and invoices. Production security implementation required.
          </ThemedText>
        </View>

        {/* Security Badge Banner */}
        <View style={styles.securityBanner}>
          <ThemedText variant="caption" style={styles.securityText}>
            🔒 Downloads use time-limited signed URLs. Independent security review required for production.
          </ThemedText>
        </View>

        {/* Document Cards */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand} />
            <ThemedText variant="caption" style={styles.sub}>
              Loading your clinical documents...
            </ThemedText>
          </View>
        ) : isError ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline" style={{ color: colors.danger }}>
              Could not load documents
            </ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Please check your network connection.
            </ThemedText>
            <Pressable onPress={() => refetch()} style={styles.retryBtn}>
              <ThemedText variant="caption" style={styles.retryText}>Retry</ThemedText>
            </Pressable>
          </Card>
        ) : !documents || documents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline">No Documents Yet</ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Your X-rays, prescriptions, and invoices will appear here after your appointments.
            </ThemedText>
          </Card>
        ) : (
          <View style={styles.docList}>
            {documents.map((doc: any) => {
              const docDate = doc.createdAt
                ? new Date(doc.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const fileSizeDisplay = doc.fileSizeBytes
                ? `${Math.round(doc.fileSizeBytes / 1024)} KB`
                : "";

              return (
                <Card key={doc.id} elevation="raised" style={styles.docCard}>
                  <View style={styles.docRow}>
                    <View style={styles.iconCircle}>
                      <ThemedText variant="title">{getDocIcon(doc.docType || doc.type || "")}</ThemedText>
                    </View>

                    <View style={styles.docInfo}>
                      <ThemedText variant="headline" style={styles.docTitle}>
                        {doc.title}
                      </ThemedText>
                      <ThemedText variant="caption" style={styles.docMeta}>
                        {docDate}{fileSizeDisplay ? ` · ${fileSizeDisplay}` : ""}
                      </ThemedText>
                    </View>

                    <Pressable
                      onPress={() => handleDownload(doc.downloadUrl || doc.signedUrl || "")}
                      style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
                    >
                      <ThemedText variant="caption" style={styles.downloadText}>
                        Download ↓
                      </ThemedText>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  docCard: {
    backgroundColor: colors.systemBackground,
    padding: spacing.md,
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docList: {
    gap: spacing.sm,
  },
  docMeta: {
    color: colors.secondaryLabel,
  },
  docRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  docTitle: {
    color: colors.label,
  },
  downloadBtn: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  downloadBtnPressed: {
    opacity: 0.7,
  },
  downloadText: {
    color: colors.brand,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xxs,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  loadingBox: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    color: colors.onBrand,
    fontWeight: "700",
  },
  securityBanner: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: spacing.sm,
  },
  securityText: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  sub: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});
