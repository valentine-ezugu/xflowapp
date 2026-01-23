import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { SendPreviewResponse } from '@/types/transfer';

const NUMBER_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
];

type InputMode = 'fiat' | 'xrp';

export default function RequestAmountScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    xflowTag: string;
    displayName: string;
  }>();

  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('xrp'); // XRP primary - we're a crypto app
  const [preview, setPreview] = useState<SendPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [note, setNote] = useState('');

  const recipientName = params.displayName || params.xflowTag || 'Unknown';

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

  const parseAmount = (s: string) => {
    const num = parseFloat((s || '0').replace(',', '.'));
    return Number.isFinite(num) ? num : 0;
  };

  const formatFiat = (n: number) => n.toFixed(2).replace('.', ',');
  const formatXrp = (n: number) => n.toFixed(6).replace('.', ',');

  const fiatCurrency = preview?.fiatCurrency || user?.defaultCurrency || 'EUR';
  const currencySymbol = getCurrencySymbol(fiatCurrency);

  // Fetch a minimal preview on focus to get current rate
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchBootstrapPreview = async () => {
        try {
          // Use the send preview endpoint to get the rate
          // We pass recipientTag for internal transfer (no fees)
          const response = await api.transfer.getPreview({
            recipientTag: params.xflowTag,
            xrpAmount: 0.0001, // minimal amount for bootstrap
            useMax: false,
          });

          if (!cancelled) setPreview(response);
        } catch (error) {
          console.error('Failed to fetch bootstrap preview:', error);
        }
      };

      fetchBootstrapPreview();

      return () => {
        cancelled = true;
      };
    }, [params.xflowTag])
  );

  // Debounced preview for typing
  useEffect(() => {
    const numAmount = parseAmount(amount);
    if (numAmount <= 0) {
      return;
    }

    let cancelled = false;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const response = await api.transfer.getPreview({
          recipientTag: params.xflowTag,
          xrpAmount: inputMode === 'xrp' ? numAmount : undefined,
          fiatAmount: inputMode === 'fiat' ? numAmount : undefined,
          useMax: false,
        });

        if (!cancelled) setPreview(response);
      } catch (error) {
        console.error('Failed to get preview:', error);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount, inputMode, params.xflowTag]);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      if (amount.length <= 1) setAmount('0');
      else setAmount(amount.slice(0, -1));
      return;
    }

    if (key === ',') {
      if (!amount.includes(',')) setAmount(amount + ',');
      return;
    }

    // digit
    if (amount === '0') {
      setAmount(key);
      return;
    }

    // Limit decimal places
    const parts = amount.split(',');
    const maxDecimals = inputMode === 'fiat' ? 2 : 6;
    if (parts.length === 2 && parts[1].length >= maxDecimals) return;

    setAmount(amount + key);
  };

  const handleToggleMode = () => {
    if (!preview) return;

    const numAmount = parseAmount(amount);
    if (numAmount <= 0) {
      setInputMode(inputMode === 'fiat' ? 'xrp' : 'fiat');
      return;
    }

    if (inputMode === 'fiat') {
      // fiat -> xrp
      const xrpValue = preview.xrpRate > 0 ? numAmount / preview.xrpRate : 0;
      setAmount(xrpValue > 0 ? formatXrp(xrpValue) : '0');
      setInputMode('xrp');
    } else {
      // xrp -> fiat
      const fiatValue = numAmount * preview.xrpRate;
      setAmount(fiatValue > 0 ? formatFiat(fiatValue) : '0');
      setInputMode('fiat');
    }
  };

  const handleContinue = () => {
    if (!preview) return;

    const numAmount = parseAmount(amount);
    if (numAmount <= 0) return;

    // Calculate XRP amount to request
    const xrpAmount = inputMode === 'xrp'
      ? numAmount
      : (preview.xrpRate > 0 ? numAmount / preview.xrpRate : 0);

    const fiatAmount = inputMode === 'fiat'
      ? numAmount
      : numAmount * preview.xrpRate;

    router.push({
      pathname: '/(request)/confirm',
      params: {
        xflowTag: params.xflowTag,
        displayName: recipientName,
        xrpAmount: xrpAmount.toString(),
        fiatAmount: fiatAmount.toString(),
        fiatCurrency: preview.fiatCurrency,
        note,
      },
    });
  };

  const handleBack = () => router.back();

  const numAmount = parseAmount(amount);
  const canContinue = numAmount > 0 && preview;

  // Secondary shows fiat equivalent when in XRP mode (primary), XRP when in fiat mode
  const displaySecondary = isLoadingPreview
    ? '...'
    : inputMode === 'xrp'
      ? `≈ ${currencySymbol}${preview ? (numAmount * preview.xrpRate).toFixed(2) : '0'}`
      : `≈ ${preview ? (numAmount / preview.xrpRate).toFixed(6) : '0'} XRP`;

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
              {recipientName.charAt(0)?.toUpperCase() || 'X'}
            </Text>
          </View>
          <Text style={styles.recipientName}>{recipientName}</Text>
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
          {inputMode === 'xrp' && <Text style={styles.xrpLabel}> XRP</Text>}
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

      {/* Bottom bar with note and continue */}
      <View style={styles.bottomBar}>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note (optional)"
          placeholderTextColor="#666"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Ionicons name="arrow-forward" size={24} color={canContinue ? '#000' : '#666'} />
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
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  recipientName: {
    fontSize: 14,
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
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginRight: 4,
  },
  amountText: {
    fontSize: 64,
    fontWeight: '200',
    color: '#fff',
  },
  xrpLabel: {
    fontSize: 24,
    fontWeight: '300',
    color: '#888',
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
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  numberKey: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  numberKeyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
  },
  bottomBar: {
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
  continueButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#333',
  },
});
