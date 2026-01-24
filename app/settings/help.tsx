import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface HelpItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function HelpItem({ icon, title, subtitle, onPress }: HelpItemProps) {
  return (
    <TouchableOpacity style={styles.helpItem} onPress={onPress}>
      <View style={styles.helpIconContainer}>
        <Ionicons name={icon} size={24} color="#6C5CE7" />
      </View>
      <View style={styles.helpContent}>
        <Text style={styles.helpTitle}>{title}</Text>
        <Text style={styles.helpSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@xflow.com?subject=Support Request');
  };

  const handleFAQ = () => {
    Linking.openURL('https://xflow.com/faq');
  };

  const handleCommunity = () => {
    Linking.openURL('https://discord.gg/xflow');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Get help</Text>

        <View style={styles.card}>
          <HelpItem
            icon="mail-outline"
            title="Email support"
            subtitle="Get help via email"
            onPress={handleEmailSupport}
          />
          <View style={styles.divider} />
          <HelpItem
            icon="help-circle-outline"
            title="FAQs"
            subtitle="Find answers to common questions"
            onPress={handleFAQ}
          />
          <View style={styles.divider} />
          <HelpItem
            icon="chatbubbles-outline"
            title="Community"
            subtitle="Join our Discord community"
            onPress={handleCommunity}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>XFlow v1.0.0</Text>
        </View>
      </View>
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
  content: {
    flex: 1,
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
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  helpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 16,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
});
