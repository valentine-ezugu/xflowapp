import { Stack } from 'expo-router';

export default function AddFundsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="success"
        options={{
          gestureEnabled: false, // Prevent going back from success
        }}
      />
    </Stack>
  );
}
