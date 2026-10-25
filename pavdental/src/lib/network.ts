// Native modules are loaded lazily so this file also runs in the Node tests.
/* eslint-disable @typescript-eslint/no-var-requires */
import { onlineManager } from "@tanstack/react-query";
import { create } from "zustand";

let NetInfo: any = null;
try {
  NetInfo = require("@react-native-community/netinfo").default ?? require("@react-native-community/netinfo");
} catch {
  // Not available on this platform.
}

let Platform: any = { OS: "web" };
try {
  Platform = require("react-native").Platform ?? require("react-native-web").Platform;
} catch {
  try {
    Platform = require("react-native-web").Platform;
  } catch {
  // Not available on this platform.
}
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  setNetworkState: (state: { isConnected: boolean; isInternetReachable: boolean | null }) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  isInternetReachable: true,
  setNetworkState: (state) => set(state),
}));

export function setupNetworkMonitoring(): () => void {
  let unsubscribeNetInfo: (() => void) | undefined;
  if (Platform.OS !== "web" && NetInfo?.addEventListener) {
    onlineManager.setEventListener((setOnline) => {
      unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
        const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
        setOnline(isOnline);
        useNetworkStore.getState().setNetworkState({
          isConnected: Boolean(state.isConnected),
          isInternetReachable: state.isInternetReachable,
        });
      });
      return () => {
        if (unsubscribeNetInfo) unsubscribeNetInfo();
      };
    });
  }
  return () => {
    if (unsubscribeNetInfo) unsubscribeNetInfo();
  };
}

export function useIsOnline(): boolean {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
  return isConnected && isInternetReachable !== false;
}
