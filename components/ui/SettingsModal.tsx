import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingsItem({ icon, label, onPress, rightElement, showChevron = true }: SettingsItemProps) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={22} color="#fff" style={styles.settingsIcon} />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {rightElement}
        {showChevron && <Ionicons name="chevron-forward" size={20} color="#666" />}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { logout, user } = useAuth();

  const handlePaymentMethods = () => {
    onClose();
    router.push('/settings/payment-methods' as any);
  };

  const handleAccount = () => {
    onClose();
    router.push('/settings/account' as any);
  };

  const handleHelp = () => {
    onClose();
    router.push('/settings/help' as any);
  };

  const handleTerms = () => {
    onClose();
    router.push('/settings/terms' as any);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Settings Items */}
        <View style={styles.content}>
          <SettingsItem
            icon="card-outline"
            label="Payment methods"
            onPress={handlePaymentMethods}
          />

          <SettingsItem
            icon="person-outline"
            label="Account"
            onPress={handleAccount}
          />

          <SettingsItem
            icon="help-circle-outline"
            label="Help"
            onPress={handleHelp}
          />

          <SettingsItem
            icon="document-text-outline"
            label="Terms and Disclosures"
            onPress={handleTerms}
            rightElement={<Ionicons name="open-outline" size={16} color="#666" style={{ marginRight: 4 }} />}
            showChevron={false}
          />

          <SettingsItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            rightElement={
              <Text style={styles.logoutEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            }
            showChevron={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    position: 'relative',
  },
  headerTitle: {
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: 16,
    width: 24,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#fff',
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutEmail: {
    fontSize: 14,
    color: '#666',
    maxWidth: 180,
    marginRight: 4,
  },
});
