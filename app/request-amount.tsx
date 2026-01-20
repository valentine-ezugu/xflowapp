import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { SendPreviewResponse } from '@/types/transfer';

const NUMBER_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
];

type InputMode = 'fiat' | 'xrp';

export default function RequestAmountScreen() {
  const params = useLocalSearchParams<{
    userId: string;
    displayName: string;
    xflowTag: string;
  }>();

  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('fiat');
  const [preview, setPreview] = useState<SendPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [note, setNote] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const recipientName = params.displayName || 'Unknown';

  // Get preview for exchange rate
  useEffect(() => {
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (numAmount <= 0) {
      return;
    }

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const response = await api.transfer.getPreview({
          recipientTag: params.xflowTag,
          xrpAmount: inputMode === 'xrp' ? numAmount : undefined,
          fiatAmount: inputMode === 'fiat' ? numAmount : undefined,
        });
        setPreview(response);
      } catch (error) {
        console.error('Failed to get preview:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [amount, inputMode, params.xflowTag]);

  // Initial preview to get exchange rate
  useEffect(() => {
    const getInitialRate = async () => {
      try {
        const response = await api.transfer.getPreview({
          recipientTag: params.xflowTag,
          xrpAmount: 1,
        });
        setPreview(response);
      } catch (error) {
        console.error('Failed to get initial rate:', error);
      }
    };
    getInitialRate();
  }, [params.xflowTag]);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      if (amount.length <= 1) {
        setAmount('0');
      } else {
        setAmount(amount.slice(0, -1));
      }
    } else if (key === ',') {
      if (!amount.includes(',')) {
        setAmount(amount + ',');
      }
    } else {
      if (amount === '0') {
        setAmount(key);
      } else {
        const parts = amount.split(',');
        const maxDecimals = inputMode === 'fiat' ? 2 : 6;
        if (parts.length === 2 && parts[1].length >= maxDecimals) {
          return;
        }
        setAmount(amount + key);
      }
    }
  };

  const handleToggleMode = () => {
    if (!preview) return;

    const numAmount = parseFloat(amount.replace(',', '.')) || 0;

    if (inputMode === 'fiat') {
      const xrpValue = numAmount / preview.xrpRate;
      setAmount(xrpValue > 0 ? xrpValue.toFixed(4).replace('.', ',') : '0');
      setInputMode('xrp');
    } else {
      const fiatValue = numAmount * preview.xrpRate;
      setAmount(fiatValue > 0 ? fiatValue.toFixed(2).replace('.', ',') : '0');
      setInputMode('fiat');
    }
  };

  const handleRequest = async () => {
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (numAmount <= 0) return;

    // Calculate XRP amount
    let xrpAmount = numAmount;
    if (inputMode === 'fiat' && preview) {
      xrpAmount = numAmount / preview.xrpRate;
    }

    setIsRequesting(true);
    try {
      await api.payment.createRequest({
        recipientXflowTag: params.xflowTag,
        xrpAmount: xrpAmount.toString(),
        note: note || undefined,
      });

      // Navigate back to conversation
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const fiatCurrency = preview?.fiatCurrency || 'EUR';
  const currencySymbol = getCurrencySymbol(fiatCurrency);
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const canRequest = numAmount > 0;

  const displaySecondary = isLoadingPreview
    ? '...'
    : inputMode === 'fiat'
      ? `≈ ${preview ? (numAmount / preview.xrpRate).toFixed(4) : '0'} XRP`
      : `≈ ${currencySymbol}${preview ? (numAmount * preview.xrpRate).toFixed(2) : '0'}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.recipientBadge}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.avatarText}>
              {recipientName.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.recipientName}>Request from {recipientName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <TouchableOpacity style={styles.amountRow} onPress={handleToggleMode}>
          <Text style={styles.currencySymbol}>
            {inputMode === 'fiat' ? currencySymbol : ''}
          </Text>
          <Text style={styles.amountText}>{amount}</Text>
          {inputMode === 'xrp' && (
            <Text style={styles.xrpLabel}> XRP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryRow} onPress={handleToggleMode}>
          <Ionicons name="swap-vertical" size={16} color="#888" />
          {isLoadingPreview ? (
            <ActivityIndicator size="small" color="#888" style={styles.loadingIndicator} />
          ) : (
            <Text style={styles.secondaryText}>{displaySecondary}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Number Pad */}
      <View style={styles.numberPad}>
        {NUMBER_PAD.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.numberKey}
                onPress={() => handleKeyPress(key)}
              >
                {key === 'backspace' ? (
                  <Ionicons name="backspace-outline" size={24} color="#fff" />
                ) : (
                  <Text style={styles.numberKeyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Note Input and Request Button */}
      <View style={styles.bottomContainer}>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note (optional)"
          placeholderTextColor="#666"
          value={note}
          onChangeText={setNote}
        />
        <TouchableOpacity
          style={[styles.requestButton, !canRequest && styles.requestButtonDisabled]}
          onPress={handleRequest}
          disabled={!canRequest || isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="arrow-down" size={20} color={canRequest ? '#000' : '#666'} />
              <Text style={[styles.requestButtonText, !canRequest && styles.requestButtonTextDisabled]}>
                Request
              </Text>
            </>
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
  recipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  amountContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#888',
    marginBottom: 12,
    marginRight: 4,
  },
  amountText: {
    fontSize: 72,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -2,
  },
  xrpLabel: {
    fontSize: 24,
    fontWeight: '300',
    color: '#888',
    marginBottom: 12,
    marginLeft: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  loadingIndicator: {
    marginLeft: 4,
  },
  secondaryText: {
    fontSize: 16,
    color: '#888',
  },
  numberPad: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberKey: {
    width: 80,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberKeyText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#fff',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  noteInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#fff',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    gap: 8,
  },
  requestButtonDisabled: {
    backgroundColor: '#333',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  requestButtonTextDisabled: {
    color: '#666',
  },
});
