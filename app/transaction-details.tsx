import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { api } from '@/services/api';
import { TransactionResponse, TransactionType, TransactionStatus } from '@/types/transaction';

const TRANSACTION_CONFIG: Record<TransactionType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}> = {
  TOP_UP_FIAT: { icon: 'add-circle', color: '#00D4AA', label: 'Added money' },
  BUY_XRP: { icon: 'trending-up', color: '#00D4AA', label: 'Bought XRP' },
  SELL_XRP: { icon: 'trending-down', color: '#FF6B6B', label: 'Sold XRP' },
  WITHDRAW_XRP: { icon: 'arrow-up-circle', color: '#FF6B6B', label: 'Sent' },
  TRANSFER_XRP: { icon: 'swap-horizontal', color: '#6C5CE7', label: 'Transferred' },
  WITHDRAW_FIAT: { icon: 'arrow-up-circle', color: '#FF6B6B', label: 'Withdrew' },
  DEPOSIT_XRP: { icon: 'arrow-down-circle', color: '#00D4AA', label: 'Received' },
};

const STATUS_CONFIG: Record<TransactionStatus, { color: string; label: string }> = {
  COMPLETED: { color: '#00D4AA', label: 'Completed' },
  PROCESSING: { color: '#FFA500', label: 'Processing' },
  PENDING: { color: '#888', label: 'Pending' },
  FAILED: { color: '#FF6B6B', label: 'Failed' },
  CANCELLED: { color: '#888', label: 'Cancelled' },
};

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!params.id) {
        setError('Transaction ID not provided');
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.transaction.getById(parseInt(params.id, 10));
        setTransaction(data);
      } catch (err: any) {
        console.error('Failed to fetch transaction:', err);
        setError(err.message || 'Failed to load transaction');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [params.id]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'PLN': return 'zł';
      default: return currency + ' ';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOnExplorer = () => {
    if (transaction?.transactionHash) {
      const explorerUrl = `https://livenet.xrpl.org/transactions/${transaction.transactionHash}`;
      Linking.openURL(explorerUrl);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const goBack = () => {
    router.back();
  };

  // Swipe gesture to go back
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(50)
    .onEnd((event) => {
      if (event.translationX > 100 && event.velocityX > 0) {
        runOnJS(goBack)();
      }
    });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || 'Transaction not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = TRANSACTION_CONFIG[transaction.type] || {
    icon: 'help-circle',
    color: '#666',
    label: 'Transaction',
  };
  const statusConfig = STATUS_CONFIG[transaction.status];
  const isPositive = ['TOP_UP_FIAT', 'BUY_XRP', 'DEPOSIT_XRP'].includes(transaction.type);
  const hasFiatAmount = transaction.currency && transaction.amount !== null && transaction.amount !== undefined;
  const currencySymbol = hasFiatAmount ? getCurrencySymbol(transaction.currency) : '';

  return (
    <GestureDetector gesture={swipeGesture}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Close Button */}
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Icon and Amount */}
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon} size={32} color={config.color} />
          </View>
          <Text style={styles.transactionLabel}>{config.label}</Text>
          {hasFiatAmount ? (
            <>
              <Text style={[styles.amount, isPositive ? styles.amountPositive : styles.amountNegative]}>
                {isPositive ? '+' : '-'}{currencySymbol}{Math.abs(transaction.amount).toFixed(2)}
              </Text>
              {transaction.xrpAmount !== null && (
                <Text style={styles.xrpAmount}>
                  {transaction.xrpAmount > 0 ? '+' : ''}{transaction.xrpAmount.toFixed(4)} XRP
                </Text>
              )}
            </>
          ) : (
            // Show XRP as primary when no fiat amount
            transaction.xrpAmount !== null && (
              <Text style={[styles.amount, isPositive ? styles.amountPositive : styles.amountNegative]}>
                {isPositive ? '+' : ''}{transaction.xrpAmount.toFixed(4)} XRP
              </Text>
            )
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <DetailRow label="Date" value={formatDate(transaction.createdAt)} />

          {transaction.subtitle && (
            <DetailRow label="Description" value={transaction.subtitle} />
          )}

          {transaction.xrpAmount !== null && (
            <DetailRow
              label="XRP amount"
              value={`${transaction.xrpAmount.toFixed(6)} XRP`}
            />
          )}

          {transaction.rate !== null && hasFiatAmount && (
            <DetailRow
              label="Exchange rate"
              value={`1 XRP = ${currencySymbol}${transaction.rate.toFixed(4)}`}
            />
          )}

          {transaction.networkFee !== null && transaction.networkFee > 0 && (
            <DetailRow
              label="Network fee"
              value={`${transaction.networkFee.toFixed(6)} XRP`}
            />
          )}

          {transaction.platformFee !== null && transaction.platformFee > 0 && (
            <DetailRow
              label="Platform fee"
              value={`${transaction.platformFee.toFixed(6)} XRP`}
            />
          )}

          {transaction.recipientAddress && (
            <DetailRow
              label="Recipient address"
              value={transaction.recipientAddress}
              mono
            />
          )}

          {transaction.provider && (
            <DetailRow label="Provider" value={transaction.provider} />
          )}

          {transaction.note && (
            <DetailRow label="Note" value={transaction.note} />
          )}

          <DetailRow label="Transaction ID" value={`#${transaction.id}`} />

          {transaction.transactionHash && (
            <DetailRow
              label="Transaction hash"
              value={`${transaction.transactionHash.slice(0, 8)}...${transaction.transactionHash.slice(-8)}`}
              mono
            />
          )}

          {transaction.externalReference && (
            <DetailRow
              label="Reference"
              value={transaction.externalReference}
              mono
            />
          )}
        </View>

        {/* View on Explorer Button */}
        {transaction.transactionHash && (
          <TouchableOpacity style={styles.explorerButton} onPress={handleViewOnExplorer}>
            <Ionicons name="open-outline" size={18} color="#6C5CE7" />
            <Text style={styles.explorerButtonText}>View on XRPL Explorer</Text>
          </TouchableOpacity>
        )}
        </ScrollView>
      </SafeAreaView>
    </GestureDetector>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.monoText]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: -1,
  },
  amountPositive: {
    color: '#00D4AA',
  },
  amountNegative: {
    color: '#fff',
  },
  xrpAmount: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 16,
    gap: 8,
  },
  explorerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C5CE7',
  },
});
