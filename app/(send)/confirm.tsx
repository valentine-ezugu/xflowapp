import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { SendXrpResponse } from '@/types/transfer';

export default function ConfirmSendScreen() {
  const params = useLocalSearchParams<{
    type: string;
    recipientTag: string;
    address: string;
    displayName: string;
    totalXrp: string;
    totalFiat: string;
    fiatCurrency: string;
    feeXrp: string;
    feeFiat: string;
    recipientGetsXrp: string;
    recipientGetsFiat: string;
    note: string;
    destinationTag: string;
  }>();

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExternal = params.type === 'external';
  const totalXrp = parseFloat(params.totalXrp) || 0; // Total XRP being sent (used for API call)
  const feeXrp = parseFloat(params.feeXrp) || 0;
  const feeFiat = parseFloat(params.feeFiat) || 0;
  const recipientGetsXrp = parseFloat(params.recipientGetsXrp) || 0;
  const recipientGetsFiat = parseFloat(params.recipientGetsFiat) || 0;

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

  const handleConfirm = async () => {
    setIsSending(true);
    setError(null);

    try {
      let response: SendXrpResponse;

      if (isExternal) {
        response = await api.transfer.sendExternal({
          destinationAddress: params.address,
          xrpAmount: totalXrp,
          destinationTag: params.destinationTag ? parseInt(params.destinationTag, 10) : undefined,
          note: params.note || undefined,
        });
      } else {
        response = await api.transfer.sendInternal({
          recipientXflowTag: params.recipientTag,
          xrpAmount: totalXrp,
          note: params.note || undefined,
        });
      }

      // Navigate to success screen
      router.replace({
        pathname: '/(send)/success',
        params: {
          type: params.type,
          displayName: params.displayName,
          xrpAmount: recipientGetsXrp.toString(),
          fiatAmount: recipientGetsFiat.toString(),
          fiatCurrency: params.fiatCurrency,
          txHash: response.txHash || '',
          status: response.status,
          transactionId: response.transactionId.toString(),
        },
      });
    } catch (err: any) {
      console.error('Send failed:', err);
      setError(err.message || 'Failed to send. Please try again.');
      setIsSending(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isSending}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Send</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Amount display - show what recipient gets */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Recipient gets</Text>
        <Text style={styles.amountValue}>
          {currencySymbol}{recipientGetsFiat.toFixed(2)}
        </Text>
        <View style={styles.xrpRow}>
          <View style={styles.xrpBadge}>
            <Text style={styles.xrpIcon}>✕</Text>
          </View>
          <Text style={styles.amountXrp}>
            {recipientGetsXrp.toFixed(4)} XRP
          </Text>
        </View>
      </View>

      {/* Recipient */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>To</Text>
          <View style={styles.recipientInfo}>
            {isExternal ? (
              <Ionicons name="wallet" size={16} color="#888" style={styles.recipientIcon} />
            ) : (
              <View style={styles.recipientAvatar}>
                <Text style={styles.avatarText}>
                  {params.displayName?.charAt(1)?.toUpperCase() || 'X'}
                </Text>
              </View>
            )}
            <Text style={styles.detailValue} numberOfLines={1}>
              {params.displayName}
            </Text>
          </View>
        </View>

        {/* Fee (only for external) */}
        {isExternal && feeXrp > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total fee</Text>
            <Text style={styles.detailValue}>
              {feeXrp.toFixed(4)} XRP ({currencySymbol}{feeFiat.toFixed(2)})
            </Text>
          </View>
        )}

        {/* Recipient gets */}
        <View style={[styles.detailRow, styles.highlightRow]}>
          <Text style={styles.highlightLabel}>Recipient gets</Text>
          <Text style={styles.highlightValue}>
            {recipientGetsXrp.toFixed(4)} XRP
          </Text>
        </View>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isSending && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <ActivityIndicator size="small" color="#000" style={styles.buttonLoader} />
              <Text style={styles.confirmButtonText}>Sending...</Text>
            </>
          ) : (
            <Text style={styles.confirmButtonText}>Confirm send</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  amountLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  amountValue: {
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
  amountXrp: {
    fontSize: 16,
    color: '#888',
  },
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    fontSize: 15,
    color: '#888',
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    maxWidth: 200,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientIcon: {
    marginRight: 8,
  },
  recipientAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  highlightRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  highlightLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  highlightValue: {
    fontSize: 15,
    color: '#00D4AA',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2d1a1a',
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
  },
  footer: {
    marginTop: 'auto',
    padding: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#666',
  },
  buttonLoader: {
    marginRight: 8,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});
