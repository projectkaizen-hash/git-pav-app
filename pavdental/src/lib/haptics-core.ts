/**
 * UX-04: Core haptic manager with accessibility Reduce Motion support.
 * Pure logic free of React Native native modules so it can be verified in tsx test suites.
 */

export interface HapticsBackend {
  impactAsync: (style: string) => Promise<void>;
  notificationAsync: (type: string) => Promise<void>;
  selectionAsync: () => Promise<void>;
}

export interface AccessibilityBackend {
  isReduceMotionEnabled: () => Promise<boolean>;
  addEventListener?: (event: "reduceMotionChanged", handler: (enabled: boolean) => void) => { remove: () => void } | void;
}

export interface HapticsManager {
  readonly isReduceMotion: boolean;
  setReduceMotion: (enabled: boolean) => void;
  impactAsync: (style?: string) => Promise<void>;
  notificationAsync: (type?: string) => Promise<void>;
  selectionAsync: () => Promise<void>;
}

export function createHapticsManager(
  haptics: HapticsBackend,
  accessibility: AccessibilityBackend,
): HapticsManager {
  let reduceMotion = false;

  if (typeof accessibility.isReduceMotionEnabled === "function") {
    accessibility.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotion = Boolean(enabled);
      })
      .catch(() => {});
  }

  if (typeof accessibility.addEventListener === "function") {
    accessibility.addEventListener("reduceMotionChanged", (enabled) => {
      reduceMotion = Boolean(enabled);
    });
  }

  return {
    get isReduceMotion(): boolean {
      return reduceMotion;
    },
    setReduceMotion(enabled: boolean) {
      reduceMotion = enabled;
    },
    async impactAsync(style = "light"): Promise<void> {
      if (reduceMotion) return;
      try {
        await haptics.impactAsync(style);
      } catch {
        // Safe silence on web, simulator, or hardware without haptic engine
      }
    },
    async notificationAsync(type = "success"): Promise<void> {
      if (reduceMotion) return;
      try {
        await haptics.notificationAsync(type);
      } catch {
        // Safe silence
      }
    },
    async selectionAsync(): Promise<void> {
      if (reduceMotion) return;
      try {
        await haptics.selectionAsync();
      } catch {
        // Safe silence
      }
    },
  };
}
