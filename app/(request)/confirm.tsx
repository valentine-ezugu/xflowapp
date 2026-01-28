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
import { XrpLogo } from '@/components/icons/XrpLogo';
import { api } from '@/services/api';

export default function ConfirmRequestScreen() {
  const params = useLocalSearchParams<{
    xflowTag: string;
    displayName: string;
    xrpAmount: string;
    fiatAmount: string;
    fiatCurrency: string;
    note: string;
  }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.payment.createRequest({
        recipientXflowTag: params.xflowTag,
        xrpAmount: xrpAmount.toString(),
        note: params.note || undefined,
      });

      // Navigate to success screen
      router.replace({
        pathname: '/(request)/success',
        params: {
          displayName: params.displayName,
          xrpAmount: xrpAmount.toString(),
          fiatAmount: fiatAmount.toString(),
          fiatCurrency: params.fiatCurrency,
          paymentId: response.paymentId.toString(),
        },
      });
    } catch (err: any) {
      console.error('Request failed:', err);
      setError(err.message || 'Failed to send request. Please try again.');
      setIsSubmitting(false);
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isSubmitting}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Amount display */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Request amount</Text>
        <Text style={styles.amountValue}>
          {currencySymbol}{fiatAmount.toFixed(2)}
        </Text>
        <View style={styles.xrpRow}>
          <View style={styles.xrpBadge}>
            <XrpLogo size={12} color="#fff" />
          </View>
          <Text style={styles.amountXrp}>
            {xrpAmount.toFixed(6)} XRP
          </Text>
        </View>
      </View>

      {/* Request details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>From</Text>
          <View style={styles.recipientInfo}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.avatarText}>
                {params.displayName?.charAt(0)?.toUpperCase() || 'X'}
              </Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>
              {params.displayName}
            </Text>
          </View>
        </View>

        {params.note ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Note</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {params.note}
            </Text>
          </View>
        ) : null}

        <View style={[styles.detailRow, styles.highlightRow]}>
          <Text style={styles.highlightLabel}>You'll receive</Text>
          <Text style={styles.highlightValue}>
            {xrpAmount.toFixed(6)} XRP
          </Text>
        </View>
      </View>

      {/* Info text */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#888" />
        <Text style={styles.infoText}>
          A payment request will be sent to {params.displayName}. They can choose to pay or decline the request.
        </Text>
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
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#000" style={styles.buttonLoader} />
              <Text style={styles.confirmButtonText}>Sending request...</Text>
            </>
          ) : (
            <Text style={styles.confirmButtonText}>Send request</Text>
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
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
