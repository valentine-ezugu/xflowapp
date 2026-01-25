import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';

// Stripe - only import on native platforms (not web)
let StripeProvider: any = null;
if (Platform.OS !== 'web') {
  StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
}

// Stripe publishable key - should be in env variables in production
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Qf2k5Fp5uEHGwI8QgtiGvgO2pgchHtqV10GTHCqXiK0aeAC3TkyhTNYWJagiseFyf0cflfhog5FCyQXlj8b2tyo00YKrDNyJZ';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const appContent = (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(send)" />
          <Stack.Screen name="(request)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="transaction-details" options={{ headerShown: true, presentation: 'card', title: 'Transaction Details' }} />
          <Stack.Screen name="+not-found" options={{ headerShown: true }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );

  // Wrap with StripeProvider on native platforms only
  if (Platform.OS !== 'web' && StripeProvider) {
    return (
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        {appContent}
      </StripeProvider>
    );
  }

  return appContent;
}
