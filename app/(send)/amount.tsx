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
import { useAuth } from '@/context/AuthContext';

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
  const [inputMode, setInputMode] = useState<InputMode>('fiat');
  const [preview, setPreview] = useState<SendPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [note, setNote] = useState('');
  const [destinationTag, setDestinationTag] = useState('');

  const isExternalWallet = params.type === 'external';
  const recipientName = params.displayName || 'Unknown';

  // Get preview when amount changes
  useEffect(() => {
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (numAmount <= 0) {
      setPreview(null);
      return;
    }

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        // Send either fiatAmount or xrpAmount based on input mode
        const response = await api.transfer.getPreview({
          recipientTag: isExternalWallet ? undefined : params.xflowTag,
          destinationAddress: isExternalWallet ? params.address : undefined,
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
  }, [amount, inputMode, params.xflowTag, params.address, isExternalWallet]);

  // Initial preview to get exchange rate and balance
  useEffect(() => {
    const getInitialRate = async () => {
      try {
        const response = await api.transfer.getPreview({
          recipientTag: isExternalWallet ? undefined : params.xflowTag,
          destinationAddress: isExternalWallet ? params.address : undefined,
          xrpAmount: 1, // Small amount just to get rate and balance
        });
        setPreview(response);
      } catch (error) {
        console.error('Failed to get initial rate:', error);
      }
    };
    getInitialRate();
  }, []);

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
        // Limit decimal places
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

    // Convert current amount to the other mode
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;

    if (inputMode === 'fiat') {
      // Switching to XRP: convert fiat to XRP
      const xrpValue = numAmount / preview.xrpRate;
      setAmount(xrpValue > 0 ? xrpValue.toFixed(4).replace('.', ',') : '0');
      setInputMode('xrp');
    } else {
      // Switching to fiat: convert XRP to fiat
      const fiatValue = numAmount * preview.xrpRate;
      setAmount(fiatValue > 0 ? fiatValue.toFixed(2).replace('.', ',') : '0');
      setInputMode('fiat');
    }
  };

  const handleMaxPress = () => {
    if (!preview) return;

    if (inputMode === 'xrp') {
      setAmount(preview.spendableXrp.toFixed(4).replace('.', ','));
    } else {
      const maxFiat = preview.spendableXrp * preview.xrpRate;
      setAmount(maxFiat.toFixed(2).replace('.', ','));
    }
  };

  const handleContinue = () => {
    if (!preview || preview.totalXrp <= 0) return;

    if (preview.totalXrp > preview.spendableXrp) {
      Alert.alert('Insufficient balance', 'You don\'t have enough XRP to complete this transfer.');
      return;
    }

    // Navigate to confirmation screen with all the preview data
    router.push({
      pathname: '/(send)/confirm',
      params: {
        type: params.type,
        recipientTag: params.xflowTag || '',
        address: params.address || '',
        displayName: recipientName,
        xrpAmount: preview.totalXrp.toString(),
        fiatAmount: preview.totalFiat.toString(),
        fiatCurrency: preview.fiatCurrency,
        feeXrp: preview.feeXrp.toString(),
        feeFiat: preview.feeFiat.toString(),
        recipientGetsXrp: preview.recipientGetsXrp.toString(),
        recipientGetsFiat: preview.recipientGetsFiat.toString(),
        note: note,
        destinationTag: destinationTag,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

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

  // Use preview currency when available, fall back to user's default currency
  const fiatCurrency = preview?.fiatCurrency || user?.defaultCurrency || 'EUR';
  const currencySymbol = getCurrencySymbol(fiatCurrency);
  const canContinue = preview && preview.totalXrp > 0 && preview.totalXrp <= preview.spendableXrp;

  // Display values - show what recipient gets (after fees for external)
  const displayAmount = amount;
  const displaySecondary = isLoadingPreview
    ? '...'
    : inputMode === 'fiat'
      ? `≈ ${preview?.recipientGetsXrp?.toFixed(4) || '0'} XRP`
      : `≈ ${currencySymbol}${preview?.recipientGetsFiat?.toFixed(2) || '0'}`;

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
                {recipientName.charAt(1)?.toUpperCase() || 'X'}
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
          <Text style={styles.amountText}>{displayAmount}</Text>
          {inputMode === 'xrp' && (
            <Text style={styles.xrpLabel}> XRP</Text>
          )}
        </TouchableOpacity>

        {/* Toggle indicator and secondary value */}
        <TouchableOpacity style={styles.secondaryRow} onPress={handleToggleMode}>
          <Ionicons name="swap-vertical" size={16} color="#888" />
          {isLoadingPreview ? (
            <ActivityIndicator size="small" color="#888" style={styles.loadingIndicator} />
          ) : (
            <Text style={styles.secondaryText}>{displaySecondary}</Text>
          )}
        </TouchableOpacity>

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
            {preview?.spendableXrp?.toFixed(4) || '0'} XRP
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
