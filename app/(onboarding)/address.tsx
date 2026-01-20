import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function AddressScreen() {
  const { saveAddress, isLoading, error, clearError } = useAuth();

  const [street, setStreet] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const isFormValid =
    street.trim() &&
    city.trim() &&
    postalCode.trim() &&
    country.trim();

  const handleSubmit = async () => {
    if (!isFormValid) return;

    try {
      await saveAddress({
        street: street.trim(),
        street2: street2.trim() || undefined,
        city: city.trim(),
        state: state.trim() || undefined,
        postalCode: postalCode.trim(),
        country: country.trim().toUpperCase(),
      });
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={[styles.stepLine, styles.stepLineCompleted]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Step 2 of 3</Text>
              <Text style={styles.title}>Your Address</Text>
              <Text style={styles.subtitle}>
                This is required for regulatory compliance
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                placeholderTextColor="#666"
                value={street}
                onChangeText={(text) => {
                  clearError();
                  setStreet(text);
                }}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Apartment, Suite, etc. (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Apt 4B"
                placeholderTextColor="#666"
                value={street2}
                onChangeText={(text) => {
                  clearError();
                  setStreet2(text);
                }}
                autoCapitalize="words"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="New York"
                    placeholderTextColor="#666"
                    value={city}
                    onChangeText={(text) => {
                      clearError();
                      setCity(text);
                    }}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>State (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="NY"
                    placeholderTextColor="#666"
                    value={state}
                    onChangeText={(text) => {
                      clearError();
                      setState(text);
                    }}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Postal Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10001"
                    placeholderTextColor="#666"
                    value={postalCode}
                    onChangeText={(text) => {
                      clearError();
                      setPostalCode(text);
                    }}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Country</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="US"
                    placeholderTextColor="#666"
                    value={country}
                    onChangeText={(text) => {
                      clearError();
                      setCountry(text);
                    }}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, (!isFormValid || isLoading) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  stepDotActive: {
    backgroundColor: '#00D4AA',
  },
  stepDotCompleted: {
    backgroundColor: '#00D4AA',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#00D4AA',
  },
  stepText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  form: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    height: 56,
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1a3d35',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
