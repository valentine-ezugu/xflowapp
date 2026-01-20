import React, { useState, useEffect } from 'react';
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
import { CountryPicker } from '@/components/ui/CountryPicker';
import { CountryDto } from '@/types/auth';
import { api } from '@/services/api';

export default function PersonalInfoScreen() {
  const { savePersonalInfo, isLoading, error, clearError } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryOfResidence, setCountryOfResidence] = useState<CountryDto | null>(null);
  const [nationality, setNationality] = useState<CountryDto | null>(null);

  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const data = await api.country.getCountries();
      setCountries(data);
    } catch (err) {
      console.error('Failed to load countries:', err);
    } finally {
      setCountriesLoading(false);
    }
  };

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    dateOfBirth.trim() &&
    countryOfResidence &&
    nationality;

  const handleSubmit = async () => {
    if (!isFormValid || !countryOfResidence || !nationality) return;

    try {
      await savePersonalInfo({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        countryOfResidence: countryOfResidence.name,
        nationality: nationality.name,
      });
    } catch (err) {
      // Error handled by context
    }
  };

  const handleDateChange = (text: string) => {
    clearError();
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }

    setDateOfBirth(formatted);
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
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Step 1 of 3</Text>
              <Text style={styles.title}>Personal Information</Text>
              <Text style={styles.subtitle}>
                We need some details to set up your account
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor="#666"
                    value={firstName}
                    onChangeText={(text) => {
                      clearError();
                      setFirstName(text);
                    }}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    placeholderTextColor="#666"
                    value={lastName}
                    onChangeText={(text) => {
                      clearError();
                      setLastName(text);
                    }}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                value={dateOfBirth}
                onChangeText={handleDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />

              {countriesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#00D4AA" />
                  <Text style={styles.loadingText}>Loading countries...</Text>
                </View>
              ) : (
                <>
                  <CountryPicker
                    label="Country of Residence"
                    placeholder="Select your country"
                    value={countryOfResidence}
                    countries={countries}
                    onSelect={(country) => {
                      clearError();
                      setCountryOfResidence(country);
                    }}
                  />

                  <CountryPicker
                    label="Nationality"
                    placeholder="Select your nationality"
                    value={nationality}
                    countries={countries}
                    onSelect={(country) => {
                      clearError();
                      setNationality(country);
                    }}
                  />
                </>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, (!isFormValid || isLoading || countriesLoading) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading || countriesLoading}
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
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: 8,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
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
