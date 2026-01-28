import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plus, PaperPlaneTilt, ArrowDown, HandPalm } from 'phosphor-react-native';
import { PortfolioSummaryResponse, WalletLine } from '@/types/portfolio';
import { XrpLogo } from '@/components/icons/XrpLogo';

interface PortfolioHeaderProps {
  summary: PortfolioSummaryResponse | null;
  xrpWallet: WalletLine | null;
  userTag?: string;
  onSettingsPress?: () => void;
  onSearchPress?: () => void;
  onAddFundsPress?: () => void;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onRequestPress?: () => void;
}

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export function PortfolioHeader({
  summary,
  xrpWallet,
  userTag,
  onSettingsPress,
  onSearchPress,
  onAddFundsPress,
  onSendPress,
  onReceivePress,
  onRequestPress,
}: PortfolioHeaderProps) {
  const totalValue = summary?.totalValue ?? 0;
  const baseCurrency = summary?.baseCurrency ?? 'EUR';
  const xrpBalance = xrpWallet?.balance ?? 0;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.userBadge}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userTag ? userTag.charAt(1).toUpperCase() : 'X'}
            </Text>
          </View>
          {userTag && (
            <Text style={styles.userTag} numberOfLines={1}>
              {userTag}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          {onSearchPress && (
            <TouchableOpacity style={styles.actionButton} onPress={onSearchPress}>
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {onSettingsPress && (
            <TouchableOpacity style={styles.actionButton} onPress={onSettingsPress}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Portfolio value */}
      <View style={styles.valueContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Total value</Text>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
        </View>
        <Text style={styles.totalValue}>
          {formatCurrency(totalValue, baseCurrency)}
        </Text>
        <View style={styles.xrpRow}>
          <View style={styles.xrpBadge}>
            <XrpLogo size={18} color="#fff" />
          </View>
          <Text style={styles.xrpBalance}>
            {xrpBalance.toFixed(2)} XRP
          </Text>
        </View>
      </View>

      {/* Action buttons - Revolut style */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionItem} onPress={onAddFundsPress}>
          <View style={styles.iconCircle}>
            <Plus size={24} color="#fff" weight="bold" />
          </View>
          <Text style={styles.actionLabel}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onSendPress}>
          <View style={styles.iconCircle}>
            <PaperPlaneTilt size={24} color="#fff" weight="fill" />
          </View>
          <Text style={styles.actionLabel}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onReceivePress}>
          <View style={styles.iconCircle}>
            <ArrowDown size={24} color="#fff" weight="bold" />
          </View>
          <Text style={styles.actionLabel}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onRequestPress}>
          <View style={styles.iconCircle}>
            <HandPalm size={24} color="#fff" weight="fill" />
          </View>
          <Text style={styles.actionLabel}>Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  userTag: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    maxWidth: 150,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#888',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.5,
  },
  xrpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  xrpBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xrpIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  xrpBalance: {
    fontSize: 18,
    fontWeight: '500',
    color: '#aaa',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
});
