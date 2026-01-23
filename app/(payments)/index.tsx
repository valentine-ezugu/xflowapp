import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { PaymentCounterpartyDto } from '@/types/payment';

export default function PaymentsListScreen() {
  const [counterparties, setCounterparties] = useState<PaymentCounterpartyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await api.payment.getList();
      setCounterparties(response.counterparties || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations(false);
    }, [loadConversations])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations(false);
    setIsRefreshing(false);
  };

  const handleConversationPress = (item: PaymentCounterpartyDto) => {
    // Use userId for internal users, address for external
    // Prefix with 'user:' or 'addr:' to distinguish
    if (item.isInternalUser && item.userId) {
      router.push({
        pathname: '/(payments)/[id]',
        params: {
          id: `user:${item.userId}`,
          displayName: item.displayName,
          xflowTag: item.xflowTag || '',
        },
      });
    } else if (item.externalAddress) {
      router.push({
        pathname: '/(payments)/[id]',
        params: {
          id: `addr:${item.externalAddress}`,
          displayName: item.displayName,
        },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  };

  const getLastPaymentPreview = (item: PaymentCounterpartyDto) => {
    const xrpAmount = parseFloat(item.lastPaymentXrp) || 0;
    const direction = item.lastPaymentWasSent ? 'You sent' : 'You received';
    return `${direction} ${xrpAmount.toFixed(2)} XRP`;
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'PLN': return 'zł';
      default: return currency + ' ';
    }
  };

  const getLastPaymentAmount = (item: PaymentCounterpartyDto) => {
    const fiatValue = parseFloat(item.lastPaymentFiat) || 0;
    const symbol = getCurrencySymbol(item.lastPaymentCurrency);
    const prefix = item.lastPaymentWasSent ? '-' : '+';
    return `${prefix}${symbol}${Math.abs(fiatValue).toFixed(0)}`;
  };

  const filteredCounterparties = counterparties.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = item.displayName.toLowerCase().includes(query);
    const matchesTag = item.xflowTag?.toLowerCase().includes(query);
    const matchesAddress = item.externalAddress?.toLowerCase().includes(query);
    return matchesName || matchesTag || matchesAddress;
  });

  const renderConversationItem = ({ item }: { item: PaymentCounterpartyDto }) => {
    const lastAmount = getLastPaymentAmount(item);
    const initials = item.displayName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
          {item.isInternalUser && (
            <View style={styles.internalBadge}>
              <Text style={styles.internalBadgeText}>X</Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.displayName} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.lastPaymentAt)}
            </Text>
          </View>
          <View style={styles.conversationPreview}>
            <Text
              style={styles.previewText}
              numberOfLines={1}
            >
              {getLastPaymentPreview(item)}
            </Text>
            <Text style={[
              styles.amountText,
              lastAmount.startsWith('+') ? styles.amountPositive : styles.amountNegative,
            ]}>
              {lastAmount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversation List */}
      <FlatList
        data={filteredCounterparties}
        keyExtractor={(item) => item.userId?.toString() || item.externalAddress || ''}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Send money to someone to start a conversation
            </Text>
          </View>
        }
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  internalBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  internalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
  },
  conversationPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: '#888',
    flex: 1,
    marginRight: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountPositive: {
    color: '#00D4AA',
  },
  amountNegative: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});
