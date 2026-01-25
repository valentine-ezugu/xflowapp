import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { PaymentOption } from '@/types/settings';
import { BuyXrpQuoteResponse } from '@/types/topup';

const NUMBER_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
];

export default function AddFundsScreen() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('0');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<BuyXrpQuoteResponse | null>(null);
  const [cards, setCards] = useState<PaymentOption[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentOption | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [showCardPicker, setShowCardPicker] = useState(false);

  const fiatCurrency = user?.defaultCurrency || 'EUR';

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

  const currencySymbol = getCurrencySymbol(fiatCurrency);

  const parseAmount = (s: string) => {
    const num = parseFloat((s || '0').replace(',', '.'));
    return Number.isFinite(num) ? num : 0;
  };

  const getCardBrandIcon = (brand: string) => {
    const b = brand.toLowerCase();
    if (b.includes('visa')) return 'card';
    if (b.includes('mastercard') || b.includes('master')) return 'card';
    if (b.includes('amex')) return 'card';
    return 'card-outline';
  };

  // Load cards on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadCards = async () => {
        try {
          setIsLoadingCards(true);
          const cardList = await api.paymentOption.getList();
          if (!cancelled) {
            setCards(cardList);
            // Auto-select single card
            if (cardList.length === 1) {
              setSelectedCard(cardList[0]);
            } else if (cardList.length > 0 && !selectedCard) {
              // If we have cards but none selected, select first
              setSelectedCard(cardList[0]);
            }
          }
        } catch (error) {
          console.error('Failed to load cards:', error);
        } finally {
          if (!cancelled) setIsLoadingCards(false);
        }
      };

      loadCards();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Debounced preview as user types
  useEffect(() => {
    const fiatAmount = parseAmount(amount);

    // Don't fetch preview for amounts below minimum
    if (fiatAmount < 1) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const response = await api.topUp.getPreview({
          fiatAmount,
          currency: fiatCurrency,
        });
        if (!cancelled) {
          setPreview(response);
        }
      } catch (error) {
        console.error('Failed to get preview:', error);
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };

    // Debounce the preview request
    const timer = setTimeout(fetchPreview, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount, fiatCurrency]);

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

    // Limit decimal places to 2 for fiat
    const parts = amount.split(',');
    if (parts.length === 2 && parts[1].length >= 2) return;

    setAmount(amount + key);
  };

  const fiatAmount = parseAmount(amount);
  const netXrp = preview?.netXrp ?? 0;
  const minimumFiat = preview?.minimumFiat ?? 5;
  const isValidAmount = preview?.valid ?? false;
  const errorMessage = preview?.errorMessage;
  const canContinue = isValidAmount && selectedCard !== null && !isLoadingPreview;

  const handleSelectCard = (card: PaymentOption) => {
    setSelectedCard(card);
    setShowCardPicker(false);
  };

  const handleAddCard = () => {
    router.push('/settings/add-card');
  };

  const handleContinue = async () => {
    if (!selectedCard || !isValidAmount) return;

    try {
      setIsSubmitting(true);
      const response = await api.topUp.createIntent({
        amount: fiatAmount,
        currency: fiatCurrency,
        paymentOptionId: selectedCard.id,
      });

      // Check if requires additional action (3DS)
      if (response.status === 'REQUIRES_ACTION' && response.clientSecret) {
        // TODO: Handle 3DS authentication
        Alert.alert('Authentication Required', 'Please complete authentication in your browser.');
        return;
      }

      if (response.status === 'SUCCEEDED' || response.status === 'PROCESSING' || response.status === 'INITIATED') {
        router.replace({
          pathname: '/(add-funds)/success',
          params: {
            amount: fiatAmount.toString(),
            currency: fiatCurrency,
            xrpAmount: netXrp.toFixed(6),
          },
        });
      } else if (response.status === 'FAILED') {
        Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
      }
    } catch (error: any) {
      console.error('Top-up failed:', error);
      Alert.alert('Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Funds</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{currencySymbol}</Text>
          <Text style={styles.amountText}>{amount}</Text>
        </View>

        <View style={styles.secondaryRow}>
          <Ionicons name="swap-vertical" size={16} color="#888" />
          {isLoadingPreview ? (
            <ActivityIndicator size="small" color="#888" style={styles.loadingIndicator} />
          ) : (
            <Text style={styles.secondaryText}>
              ≈ {netXrp.toFixed(6)} XRP
            </Text>
          )}
        </View>

        {/* Show fee breakdown when we have a valid preview */}
        {preview && preview.valid && fiatAmount > 0 && (
          <View style={styles.feeInfo}>
            <Text style={styles.feeText}>
              Includes {(preview.markupBps / 100).toFixed(1)}% spread + {preview.totalFeeXrp.toFixed(4)} XRP fees
            </Text>
          </View>
        )}

        {/* Error message from preview */}
        {errorMessage && fiatAmount > 0 && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Payment Method Selector */}
      <TouchableOpacity
        style={styles.paymentSelector}
        onPress={() => cards.length > 1 ? setShowCardPicker(!showCardPicker) : handleAddCard()}
        disabled={isLoadingCards}
      >
        {isLoadingCards ? (
          <ActivityIndicator size="small" color="#888" />
        ) : cards.length === 0 ? (
          <>
            <View style={styles.addCardIcon}>
              <Ionicons name="add" size={20} color="#00D4AA" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.addCardText}>Add Payment Method</Text>
              <Text style={styles.cardSubtext}>Add a card to continue</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </>
        ) : (
          <>
            <View style={styles.cardIcon}>
              <Ionicons name={getCardBrandIcon(selectedCard?.brand || '')} size={20} color="#fff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>
                {selectedCard?.brand} •••• {selectedCard?.last4}
              </Text>
              <Text style={styles.cardSubtext}>
                Expires {selectedCard?.expiryMonth}/{selectedCard?.expiryYear}
              </Text>
            </View>
            {cards.length > 1 && (
              <Ionicons name={showCardPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Card Picker Dropdown */}
      {showCardPicker && cards.length > 1 && (
        <View style={styles.cardPickerContainer}>
          <ScrollView style={styles.cardPicker} nestedScrollEnabled>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.cardOption,
                  selectedCard?.id === card.id && styles.cardOptionSelected,
                ]}
                onPress={() => handleSelectCard(card)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name={getCardBrandIcon(card.brand)} size={18} color="#fff" />
                </View>
                <Text style={styles.cardOptionText}>
                  {card.brand} •••• {card.last4}
                </Text>
                {selectedCard?.id === card.id && (
                  <Ionicons name="checkmark" size={20} color="#00D4AA" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cardOption} onPress={handleAddCard}>
              <View style={styles.addCardIcon}>
                <Ionicons name="add" size={18} color="#00D4AA" />
              </View>
              <Text style={styles.addCardOptionText}>Add New Card</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

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

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
              Add {currencySymbol}{fiatAmount.toFixed(2)}
            </Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    maxHeight: 220,
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
  feeInfo: {
    marginTop: 8,
  },
  feeText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#ff8a00',
  },
  paymentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  addCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00D4AA',
  },
  cardPickerContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 180,
  },
  cardPicker: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  cardOptionSelected: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  cardOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  addCardOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#00D4AA',
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  continueButton: {
    backgroundColor: '#00D4AA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#333',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  continueButtonTextDisabled: {
    color: '#666',
  },
});
