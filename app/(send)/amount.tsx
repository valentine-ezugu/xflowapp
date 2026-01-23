import React, { useState, useEffect, useCallback } from 'react';
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

export default function SendAmountScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    type: string; // 'user' or 'external'
    xflowTag?: string; // For user transfers
    address?: string; // For external transfers
    displayName: string;
  }>();

  const [amount, setAmount] = useState('0');
  const [inputMode, setInputMode] = useState<InputMode>('xrp'); // XRP primary - we're a crypto app
  const [preview, setPreview] = useState<SendPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [note, setNote] = useState('');
  const [destinationTag, setDestinationTag] = useState('');

  const isExternalWallet = params.type === 'external';
  const recipientName = params.displayName || 'Unknown';

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

  const getErrorMessage = (p?: SendPreviewResponse | null) => {
    if (!p) return null;
    switch (p.reason) {
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient balance';
      case 'INSUFFICIENT_NETWORK_FEE':
        return 'Insufficient funds to pay network fee';
      case 'INSUFFICIENT_TOTAL_FEES':
        return 'Insufficient funds to cover fees';
      case 'RATE_UNAVAILABLE':
        return 'Rate unavailable';
      default:
        return null;
    }
  };

  const fiatCurrency = preview?.fiatCurrency || user?.defaultCurrency || 'EUR';
  const currencySymbol = getCurrencySymbol(fiatCurrency);

  // Fetch a minimal preview on focus to refresh balance/rate
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchBootstrapPreview = async () => {
        try {
          const response = await api.transfer.getPreview({
            recipientTag: isExternalWallet ? undefined : params.xflowTag,
            destinationAddress: isExternalWallet ? params.address : undefined,
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
    }, [isExternalWallet, params.xflowTag, params.address])
  );

  // Debounced preview for typing
  useEffect(() => {
    const numAmount = parseAmount(amount);
    if (numAmount <= 0) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const response = await api.transfer.getPreview({
          recipientTag: isExternalWallet ? undefined : params.xflowTag,
          destinationAddress: isExternalWallet ? params.address : undefined,
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
  }, [amount, inputMode, params.xflowTag, params.address, isExternalWallet]);

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

  /**
   * MoonPay-style Max:
   * - call backend with useMax=true so backend clamps after fees
   * - then set the input box to maxSendFiat/maxSendXrp depending on mode
   */
  const handleMaxPress = async () => {
    try {
      setIsLoadingPreview(true);

      const response: SendPreviewResponse = await api.transfer.getPreview({
        recipientTag: isExternalWallet ? undefined : params.xflowTag,
        destinationAddress: isExternalWallet ? params.address : undefined,
        // send any small positive input; backend will clamp because useMax=true
        xrpAmount: inputMode === 'xrp' ? 0.0001 : undefined,
        fiatAmount: inputMode === 'fiat' ? 0.01 : undefined,
        useMax: true,
      });

      setPreview(response);

      if (inputMode === 'xrp') {
        setAmount(formatXrp(response.maxXrp));
      } else {
        setAmount(formatFiat(response.maxFiat));
      }
    } catch (e) {
      console.error('Max preview failed:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleContinue = () => {
    if (!preview) return;

    const err = getErrorMessage(preview);
    if (!preview.sufficient) {
      Alert.alert('Cannot continue', err || 'Invalid amount');
      return;
    }

    if (preview.totalXrp <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }

    router.push({
      pathname: '/(send)/confirm',
      params: {
        type: params.type,
        recipientTag: params.xflowTag || '',
        address: params.address || '',
        displayName: recipientName,

        // amounts
        totalXrp: preview.totalXrp.toString(),
        totalFiat: preview.totalFiat.toString(),

        fiatCurrency: preview.fiatCurrency,
        feeXrp: preview.feeXrp.toString(),
        feeFiat: preview.feeFiat.toString(),
        recipientGetsXrp: preview.recipientGetsXrp.toString(),
        recipientGetsFiat: preview.recipientGetsFiat.toString(),
        networkFeeXrp: preview.networkFeeXrp.toString(),
        platformFeeXrp: preview.platformFeeXrp.toString(),
        destinationType: preview.destinationType,

        note,
        destinationTag,
      },
    });
  };

  const handleBack = () => router.back();

  const errorText = getErrorMessage(preview);
  const canContinue = !!preview && preview.sufficient && preview.totalXrp > 0;

  // Secondary shows fiat equivalent when in XRP mode (primary), XRP when in fiat mode
  const displaySecondary = isLoadingPreview
    ? '...'
    : inputMode === 'xrp'
      ? `≈ ${currencySymbol}${preview ? preview.recipientGetsFiat.toFixed(2) : '0'}`
      : `≈ ${preview ? preview.recipientGetsXrp.toFixed(6) : '0'} XRP`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.recipientBadge}>
          {isExternalWallet ? (
            <View style={[styles.recipientAvatar, styles.walletAvatar]}>
              <Ionicons name="wallet" size={14} color="#fff" />
            </View>
          ) : (
            <View style={styles.recipientAvatar}>
              <Text style={styles.avatarText}>
                {recipientName.charAt(0)?.toUpperCase() || 'X'}
              </Text>
            </View>
          )}
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

        {/* Error line (MoonPay-style) */}
        {errorText && <Text style={styles.errorText}>{errorText}</Text>}

        {/* Max Button */}
        <TouchableOpacity style={styles.maxButton} onPress={handleMaxPress}>
          <Text style={styles.maxButtonText}>Max</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet selector (showing balance) */}
      <View style={styles.walletSelector}>
        <View style={styles.walletInfo}>
          <View style={styles.xrpIcon}>
            <Text style={styles.xrpIconText}>✕</Text>
          </View>
          <View>
            <Text style={styles.walletLabel}>XRP</Text>
            <Text style={styles.walletNetwork}>XRP • XRPL</Text>
          </View>
        </View>

        <View style={styles.walletBalance}>
          <Text style={styles.balanceAmount}>
            {currencySymbol}
            {preview ? (preview.spendableXrp * preview.xrpRate).toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.balanceXrp}>
            {preview ? preview.spendableXrp.toFixed(6) : '0'} XRP
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#666" />
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

      {/* Note / Destination Tag Input */}
      <View style={styles.noteContainer}>
        <TextInput
          style={styles.noteInput}
          placeholder={isExternalWallet ? 'Ripple memo tag' : 'Add a note'}
          placeholderTextColor="#666"
          value={isExternalWallet ? destinationTag : note}
          onChangeText={isExternalWallet ? setDestinationTag : setNote}
          keyboardType={isExternalWallet ? 'number-pad' : 'default'}
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
  walletAvatar: {
    backgroundColor: '#333',
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
  errorText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#ff8a00',
  },
  maxButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#222',
    borderRadius: 16,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  xrpIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xrpIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  walletLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  walletNetwork: {
    fontSize: 12,
    color: '#888',
  },
  walletBalance: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  balanceXrp: {
    fontSize: 12,
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
  noteContainer: {
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
