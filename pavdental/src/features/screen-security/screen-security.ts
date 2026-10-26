import { useEffect } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { createScreenGuard, type ScreenCaptureApi } from "./screen-guard";

// D-14: screens showing medical records can't be screenshotted or screen
// recorded. On Android FLAG_SECURE also hides them in recent apps; on iOS the
// app switcher shows a blur. Native builds only; on web it does nothing.

const nativeApi: ScreenCaptureApi | null =
  Platform.OS === "web"
    ? null
    : {
        preventScreenCaptureAsync: (key) => ScreenCapture.preventScreenCaptureAsync(key),
        allowScreenCaptureAsync: (key) => ScreenCapture.allowScreenCaptureAsync(key),
        enableAppSwitcherProtectionAsync: () =>
          Platform.OS === "ios" ? ScreenCapture.enableAppSwitcherProtectionAsync() : Promise.resolve(),
        disableAppSwitcherProtectionAsync: () =>
          Platform.OS === "ios" ? ScreenCapture.disableAppSwitcherProtectionAsync() : Promise.resolve(),
      };

const protectScreen = createScreenGuard(() => nativeApi);

/** Use in the layout or screen that shows medical records. */
export function useProtectedScreen(key: string): void {
  useEffect(() => protectScreen(key), [key]);
}
