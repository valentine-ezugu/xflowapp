import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { PaymentOption, PaymentProviderResponse } from '@/types/settings';

// Card brand icons mapping
const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  default: '💳',
};

function getCardBrandDisplay(brand: string): string {
  const normalized = brand.toLowerCase();
  if (normalized.includes('visa')) return 'Visa';
  if (normalized.includes('master')) return 'Mastercard';
  if (normalized.includes('amex') || normalized.includes('american')) return 'Amex';
  if (normalized.includes('discover')) return 'Discover';
  return brand;
}

export default function PaymentMethodsScreen() {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [providerInfo, setProviderInfo] = useState<PaymentProviderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [options, provider] = await Promise.all([
        api.paymentOption.getList(),
        api.paymentOption.getProvider(),
      ]);
      setPaymentOptions(options);
      setProviderInfo(provider);
    } catch (error) {
      console.error('Failed to load payment options:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleAddCard = () => {
    if (providerInfo) {
      router.push({
        pathname: '/settings/add-card' as any,
        params: {
          provider: providerInfo.provider,
          addCardFlow: providerInfo.addCardFlow,
        },
      });
    }
  };

  const renderPaymentOption = ({ item }: { item: PaymentOption }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardIconContainer}>
        <Text style={styles.cardIcon}>{CARD_BRAND_ICONS[item.brand.toLowerCase()] || CARD_BRAND_ICONS.default}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardBrand}>{getCardBrandDisplay(item.brand)}</Text>
        <Text style={styles.cardNumber}>•••• {item.last4}</Text>
      </View>
      <Text style={styles.cardExpiry}>
        {item.expiryMonth}/{item.expiryYear.slice(-2)}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment methods</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={paymentOptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPaymentOption}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
          />
        }
        ListHeaderComponent={
          paymentOptions.length > 0 ? (
            <Text style={styles.sectionHeader}>Your cards</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No payment methods</Text>
            <Text style={styles.emptySubtext}>Add a card to get started</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addCardButton} onPress={handleAddCard}>
            <View style={styles.addCardIconContainer}>
              <Ionicons name="add" size={24} color="#6C5CE7" />
            </View>
            <Text style={styles.addCardText}>Add debit or credit card</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    flexGrow: 1,
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
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  cardNumber: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  cardExpiry: {
    fontSize: 14,
    color: '#888',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  addCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addCardText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
