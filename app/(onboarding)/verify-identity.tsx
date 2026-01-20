import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

export default function VerifyIdentityScreen() {
  const { startVerification, refreshKycStatus, isLoading, error, clearError } = useAuth();

  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(false);

  const handleStartVerification = async () => {
    try {
      const url = await startVerification();
      setVerificationUrl(url);
    } catch (err) {
      // Error handled by context
    }
  };

  const handleSkip = async () => {
    router.replace('/(tabs)');
  };

  const handleWebViewNavigationChange = async (navState: any) => {
    if (navState.url?.includes('success') || navState.url?.includes('complete')) {
      setVerificationUrl(null);
      await refreshKycStatus();
      router.replace('/(tabs)');
    }
  };

  // Show WebView if we have a verification URL
  if (verificationUrl) {
    return (
      <SafeAreaView style={styles.webviewContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.webviewHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setVerificationUrl(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Identity Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {webviewLoading && (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#00D4AA" />
          </View>
        )}

        <WebView
          source={{ uri: verificationUrl }}
          style={styles.webview}
          onLoadStart={() => setWebviewLoading(true)}
          onLoadEnd={() => setWebviewLoading(false)}
          onNavigationStateChange={handleWebViewNavigationChange}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
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

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleStartVerification}
            disabled={isLoading}
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
  // WebView styles
  webviewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  webviewLoading: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
});
