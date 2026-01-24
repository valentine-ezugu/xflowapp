import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface TermsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}

function TermsItem({ icon, title, onPress }: TermsItemProps) {
  return (
    <TouchableOpacity style={styles.termsItem} onPress={onPress}>
      <View style={styles.termsIconContainer}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.termsTitle}>{title}</Text>
      <Ionicons name="open-outline" size={18} color="#666" />
    </TouchableOpacity>
  );
}

export default function TermsScreen() {
  const handleTermsOfService = () => {
    Linking.openURL('https://xflow.com/terms');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://xflow.com/privacy');
  };

  const handleLicenses = () => {
    Linking.openURL('https://xflow.com/licenses');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Disclosures</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Legal</Text>

        <View style={styles.card}>
          <TermsItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={handleTermsOfService}
          />
          <View style={styles.divider} />
          <TermsItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <View style={styles.divider} />
          <TermsItem
            icon="code-slash-outline"
            title="Open Source Licenses"
            onPress={handleLicenses}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using XFlow, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  termsIconContainer: {
    width: 32,
    marginRight: 12,
    alignItems: 'center',
  },
  termsTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 16,
  },
  footer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
