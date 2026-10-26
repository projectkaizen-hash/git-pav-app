import * as ExpoHaptics from "expo-haptics";
import { AccessibilityInfo, Platform } from "react-native";
import { createHapticsManager, type HapticsBackend, type AccessibilityBackend } from "./haptics-core";

const nativeHaptics: HapticsBackend = {
  impactAsync: async (style: string) => {
    if (Platform.OS === "web") return;
    const mappedStyle =
      style === "medium"
        ? ExpoHaptics.ImpactFeedbackStyle.Medium
        : style === "heavy"
        ? ExpoHaptics.ImpactFeedbackStyle.Heavy
        : ExpoHaptics.ImpactFeedbackStyle.Light;
    await ExpoHaptics.impactAsync(mappedStyle);
  },
  notificationAsync: async (type: string) => {
    if (Platform.OS === "web") return;
    const mappedType =
      type === "warning"
        ? ExpoHaptics.NotificationFeedbackType.Warning
        : type === "error"
        ? ExpoHaptics.NotificationFeedbackType.Error
        : ExpoHaptics.NotificationFeedbackType.Success;
    await ExpoHaptics.notificationAsync(mappedType);
  },
  selectionAsync: async () => {
    if (Platform.OS === "web") return;
    await ExpoHaptics.selectionAsync();
  },
};

const a11yBackend: AccessibilityBackend = {
  isReduceMotionEnabled: () =>
    Platform.OS === "web"
      ? Promise.resolve(false)
      : AccessibilityInfo.isReduceMotionEnabled(),
  addEventListener: (event, handler) => {
    if (Platform.OS === "web") return;
    return AccessibilityInfo.addEventListener(event, handler);
  },
};

/**
 * UX-04: safeHaptics automatically suppresses vibrations when user has
 * "Reduce Motion" enabled in system accessibility settings.
 */
export const safeHaptics = createHapticsManager(nativeHaptics, a11yBackend);
export { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";
