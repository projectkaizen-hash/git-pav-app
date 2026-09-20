import { useState, useEffect, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

const BIOMETRIC_LOCK_KEY = "pavdental_biometric_app_lock_enabled";

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const [isBiometricLockEnabled, setIsBiometricLockEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check hardware and current preference
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(hasHardware);

      if (hasHardware) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Touch ID / Fingerprint");
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType("Iris Scanner");
        } else {
          setBiometricType("Biometrics");
        }
      }

      // Check stored preference
      const storedPref = await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY);
      setIsBiometricLockEnabled(storedPref === "true");
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Toggle biometric lock
  const toggleBiometricLock = async (enable: boolean) => {
    if (enable) {
      if (!isSupported) {
        Alert.alert("Biometrics Unavailable", "Your device does not support biometric authentication.");
        return false;
      }
      if (!isEnrolled) {
        Alert.alert(
          "No Biometrics Enrolled",
          "Please configure Face ID or Fingerprint in your device settings first."
        );
        return false;
      }

      // Verify biometrics before enabling
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: `Verify your ${biometricType} to enable App Lock`,
        fallbackLabel: "Use Passcode",
      });

      if (!auth.success) {
        return false;
      }
    }

    try {
      await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, enable ? "true" : "false");
      setIsBiometricLockEnabled(enable);
      return true;
    } catch {
      Alert.alert("Error", "Could not save biometric preference.");
      return false;
    }
  };

  // Authenticate user
  const authenticate = async (reason = "Unlock Pav Dental"): Promise<boolean> => {
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      return auth.success;
    } catch {
      return false;
    }
  };

  return {
    isSupported,
    isEnrolled,
    biometricType,
    isBiometricLockEnabled,
    isLoading,
    toggleBiometricLock,
    authenticate,
    refreshStatus: checkStatus,
  };
}

