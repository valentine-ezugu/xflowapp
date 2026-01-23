import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { FindRecipientResponse, UserRecipientDto } from '@/types/transfer';

export default function RequestFromScreen() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<FindRecipientResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResponse(null);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.transfer.findRecipient(query.trim());
        setSearchResponse(response);
        setHasSearched(true);
      } catch (err: any) {
        console.error('Search failed:', err);
        setSearchResponse(null);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = (user: UserRecipientDto) => {
    router.push({
      pathname: '/(request)/amount',
      params: {
        xflowTag: user.xflowTag,
        displayName: user.fullName || user.xflowTag,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  const clearQuery = () => {
    setQuery('');
    setSearchResponse(null);
    setHasSearched(false);
  };

  const renderUserItem = (user: UserRecipientDto, index: number) => {
    // Get first letter after @ for avatar
    const avatarLetter = user.xflowTag.startsWith('@')
      ? user.xflowTag.charAt(1).toUpperCase()
      : user.xflowTag.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        key={`${user.xflowTag}-${index}`}
        style={styles.recipientItem}
        onPress={() => handleSelectUser(user)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{user.xflowTag}</Text>
          {user.fullName && (
            <Text style={styles.recipientSubtext}>{user.fullName}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const hasUserMatches = searchResponse?.type === 'XFLOW_USER' && searchResponse.matches && searchResponse.matches.length > 0;
  // Show "not found" when we've searched but found no XFlow users
  const showNotFound = hasSearched && !isLoading && !hasUserMatches;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Request from</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter XflowTag"
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
      <ScrollView style={styles.scrollContent}>
        {/* XFlow User Matches */}
        {hasUserMatches && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>XflowTags</Text>
            {searchResponse!.matches!.map((user, index) => renderUserItem(user, index))}
          </View>
        )}

        {/* Not found - clean minimal style */}
        {showNotFound && (
          <View style={styles.notFoundContainer}>
            <Ionicons name="person-outline" size={48} color="#333" />
            <Text style={styles.notFoundText}>
              Can't find the person{'\n'}you are looking for
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={clearQuery}>
              <Text style={styles.resetButtonText}>Reset search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state when no query */}
        {!query.trim() && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="arrow-down-circle" size={48} color="#333" />
            <Text style={styles.emptyTitle}>Request payment</Text>
            <Text style={styles.emptyText}>
              Enter an XflowTag to request XRP from another user
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  notFoundContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  notFoundText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
