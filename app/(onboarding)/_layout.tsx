import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="address" />
      <Stack.Screen name="verify-identity" />
    </Stack>
  );
}
