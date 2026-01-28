import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { XrpLogo } from '@/components/icons/XrpLogo';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { api } from '@/services/api';
import { ReceiveXrpResponse } from '@/types/transfer';

export default function ReceiveScreen() {
  const [receiveInfo, setReceiveInfo] = useState<ReceiveXrpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'address' | 'tag' | null>(null);

  useEffect(() => {
    loadReceiveInfo();
  }, []);

  const loadReceiveInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.transfer.getReceiveAddress();
      setReceiveInfo(data);
    } catch (err: any) {
      console.error('Failed to load receive info:', err);
      setError(err.message || 'Failed to load deposit address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const copyToClipboard = async (text: string, field: 'address' | 'tag') => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const copyAll = async () => {
    if (!receiveInfo) return;
    const text = `Address: ${receiveInfo.address}\nDestination Tag: ${receiveInfo.destinationTag}`;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Address and destination tag copied to clipboard');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  // Generate QR code value - XRP URI format
  const getQrValue = () => {
    if (!receiveInfo) return '';
    // Standard XRP payment URI format
    return `xrpl:${receiveInfo.address}?dt=${receiveInfo.destinationTag}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Loading deposit address...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <Text style={styles.title}>Receive XRP</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReceiveInfo}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Receive XRP</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={getQrValue()}
              size={200}
              backgroundColor="#fff"
              color="#000"
            />
            {/* XRP Logo overlay */}
            <View style={styles.qrLogoContainer}>
              <View style={styles.qrLogo}>
                <XrpLogo size={24} color="#000" />
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Receive tokens with your XRP Ledger address
          </Text>

          {/* Copy All Button */}
          <TouchableOpacity style={styles.copyButton} onPress={copyAll}>
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>

          {/* Address */}
          <TouchableOpacity
            style={styles.fieldContainer}
            onPress={() => copyToClipboard(receiveInfo?.address || '', 'address')}
          >
            <Text style={styles.fieldLabel}>Address</Text>
            <View style={styles.fieldValueRow}>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {receiveInfo?.address}
              </Text>
              {copiedField === 'address' ? (
                <Ionicons name="checkmark" size={18} color="#00D4AA" />
              ) : (
                <Ionicons name="copy-outline" size={18} color="#666" />
              )}
            </View>
          </TouchableOpacity>

          {/* Destination Tag */}
          <TouchableOpacity
            style={styles.fieldContainer}
            onPress={() => copyToClipboard(String(receiveInfo?.destinationTag || ''), 'tag')}
          >
            <Text style={styles.fieldLabel}>Destination Tag</Text>
            <View style={styles.fieldValueRow}>
              <Text style={styles.fieldValueHighlight}>
                {receiveInfo?.destinationTag}
              </Text>
              {copiedField === 'tag' ? (
                <Ionicons name="checkmark" size={18} color="#00D4AA" />
              ) : (
                <Ionicons name="copy-outline" size={18} color="#666" />
              )}
            </View>
          </TouchableOpacity>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={18} color="#FFB800" />
            <Text style={styles.warningText}>
              Always include the destination tag when sending XRP to this address
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => console.log('Add Funds')}>
          <Text style={styles.secondaryButtonText}>Add Funds</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => console.log('Transfer from Exchange')}>
          <Text style={styles.primaryButtonText}>Transfer from Exchange</Text>
        </TouchableOpacity>
      </ScrollView>
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
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    position: 'relative',
  },
  qrLogoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  qrLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 16,
    lineHeight: 22,
  },
  copyButton: {
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: 14,
    color: '#aaa',
    flex: 1,
    marginRight: 8,
  },
  fieldValueHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2000',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFB800',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#00D4AA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
