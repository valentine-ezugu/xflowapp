import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Recipient, RecipientUser, RecipientWallet, FindRecipientResponse } from '@/types/transfer';

export default function SendToScreen() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecipientUser[]>([]);
  const [friends, setFriends] = useState<RecipientUser[]>([]);
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);

  // Load initial data (recent/friends) on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const response = await api.transfer.findRecipient('');
      setRecentUsers(response.recentUsers || []);
      setFriends(response.friends || []);
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.transfer.findRecipient(query.trim());
        setSearchResults(response.searchResults || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectRecipient = (recipient: Recipient) => {
    if (recipient.type === 'user') {
      router.push({
        pathname: '/(send)/amount',
        params: {
          type: 'user',
          recipientId: recipient.userId,
          displayName: recipient.xflowTag,
        },
      });
    } else {
      router.push({
        pathname: '/(send)/amount',
        params: {
          type: 'wallet',
          address: recipient.address,
          displayName: recipient.displayAddress,
        },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const clearQuery = () => {
    setQuery('');
    setSearchResults([]);
  };

  const renderUserItem = (user: RecipientUser) => (
    <TouchableOpacity
      key={user.userId}
      style={styles.recipientItem}
      onPress={() => handleSelectRecipient(user)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.xflowTag.charAt(1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.recipientInfo}>
        <Text style={styles.recipientName}>{user.xflowTag}</Text>
        {user.displayName && (
          <Text style={styles.recipientSubtext}>{user.displayName}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderWalletItem = (wallet: RecipientWallet) => (
    <TouchableOpacity
      key={wallet.address}
      style={styles.recipientItem}
      onPress={() => handleSelectRecipient(wallet)}
    >
      <View style={[styles.avatar, styles.walletAvatar]}>
        <Ionicons name="wallet" size={18} color="#fff" />
      </View>
      <View style={styles.recipientInfo}>
        <Text style={styles.recipientName}>{wallet.displayAddress}</Text>
        <Text style={styles.recipientSubtext}>External wallet</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderRecipientItem = (recipient: Recipient) => {
    if (recipient.type === 'user') {
      return renderUserItem(recipient);
    } else {
      return renderWalletItem(recipient);
    }
  };

  const showSearchResults = query.trim().length > 0;
  const showInitialLists = !showSearchResults && (recentUsers.length > 0 || friends.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Send to</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="XflowTag or wallet address"
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearQuery} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00D4AA" />
        </View>
      )}

      {/* Search Results */}
      {showSearchResults && !isLoading && (
        <View style={styles.section}>
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                {searchResults[0]?.type === 'wallet' ? 'External wallet' : 'Search results'}
              </Text>
              {searchResults.map(renderRecipientItem)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          )}
        </View>
      )}

      {/* Initial Lists (Recent & Friends) */}
      {showInitialLists && (
        <View style={styles.scrollContent}>
          {recentUsers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transacted recently</Text>
              {recentUsers.map(renderUserItem)}
            </View>
          )}

          {friends.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Friends</Text>
              {friends.map(renderUserItem)}
            </View>
          )}
        </View>
      )}
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
    paddingBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletAvatar: {
    backgroundColor: '#333',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  recipientSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
});
