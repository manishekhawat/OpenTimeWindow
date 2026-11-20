import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1b1712' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="window" options={{ animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
