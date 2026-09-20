import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/button';
import { useAppLockStore } from './app-lock-store';

export function AppLockScreen() {
  const { isLocked, unlock } = useAppLockStore();

  const handleUnlock = async () => {
    const success = await unlock();
    if (!success) {
      // Authentication failed - user can try again
    }
  };

  if (!isLocked) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.icon}>🔒</ThemedText>
        <ThemedText variant="title" style={styles.title}>
          App Locked
        </ThemedText>
        <ThemedText variant="subhead" style={styles.message}>
          Authenticate to access your health data
        </ThemedText>
        <Button 
          title="Unlock" 
          onPress={handleUnlock}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
});
