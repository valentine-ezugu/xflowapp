import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AddFundsSuccessScreen() {
  const params = useLocalSearchParams<{
    amount: string;
    currency: string;
    xrpAmount: string;
  }>();

  const amount = parseFloat(params.amount || '0');
  const currency = params.currency || 'EUR';
  const xrpAmount = parseFloat(params.xrpAmount || '0');

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      PLN: 'zł',
      NGN: '₦',
    };
    return symbols[curr] || curr;
  };

  const currencySymbol = getCurrencySymbol(currency);

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={48} color="#00D4AA" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Funds Added!</Text>

        {/* Amount */}
        <Text style={styles.amount}>
          {currencySymbol}{amount.toFixed(2)}
        </Text>

        {/* XRP equivalent */}
        <View style={styles.xrpRow}>
          <Text style={styles.xrpText}>≈ {xrpAmount.toFixed(6)} XRP</Text>
        </View>

        {/* Info message */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#888" />
          <Text style={styles.infoText}>
            Your XRP will be credited to your wallet shortly. This usually takes a few seconds.
          </Text>
        </View>
      </View>

      {/* Done Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -1,
  },
  xrpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  xrpText: {
    fontSize: 18,
    color: '#888',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  doneButton: {
    backgroundColor: '#00D4AA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});
