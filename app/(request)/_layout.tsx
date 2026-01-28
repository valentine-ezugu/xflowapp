import { Stack } from 'expo-router';

export default function RequestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="amount" />
      <Stack.Screen name="confirm" />
      <Stack.Screen
        name="success"
        options={{
          gestureEnabled: false, // Prevent going back from success
        }}
      />
    </Stack>
  );
}
