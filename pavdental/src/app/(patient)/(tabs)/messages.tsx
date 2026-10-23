import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import {
  ThemedText,
  Card,
  Badge,
  EmptyState,
  AppIcon,
  Skeleton,
  Input,
  Button,
  EmergencyTriageModal,
  Toast,
} from "@/components";
import { colors, spacing, radius } from "@/theme";
import {
  useMessageThreads,
  useReplyMessageThreadMutation,
  useMarkMessageThreadReadMutation,
} from "@/features/hooks/use-dental-api";

export interface ThreadListItem {
  id: string;
  subject: string;
  from: string;
  preview: string;
  sentAtIso: string;
  isRead: boolean;
  hasAttachment: boolean;
}

export default function MessagesScreen() {
  const [query, setQuery] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadListItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showTriage, setShowTriage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: rawThreads, isLoading } = useMessageThreads();
  const replyMutation = useReplyMessageThreadMutation();
  const markReadMutation = useMarkMessageThreadReadMutation();

  const threads: ThreadListItem[] = Array.isArray(rawThreads)
    ? rawThreads.map((t: any) => ({
        id: t.id,
        subject: t.subject || "Care Team Message",
        from: t.from || `${t.clinicianName || "Dr. Tariq Pav"} (${t.clinicianRole || "Lead Dentist"})`,
        preview: t.preview || (t.messages?.[t.messages.length - 1]?.body ?? ""),
        sentAtIso: t.sentAtIso || t.updatedAt || new Date().toISOString(),
        isRead: Boolean(t.isRead),
        hasAttachment: Boolean(t.hasAttachment),
      }))
    : [];

  const filtered = threads.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.preview.toLowerCase().includes(q)
    );
  });

  const unreadCount = threads.filter((m) => !m.isRead).length;

  const openMessage = (msg: ThreadListItem) => {
    if (!msg.isRead) {
      markReadMutation.mutate(msg.id);
    }
    setReplyTo(msg);
    setReplyText("");
  };

  const sendReply = async () => {
    if (!replyTo || !replyText.trim()) return;
    const body = replyText.trim();
    try {
      await replyMutation.mutateAsync({ threadId: replyTo.id, body });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast("Reply sent to your care team");
      setReplyTo(null);
      setReplyText("");
    } catch (err: any) {
      setToast(err?.message || "Could not send reply");
    }
  };

  return (
    <View style={styles.container}>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText variant="overline">Secure inbox</ThemedText>
          {unreadCount > 0 ? <Badge label={`${unreadCount} NEW`} variant="info" /> : null}
        </View>

        {/* 24/7 AI Dental Emergency Triage Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start AI Dental Emergency Triage"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setShowTriage(true);
          }}
          style={({ pressed }) => [styles.triageBanner, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.triageIconBadge}>
            <AppIcon name="alert" size={16} color={colors.danger} />
          </View>
          <View style={styles.triageTextGroup}>
            <View style={styles.triageHeaderLine}>
              <ThemedText variant="subhead" style={styles.triageTitle}>
                Dental Emergency?
              </ThemedText>
              <Badge label="24/7 AI" variant="danger" />
            </View>
            <ThemedText variant="caption" style={styles.triageSubtitle}>
              Check pain, broken teeth, or swelling for instant triage advice.
            </ThemedText>
          </View>
          <AppIcon name="chevronRight" size={16} color={colors.secondaryLabel} />
        </Pressable>

        <Input
          label=""
          placeholder="Search messages"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search messages"
        />

        {isLoading ? (
          <View style={styles.stack}>
            <Skeleton height={84} />
            <Skeleton height={84} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            heading="No messages found"
            body={query ? `Nothing matches “${query}”.` : "Messages from your care team will appear here."}
            icon="message"
          />
        ) : (
          <View style={styles.stack}>
            {filtered.map((msg) => {
              const unread = !msg.isRead;
              return (
                <Pressable
                  key={msg.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Message from ${msg.from}: ${msg.subject}`}
                  onPress={() => openMessage(msg)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Card elevation="raised" style={[styles.threadCard, unread && styles.threadCardUnread]}>
                    <View style={styles.avatarTile}>
                      <AppIcon name="message" size={18} color={unread ? colors.onInk : colors.ink} />
                    </View>
                    <View style={styles.threadInfo}>
                      <View style={styles.threadTop}>
                        <ThemedText variant="subhead" style={styles.threadFrom} numberOfLines={1}>
                          {msg.from}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.threadTime}>
                          {new Date(msg.sentAtIso).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </ThemedText>
                      </View>
                      <ThemedText
                        variant="body"
                        style={unread ? styles.threadSubjectUnread : styles.threadSubject}
                        numberOfLines={1}
                      >
                        {msg.subject}
                      </ThemedText>
                      <ThemedText variant="caption" style={styles.threadPreview} numberOfLines={2}>
                        {msg.preview}
                      </ThemedText>
                      {msg.hasAttachment ? (
                        <View style={styles.attachRow}>
                          <AppIcon name="fileText" size={12} color={colors.secondaryLabel} />
                          <ThemedText variant="caption" style={styles.attachText}>
                            Attachment
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    {unread ? <View style={styles.unreadDot} /> : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reply composer */}
      {replyTo ? (
        <View style={styles.composer}>
          <ThemedText variant="caption" style={styles.composerTo}>
            Reply to {replyTo.from}
          </ThemedText>
          <View style={styles.composerRow}>
            <Input
              label=""
              placeholder="Write a reply…"
              value={replyText}
              onChangeText={setReplyText}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send reply"
              onPress={sendReply}
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && { opacity: 0.8 },
                (!replyText.trim() || replyMutation.isPending) && styles.sendBtnDisabled,
              ]}
            >
              <AppIcon name="arrowRight" size={18} color={colors.onInk} />
            </Pressable>
          </View>
          <Button title="Close" variant="ghost" size="sm" onPress={() => setReplyTo(null)} />
        </View>
      ) : null}

      {/* Frame 6: Emergency AI Triage Modal */}
      <EmergencyTriageModal visible={showTriage} onClose={() => setShowTriage(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  triageBanner: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  triageIconBadge: {
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  triageTextGroup: {
    flex: 1,
    gap: 2,
  },
  triageHeaderLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  triageTitle: {
    color: colors.label,
    fontSize: 14,
    fontWeight: "700",
  },
  triageSubtitle: {
    color: colors.secondaryLabel,
    fontSize: 11,
    lineHeight: 15,
  },
  attachRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  attachText: {
    color: colors.secondaryLabel,
  },
  avatarTile: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  composer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  composerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  composerTo: {
    color: colors.secondaryLabel,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  sendBtn: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  stack: {
    gap: spacing.sm,
  },
  threadCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  threadCardUnread: {
    backgroundColor: colors.secondaryBackground,
  },
  threadFrom: {
    color: colors.label,
    flex: 1,
    fontWeight: "700",
  },
  threadInfo: {
    flex: 1,
    gap: 2,
  },
  threadPreview: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  threadSubject: {
    color: colors.label,
  },
  threadSubjectUnread: {
    color: colors.ink,
    fontWeight: "700",
  },
  threadTime: {
    color: colors.tertiaryLabel,
  },
  threadTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  unreadDot: {
    backgroundColor: colors.ink,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
