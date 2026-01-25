import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { PaymentProvider, AddCardFlow } from '@/types/settings';

// Conditionally import Stripe for native platforms only
let CardField: any = null;
let useStripe: any = null;
if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  CardField = stripe.CardField;
  useStripe = stripe.useStripe;
}

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

function formatExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  }
  return cleaned;
}

export default function AddCardScreen() {
  const params = useLocalSearchParams<{ provider: PaymentProvider; addCardFlow: AddCardFlow }>();
  const provider = params.provider;

  // Stripe hook - only available on native
  const stripe = Platform.OS !== 'web' && useStripe ? useStripe() : null;

  // Stripe card state
  const [cardComplete, setCardComplete] = useState(false);

  // Flutterwave manual card input state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Flutterwave input handlers
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    setCardNumber(formatCardNumber(cleaned));
  };

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setExpiry(formatExpiry(cleaned));
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setCvv(cleaned);
  };

  const validateFlutterwaveForm = (): boolean => {
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return false;
    }

    const [month, year] = expiry.split('/');
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY)');
      return false;
    }

    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return false;
    }

    return true;
  };

  // STRIPE: Use SetupIntent flow
  const handleAddCardStripe = async () => {
    if (!stripe || !cardComplete) {
      Alert.alert('Error', 'Please enter valid card details');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get SetupIntent client secret from backend
      const { clientSecret } = await api.paymentOption.createSetupIntent();

      // 2. Confirm the SetupIntent with Stripe SDK
      const { setupIntent, error } = await stripe.confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Stripe error:', error);
        Alert.alert('Error', error.message || 'Failed to add card');
        return;
      }

      if (setupIntent) {
        Alert.alert('Success', 'Card added successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to add card:', error);
      Alert.alert('Error', error.message || 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // FLUTTERWAVE: Send card details directly to backend
  const handleAddCardFlutterwave = async () => {
    if (!validateFlutterwaveForm()) return;

    setIsLoading(true);

    try {
      const [month, year] = expiry.split('/');
      const fullYear = year.length === 2 ? '20' + year : year;

      const response = await api.paymentOption.addFlutterwaveCard({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cvv,
        expiryMonth: month,
        expiryYear: fullYear,
        currency: 'NGN',
      });

      if (response.success) {
        Alert.alert('Success', 'Card added successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to add card:', error);
      Alert.alert('Error', error.message || 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = () => {
    if (provider === 'STRIPE') {
      handleAddCardStripe();
    } else if (provider === 'FLUTTERWAVE') {
      handleAddCardFlutterwave();
    }
  };

  // Form validation
  const isFlutterwaveFormValid = cardNumber.replace(/\s/g, '').length >= 15 && expiry.length === 5 && cvv.length >= 3;
  const isStripeFormValid = cardComplete;
  const isFormValid = provider === 'STRIPE' ? isStripeFormValid : isFlutterwaveFormValid;

  // Stripe on web - show not available message
  if (provider === 'STRIPE' && Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add card</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.stripeNotAvailable}>
          <Ionicons name="card-outline" size={64} color="#6C5CE7" />
          <Text style={styles.stripeTitle}>Stripe Integration</Text>
          <Text style={styles.stripeMessage}>
            Stripe card setup is not available on web.
            {'\n\n'}
            Please use the mobile app to add a card.
          </Text>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Stripe native flow
  if (provider === 'STRIPE' && Platform.OS !== 'web' && CardField) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add card</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card details</Text>
              <CardField
                postalCodeEnabled={false}
                placeholders={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={{
                  backgroundColor: '#111111',
                  textColor: '#FFFFFF',
                  placeholderColor: '#666666',
                }}
                style={styles.cardField}
                onCardChange={(cardDetails: any) => {
                  setCardComplete(cardDetails.complete);
                }}
              />
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="lock-closed" size={16} color="#888" />
              <Text style={styles.securityText}>
                Your card details are securely processed by Stripe
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.addButton, !isFormValid && styles.addButtonDisabled]}
              onPress={handleAddCard}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.addButtonText}>Add card</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Flutterwave flow (manual card input)
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add card</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={19}
              />
              <Ionicons name="card-outline" size={20} color="#666" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Expiry date</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={handleCvvChange}
                  placeholder="123"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
                <Ionicons name="help-circle-outline" size={20} color="#666" />
              </View>
            </View>
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="lock-closed" size={16} color="#888" />
            <Text style={styles.securityText}>
              Your card details are encrypted and secure
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, !isFormValid && styles.addButtonDisabled]}
            onPress={handleAddCard}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.addButtonText}>Add card</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 16,
  },
  cardField: {
    width: '100%',
    height: 60,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
  },
  addButton: {
    backgroundColor: '#00D4AA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#333',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  stripeNotAvailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stripeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  stripeMessage: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButtonLarge: {
    marginTop: 32,
    backgroundColor: '#6C5CE7',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
