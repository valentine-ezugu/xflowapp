import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

// Sumsub SDK - only available on native platforms
let SNSMobileSDK: any = null;
if (Platform.OS !== 'web') {
  try {
    SNSMobileSDK = require('@sumsub/react-native-mobilesdk-module').default;
  } catch (e) {
    console.warn('Sumsub SDK not available:', e);
  }
}

export default function VerifyIdentityScreen() {
  const { startVerification, refreshKycStatus, isLoading, error, clearError } = useAuth();

  const [sdkRunning, setSdkRunning] = useState(false);

  const handleStartVerification = async () => {
    try {
      const accessToken = await startVerification();

      if (Platform.OS === 'web') {
        // Web platform - show message that verification requires mobile
        alert('Identity verification requires the mobile app. Please use iOS or Android.');
        return;
      }

      if (!SNSMobileSDK) {
        console.error('Sumsub SDK not available');
        return;
      }

      setSdkRunning(true);

      // Launch Sumsub SDK
      const snsMobileSDK = SNSMobileSDK.init(accessToken, () => {
        // Token expiration handler - get a new token
        return startVerification();
      })
        .withHandlers({
          onStatusChanged: (event: any) => {
            console.log('[Sumsub] Status changed:', event.prevStatus, '->', event.newStatus);
          },
          onLog: (event: any) => {
            console.log('[Sumsub] Log:', event.message);
          },
        })
        .withDebug(true)
        .build();

      const result = await snsMobileSDK.launch();
      console.log('[Sumsub] SDK result:', result);

      setSdkRunning(false);

      // Check if verification was successful
      if (result.status === 'Approved' || result.status === 'ActionCompleted') {
        await refreshKycStatus();
        router.replace('/(tabs)');
      } else if (result.status === 'Pending') {
        // User completed the flow, pending review
        await refreshKycStatus();
        router.replace('/(tabs)');
      }
      // If cancelled or failed, stay on this screen
    } catch (err) {
      console.error('[Sumsub] Error:', err);
      setSdkRunning(false);
    }
  };

  const handleSkip = async () => {
    router.replace('/(tabs)');
  };

  // Show loading state while SDK is running
  if (sdkRunning) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Verification in progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotCompleted]} />
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={[styles.stepDot, styles.stepDotCompleted]} />
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <Text style={styles.stepText}>Step 3 of 3</Text>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Complete ID verification to unlock all features
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="shield-checkmark" size={32} color="#00D4AA" />
          </View>
          <Text style={styles.infoTitle}>Why we need this</Text>
          <Text style={styles.infoText}>
            To comply with financial regulations and protect your account, we need to
            verify your identity. This helps prevent fraud and ensures the security of
            your funds.
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>With verified identity you can:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
            <Text style={styles.featureText}>Send XRP to anyone</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
            <Text style={styles.featureText}>Buy XRP with card</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
            <Text style={styles.featureText}>Withdraw to bank account</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
            <Text style={styles.featureText}>Higher transaction limits</Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {Platform.OS === 'web' && (
          <View style={styles.webWarning}>
            <Ionicons name="phone-portrait-outline" size={20} color="#FFB800" />
            <Text style={styles.webWarningText}>
              Identity verification requires the mobile app
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, (isLoading || Platform.OS === 'web') && styles.buttonDisabled]}
            onPress={handleStartVerification}
            disabled={isLoading || Platform.OS === 'web'}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Start Verification</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  stepDotActive: {
    backgroundColor: '#00D4AA',
  },
  stepDotCompleted: {
    backgroundColor: '#00D4AA',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#00D4AA',
  },
  stepText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  infoCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0d2922',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#ccc',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  webWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  webWarningText: {
    color: '#FFB800',
    fontSize: 14,
  },
  buttons: {
    marginTop: 'auto',
  },
  button: {
    height: 56,
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#1a3d35',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#888',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
});
