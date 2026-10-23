import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { ThemedText, Card, EmptyState, ErrorState, Skeleton, AppIcon, type AppIconName } from "@/components";
import { colors, spacing } from "@/theme";
import { useDocumentVault } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";

export default function DocumentVaultScreen() {
  const user = useCurrentUser();
  const userId = user?.id || "";
  const { data: apiDocs, isLoading, isError, refetch } = useDocumentVault(userId);

  const documents = apiDocs ?? [];

  const getDocIcon = (type: string): AppIconName => {
    switch (type) {
      case "xray":
        return "image";
      case "prescription":
        return "droplet";
      case "invoice":
        return "fileText";
      default:
        return "fileText";
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
            Digital health documents, X-rays, and invoices encrypted at rest.
          </ThemedText>
        </View>

        {/* Security Badge Banner */}
        <View style={styles.securityBanner}>
          <AppIcon name="lock" size={14} color={colors.secondaryLabel} />
          <ThemedText variant="caption" style={styles.securityText}>
            All downloads are streamed securely via encrypted, time-limited signed access.
          </ThemedText>
        </View>

        {/* Document Cards */}
        {isLoading && !apiDocs ? (
          <View style={styles.docList}>
            <Skeleton height={76} borderRadius={16} />
            <Skeleton height={76} borderRadius={16} />
            <Skeleton height={76} borderRadius={16} />
          </View>
        ) : isError ? (
          <ErrorState
            message="Could not load your documents. Please try again."
            onRetry={() => refetch()}
          />
        ) : documents.length === 0 ? (
          <EmptyState
            heading="No documents yet"
            body="Your X-rays, prescriptions, and invoices will appear here after your appointments."
            icon="fileText"
          />
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
                      <AppIcon name={getDocIcon(doc.docType || doc.type || "")} size={18} color={colors.ink} />
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
                      accessibilityRole="button"
                      accessibilityLabel={`Download ${doc.title}`}
                      onPress={() => handleDownload(doc.downloadUrl || doc.signedUrl || "")}
                      style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
                    >
                      <AppIcon name="download" size={18} color={colors.ink} />
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
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  downloadBtnPressed: {
    opacity: 0.7,
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
  securityBanner: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
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
