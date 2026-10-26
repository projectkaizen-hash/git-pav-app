import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import { authFetch } from "../auth/auth-api";
import { useAuthStore } from "../auth/auth-store";
import { enqueueNote, flushQueue, type KeyValueStore, type QueuedVanNote, type SendResult } from "./offline-notes-queue";

// MF-05: wires the offline visit-note queue to SecureStore and sends it
// whenever the phone comes back online or the app returns to the foreground,
// not only when the capture screen is open.

const store: KeyValueStore =
  Platform.OS === "web"
    ? {
        get: async (k) => (typeof window !== "undefined" ? window.localStorage.getItem(k) : null),
        set: async (k, v) => void (typeof window !== "undefined" && window.localStorage.setItem(k, v)),
        remove: async (k) => void (typeof window !== "undefined" && window.localStorage.removeItem(k)),
      }
    : {
        get: (k) => SecureStore.getItemAsync(k),
        set: (k, v) => SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
        remove: (k) => SecureStore.deleteItemAsync(k),
      };

/** Completes the visit with its notes on the backend. */
export async function sendVisitNote(note: Pick<QueuedVanNote, "stopId" | "notes">): Promise<Response> {
  return authFetch(`/api/van/requests/${note.stopId}/phase`, {
    method: "POST",
    body: JSON.stringify({ phase: "completed", notes: note.notes }),
  });
}

const sendQueued = async (note: QueuedVanNote): Promise<SendResult> => ((await sendVisitNote(note)).ok ? "sent" : "retry");

export function queueOfflineNote(note: QueuedVanNote): Promise<number> {
  return enqueueNote(store, note);
}

let flushing: Promise<number> | null = null;

/** Sends this operator's queued notes; resolves to how many are still waiting. */
export function flushOfflineNotes(): Promise<number> {
  const user = useAuthStore.getState().user;
  if (user?.role !== "operator") return Promise.resolve(0);
  // One flush at a time, so a note is never sent twice in parallel.
  flushing ??= flushQueue(store, user.id, sendQueued).finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Mount once in the operator portal. */
export function useOfflineNotesSync(): void {
  useEffect(() => {
    void flushOfflineNotes();
    let wasConnected: boolean | null = null;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && wasConnected === false) void flushOfflineNotes();
      wasConnected = state.isConnected;
    });
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void flushOfflineNotes();
    });
    return () => {
      unsubscribeNet();
      appState.remove();
    };
  }, []);
}
