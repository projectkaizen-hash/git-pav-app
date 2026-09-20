import { Platform } from 'react-native';

/**
 * Screen Security & Device Integrity Utilities
 * 
 * NOTE: Full implementation requires packages with conflicts in current Expo SDK:
 * - expo-screen-capture: Screenshot/app-switcher preview prevention
 * - expo-device: Device integrity detection (rooted/jailbroken)
 * 
 * These packages have peer dependency conflicts with Expo SDK 57.
 * For production deployment, consider:
 * 1. Using a development build with custom native code
 * 2. Implementing in a bare React Native project
 * 3. Waiting for Expo SDK updates that resolve dependency conflicts
 * 4. Adding to production checklist: Implement screen security & device integrity
 */

export function preventScreenshots(): boolean {
  // Stub implementation - document the requirement
  if (Platform.OS === 'ios') {
    console.warn('[Screen Security] iOS screenshot prevention requires custom native code or expo-screen-capture package');
  } else if (Platform.OS === 'android') {
    console.warn('[Screen Security] Android FLAG_SECURE requires custom native code or expo-screen-capture package');
  }
  return false;
}

export function allowScreenshots(): boolean {
  // Stub implementation
  return false;
}

export async function checkDeviceIntegrity(): Promise<{
  isRootedOrJailbroken: boolean;
  isEmulator: boolean;
  deviceModel: string;
}> {
  // Stub implementation - requires expo-device package
  console.warn('[Device Integrity] Device integrity detection requires expo-device package (dependency conflict with current Expo SDK)');
  
  return {
    isRootedOrJailbroken: false,
    isEmulator: false,
    deviceModel: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
  };
}

export function enableScreenSecurity(): void {
  console.warn('[Screen Security] Full screen security implementation requires custom native module');
  console.warn('[Screen Security] Add to production checklist: Implement screenshot/app-switcher prevention for clinical screens');
  console.warn('[Screen Security] Add to production checklist: Implement device integrity detection and rooted device handling');
}
