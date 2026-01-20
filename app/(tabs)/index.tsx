import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { PortfolioSummaryResponse, WalletLine } from '@/types/portfolio';
import { DayGroup } from '@/types/transaction';
import { PortfolioHeader } from '@/components/ui/PortfolioHeader';
import { KycProgressCard } from '@/components/ui/KycProgressCard';
import { TransactionList } from '@/components/ui/TransactionList';

export default function HomeScreen() {
  const { user, kycStatus, refreshKycStatus } = useAuth();

  const [summary, setSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [xrpWallet, setXrpWallet] = useState<WalletLine | null>(null);
  const [transactions, setTransactions] = useState<DayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showKycCard, setShowKycCard] = useState(true);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const [summaryRes, walletsRes, txRes] = await Promise.all([
        api.portfolio.getSummary().catch(() => null),
        api.portfolio.getWallets().catch(() => null),
        api.transaction.getAll().catch(() => ({ days: [] })),
      ]);

      if (summaryRes) setSummary(summaryRes);
      if (walletsRes?.wallets?.length) {
        const xrp = walletsRes.wallets.find(w => w.asset === 'XRP');
        if (xrp) setXrpWallet(xrp);
      }
      setTransactions(txRes.days || []);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData(false);
      refreshKycStatus();
    }, [loadData, refreshKycStatus])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(false), refreshKycStatus()]);
    setIsRefreshing(false);
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
      >
        {/* Portfolio header with balance and actions */}
        <PortfolioHeader
          summary={summary}
          xrpWallet={xrpWallet}
          userTag={user?.xflowTag || undefined}
          onSettingsPress={() => console.log('Settings')}
          onSearchPress={() => console.log('Search')}
          onAddFundsPress={() => console.log('Add Funds')}
          onSendPress={() => router.push('/(send)')}
          onReceivePress={() => console.log('Receive')}
          onRequestPress={() => console.log('Request')}
        />

        {/* KYC progress card (shown if not fully verified) */}
        {kycStatus && showKycCard && kycStatus.kycTier !== 'LEVEL1' && (
          <View style={styles.section}>
            <KycProgressCard
              kycStatus={kycStatus}
              onDismiss={() => setShowKycCard(false)}
            />
          </View>
        )}

        {/* Transactions list */}
        <View style={styles.section}>
          <TransactionList
            days={transactions}
            initialCollapsed={false}
            maxVisibleDays={5}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
