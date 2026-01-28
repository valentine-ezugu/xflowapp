import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DayGroup, TransactionResponse, TransactionType } from '@/types/transaction';

interface TransactionListProps {
  days: DayGroup[];
  showHeader?: boolean;
  showAll?: boolean;
}

const TRANSACTION_ICONS: Record<TransactionType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  TOP_UP_FIAT: { name: 'add-circle', color: '#00D4AA' },
  BUY_XRP: { name: 'trending-up', color: '#00D4AA' },
  SELL_XRP: { name: 'trending-down', color: '#FF6B6B' },
  WITHDRAW_XRP: { name: 'arrow-up-circle', color: '#FF6B6B' },
  TRANSFER_XRP: { name: 'swap-horizontal', color: '#6C5CE7' },
  WITHDRAW_FIAT: { name: 'arrow-up-circle', color: '#FF6B6B' },
  DEPOSIT_XRP: { name: 'arrow-down-circle', color: '#00D4AA' },
};

function formatAmount(amount: number, currency: string | null | undefined): string {
  // Default to EUR if currency is null/undefined
  const safeCurrency = currency || 'EUR';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function TransactionItem({ transaction }: { transaction: TransactionResponse }) {
  const iconConfig = TRANSACTION_ICONS[transaction.type] || { name: 'help-circle', color: '#666' };
  const isPositive = ['TOP_UP_FIAT', 'BUY_XRP', 'DEPOSIT_XRP'].includes(transaction.type);

  const handlePress = () => {
    router.push({
      pathname: '/transaction-details',
      params: { id: transaction.id.toString() },
    });
  };

  return (
    <TouchableOpacity style={styles.transactionItem} onPress={handlePress}>
      <View style={[styles.transactionIcon, { backgroundColor: `${iconConfig.color}20` }]}>
        <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle}>{transaction.title}</Text>
        <Text style={styles.transactionSubtitle}>{transaction.subtitle}</Text>
      </View>
      <View style={styles.transactionAmount}>
        {transaction.xrpAmount != null && (
          <Text style={[
            styles.xrpAmountMain,
            isPositive ? styles.amountPositive : styles.amountNegative,
          ]}>
            {isPositive ? '+' : ''}{transaction.xrpAmount.toFixed(2)} XRP
          </Text>
        )}
        <Text style={styles.eurAmount}>
          {isPositive ? '+' : '-'}{formatAmount(Math.abs(transaction.amount), transaction.currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const MAX_VISIBLE_TRANSACTIONS = 3;

export function TransactionList({ days, showHeader = true, showAll = false }: TransactionListProps) {
  if (!days || days.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={48} color="#444" />
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Your activity will appear here</Text>
      </View>
    );
  }

  // Full view: show all transactions grouped by day
  if (showAll) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Activity</Text>
          </View>
        )}
        {days.map((dayGroup) => (
          <View key={dayGroup.date} style={styles.dayGroup}>
            <Text style={styles.dayHeader}>{dayGroup.displayDate}</Text>
            {dayGroup.transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  // Collapsed view: show first 3 transactions
  const allTransactions = days.flatMap(day => day.transactions);
  const visibleTransactions = allTransactions.slice(0, MAX_VISIBLE_TRANSACTIONS);
  const hasMore = allTransactions.length > MAX_VISIBLE_TRANSACTIONS;

  const handleSeeAll = () => {
    router.push('/activity');
  };

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
        </View>
      )}

      <View style={styles.collapsedList}>
        {visibleTransactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </View>

      {hasMore && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={handleSeeAll}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color="#00D4AA" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  dayGroup: {
    marginBottom: 20,
  },
  collapsedList: {
    marginBottom: 8,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '500',
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountPositive: {
    color: '#00D4AA',
  },
  amountNegative: {
    color: '#fff',
  },
  xrpAmountMain: {
    fontSize: 15,
    fontWeight: '600',
  },
  eurAmount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
