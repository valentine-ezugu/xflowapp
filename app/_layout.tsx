import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/context/AuthContext';
import { PaymentsProvider } from '@/context/PaymentsContext';

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

    // Set Android navigation bar to dark
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#000000');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const appContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PaymentsProvider>
          <ThemeProvider value={DarkTheme}>
            <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(send)" />
              <Stack.Screen name="(request)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="activity" />
              <Stack.Screen name="transaction-details" />
              <Stack.Screen name="+not-found" options={{ headerShown: true }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </PaymentsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
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
