import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[counterpartyId]" />
    </Stack>
  );
}
