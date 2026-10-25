"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  INBOX_FILTERS,
  type InboxFilter,
  type InboxMessage,
  type InboxThread,
  inboxPath,
  PAGE_SIZE,
  RECIPIENT_LABELS,
  REPLY_MAX,
  replyPayload,
} from "@/lib/pav-inbox";
import { appRequest } from "@/lib/pav-schedule";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export function InboxView() {
  const [filter, setFilter] = useState<InboxFilter>("practice");
  const [offset, setOffset] = useState(0);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setThreads(await appRequest<InboxThread[]>(inboxPath(filter, offset)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [filter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  async function open(thread: InboxThread) {
    setSelectedId(thread.id);
    setReply("");
    if (thread.isRead) return;
    try {
      await appRequest(`messages/${thread.id}/read`, { method: "PATCH" });
      setThreads((all) => all.map((t) => (t.id === thread.id ? { ...t, isRead: true } : t)));
    } catch {
      // Still readable; it just stays marked unread.
    }
  }

  async function send() {
    if (!selected) return;
    const payload = replyPayload(reply);
    if (!payload) return toast.error(`Write a reply of up to ${REPLY_MAX} characters`);
    setSending(true);
    try {
      const result = await appRequest<{ message: InboxMessage }>(`messages/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setThreads((all) =>
        all.map((t) => (t.id === selected.id ? { ...t, messages: [...t.messages, result.message] } : t)),
      );
      setReply("");
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reply didn't send");
    } finally {
      setSending(false);
    }
  }

  function threadList() {
    if (loading) return <p className="text-muted-foreground text-sm">Loading messages...</p>;
    if (loadError) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-destructive text-sm">{loadError}</p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      );
    }
    if (threads.length === 0) return <p className="text-muted-foreground text-sm">No messages here.</p>;
    return threads.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => void open(t)}
        aria-current={t.id === selectedId}
        className="flex flex-col items-start gap-1 rounded-md border p-3 text-left hover:bg-muted aria-[current=true]:bg-muted"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className={t.isRead ? "text-sm" : "font-semibold text-sm"}>{t.from}</span>
          {!t.isRead && <Badge>Unread</Badge>}
        </span>
        <span className="text-sm">{t.subject}</span>
        <span className="text-muted-foreground text-xs">
          {RECIPIENT_LABELS[t.recipientType] ?? t.recipientType} · {formatWhen(t.sentAtIso)}
        </span>
      </button>
    ));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Threads</CardTitle>
          <CardDescription>Newest first. Unread threads are marked.</CardDescription>
          <NativeSelect
            aria-label="Which threads"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as InboxFilter);
              setOffset(0);
              setSelectedId(null);
            }}
          >
            {INBOX_FILTERS.map((f) => (
              <NativeSelectOption key={f.value} value={f.value}>
                {f.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {threadList()}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Newer
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || threads.length < PAGE_SIZE}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Older
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {selected ? (
          <>
            <CardHeader>
              <CardTitle>{selected.subject}</CardTitle>
              <CardDescription>{selected.patientName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ol className="flex flex-col gap-3">
                {selected.messages.map((m) => (
                  <li
                    key={m.id}
                    className={m.senderRole === "patient" ? "rounded-md border p-3" : "rounded-md bg-muted p-3"}
                  >
                    <p className="text-muted-foreground text-xs">
                      {m.senderName} · {formatWhen(m.sentAtIso)}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  </li>
                ))}
              </ol>
              <Textarea
                aria-label="Reply"
                placeholder="Write a reply"
                value={reply}
                maxLength={REPLY_MAX}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex justify-end">
                <Button disabled={sending} onClick={() => void send()}>
                  {sending ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Choose a thread to read it.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
