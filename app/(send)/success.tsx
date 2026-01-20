import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SendSuccessScreen() {
  const params = useLocalSearchParams<{
    type: string;
    displayName: string;
    xrpAmount: string;
    fiatAmount: string;
    fiatCurrency: string;
    txHash: string;
    status: string;
    transactionId: string;
  }>();

  const isExternal = params.type === 'wallet';
  const xrpAmount = parseFloat(params.xrpAmount) || 0;
  const isProcessing = params.status === 'PROCESSING';

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const currencySymbol = getCurrencySymbol(params.fiatCurrency || 'EUR');

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  const handleViewTransaction = () => {
    if (params.txHash) {
      // Open XRPL explorer
      const explorerUrl = `https://livenet.xrpl.org/transactions/${params.txHash}`;
      Linking.openURL(explorerUrl);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color="#000" />
          </View>
        </View>

        {/* Success message */}
        <Text style={styles.title}>
          Your send to
        </Text>
        <Text style={styles.recipient} numberOfLines={2}>
          {params.displayName}
        </Text>
        <Text style={styles.title}>
          has been {isProcessing ? 'submitted' : 'completed'}.
        </Text>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountValue}>
            {xrpAmount.toFixed(4)} XRP
          </Text>
        </View>

        {/* Processing info for external */}
        {isExternal && isProcessing && (
          <Text style={styles.processingText}>
            You can track its progress using the button below.
          </Text>
        )}

        {/* Transaction time info */}
        {isExternal && (
          <Text style={styles.infoText}>
            This transaction usually takes less than ~5 seconds.
          </Text>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Got it</Text>
        </TouchableOpacity>

        {isExternal && params.txHash && (
          <TouchableOpacity style={styles.viewButton} onPress={handleViewTransaction}>
            <Text style={styles.viewButtonText}>View transaction</Text>
          </TouchableOpacity>
        )}
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
  iconContainer: {
    marginBottom: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  recipient: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 4,
    maxWidth: '90%',
  },
  amountContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00D4AA',
  },
  processingText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    padding: 16,
    gap: 12,
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
  viewButton: {
    height: 56,
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
