import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

/**
 * Root index - redirects based on auth state
 */
export default function Index() {
  const { status, kycStatus } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      // Not logged in - go to login
      router.replace('/(auth)/login');
      return;
    }

    // Authenticated - check KYC status
    if (status === 'authenticated') {
      if (!kycStatus) {
        // Still loading KYC status
        return;
      }

      if (kycStatus.kycTier === 'NONE') {
        // Needs to complete profile
        router.replace('/(onboarding)/personal-info');
      } else if (kycStatus.kycTier === 'LEVEL0' && !kycStatus.canOperate) {
        // Has profile but needs ID verification
        router.replace('/(onboarding)/verify-identity');
      } else {
        // Fully onboarded
        router.replace('/(tabs)');
      }
    }
  }, [status, kycStatus]);

  // Show loading spinner while determining route
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6C5CE7" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
