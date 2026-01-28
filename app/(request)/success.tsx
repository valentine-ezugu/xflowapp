import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { XrpLogo } from '@/components/icons/XrpLogo';

export default function RequestSuccessScreen() {
  const params = useLocalSearchParams<{
    displayName: string;
    xrpAmount: string;
    fiatAmount: string;
    fiatCurrency: string;
    paymentId: string;
  }>();

  const xrpAmount = parseFloat(params.xrpAmount) || 0;
  const fiatAmount = parseFloat(params.fiatAmount) || 0;

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      PLN: 'zł',
      NGN: '₦',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      KRW: '₩',
      BRL: 'R$',
      CHF: 'CHF',
      AUD: 'A$',
      CAD: 'C$',
      MXN: 'MX$',
      ZAR: 'R',
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = getCurrencySymbol(params.fiatCurrency || 'EUR');

  const handleDone = () => {
    // Go back to home screen
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={48} color="#000" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Request sent</Text>

        {/* Amount */}
        <Text style={styles.amount}>
          {currencySymbol}{fiatAmount.toFixed(2)}
        </Text>
        <View style={styles.xrpRow}>
          <View style={styles.xrpBadge}>
            <XrpLogo size={12} color="#fff" />
          </View>
          <Text style={styles.xrpAmount}>
            {xrpAmount.toFixed(6)} XRP
          </Text>
        </View>

        {/* Recipient info */}
        <Text style={styles.recipientText}>
          requested from
        </Text>
        <View style={styles.recipientBadge}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.avatarText}>
              {params.displayName?.charAt(0)?.toUpperCase() || 'X'}
            </Text>
          </View>
          <Text style={styles.recipientName}>{params.displayName}</Text>
        </View>

        {/* Status info */}
        <View style={styles.statusContainer}>
          <Ionicons name="time-outline" size={20} color="#888" />
          <Text style={styles.statusText}>
            Waiting for {params.displayName} to respond
          </Text>
        </View>
      </View>

      {/* Done button */}
      <View style={styles.footer}>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
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
  xrpBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xrpIcon: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  xrpAmount: {
    fontSize: 16,
    color: '#888',
  },
  recipientText: {
    fontSize: 15,
    color: '#888',
    marginTop: 24,
    marginBottom: 12,
  },
  recipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  recipientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#888',
  },
  footer: {
    padding: 16,
  },
  doneButton: {
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});
