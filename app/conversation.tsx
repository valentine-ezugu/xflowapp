import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ConversationItem, PaymentConversationResponse, PaymentDetailDto } from '@/types/payment';

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    address?: string;
    displayName: string;
    xflowTag?: string;
    isInternal: string;
  }>();

  const [conversation, setConversation] = useState<PaymentConversationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const userId = params.userId ? parseInt(params.userId, 10) : null;
  const address = params.address;
  const isInternal = params.isInternal === '1';

  const loadConversation = useCallback(async () => {
    try {
      let data: PaymentConversationResponse;
      if (userId) {
        data = await api.payment.getConversation(userId);
        // Mark messages as read for internal users
        if (data.unreadCount > 0) {
          api.payment.markAsRead(userId).catch(console.error);
        }
      } else if (address) {
        data = await api.payment.getAddressConversation(address);
      } else {
        throw new Error('No userId or address provided');
      }
      setConversation(data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, address]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const handleBack = () => {
    router.back();
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending || !conversation?.chatEnabled || !userId) return;

    setIsSending(true);
    try {
      await api.payment.sendMessage({
        recipientId: userId,
        content: messageText.trim(),
      });
      setMessageText('');
      await loadConversation();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPress = () => {
    if (userId) {
      router.push({
        pathname: '/(send)',
        params: {
          preselectedUserId: userId.toString(),
          preselectedDisplayName: params.displayName,
          preselectedXflowTag: params.xflowTag || '',
        },
      });
    } else if (address) {
      router.push({
        pathname: '/(send)',
        params: {
          preselectedAddress: address,
          preselectedDisplayName: params.displayName,
        },
      });
    }
  };

  const handleRequestPress = () => {
    if (!userId || !params.xflowTag) return;
    router.push({
      pathname: '/request-amount',
      params: {
        userId: userId.toString(),
        displayName: params.displayName,
        xflowTag: params.xflowTag,
      },
    });
  };

  const handlePayRequest = async (payment: PaymentDetailDto) => {
    const xrpAmount = parseFloat(payment.xrpAmount) || 0;
    Alert.alert(
      'Pay Request',
      `Pay ${xrpAmount.toFixed(2)} XRP to ${params.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            setIsProcessingRequest(payment.id);
            try {
              await api.payment.payRequest({ paymentRequestId: payment.id });
              await loadConversation();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to pay request');
            } finally {
              setIsProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  const handleDeclineRequest = async (payment: PaymentDetailDto) => {
    Alert.alert(
      'Decline Request',
      `Decline payment request from ${params.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsProcessingRequest(payment.id);
            try {
              await api.payment.declineRequest({ paymentRequestId: payment.id });
              await loadConversation();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request');
            } finally {
              setIsProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = async (payment: PaymentDetailDto) => {
    Alert.alert(
      'Cancel Request',
      'Cancel this payment request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsProcessingRequest(payment.id);
            try {
              await api.payment.cancelRequest(payment.id);
              await loadConversation();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel request');
            } finally {
              setIsProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
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

  // Group items by date
  const getGroupedItems = () => {
    if (!conversation?.items) return [];

    const groups: { date: string; items: ConversationItem[] }[] = [];
    let currentDate = '';

    // Items come newest first, we want oldest first for display
    const sortedItems = [...conversation.items].reverse();

    sortedItems.forEach((item) => {
      const itemDate = new Date(item.timestamp).toDateString();
      if (itemDate !== currentDate) {
        currentDate = itemDate;
        groups.push({ date: item.timestamp, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });

    return groups;
  };

  const renderMessageBubble = (item: ConversationItem) => {
    if (!item.message) return null;
    const { message, isSent } = item;

    return (
      <View style={[styles.bubbleContainer, isSent ? styles.sentContainer : styles.receivedContainer]}>
        <View style={[styles.messageBubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
          <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
            {message.content}
          </Text>
          <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderPaymentBubble = (item: ConversationItem) => {
    if (!item.payment) return null;
    const { payment, isSent } = item;
    const isRequest = payment.type === 'REQUEST';
    const isPending = payment.status === 'REQUESTED';
    const isDeclined = payment.status === 'DECLINED';
    const isCancelled = payment.status === 'CANCELLED';
    const isProcessing = isProcessingRequest === payment.id;
    const xrpAmount = parseFloat(payment.xrpAmount) || 0;

    // For requests: isSent means I sent the request (I'm asking for money)
    // canRespond means I can pay/decline (I received the request)
    const canPayOrDecline = isRequest && isPending && payment.canRespond;
    const canCancel = isRequest && isPending && payment.isMyRequest;

    if (isRequest) {
      return (
        <View style={[styles.bubbleContainer, isSent ? styles.sentContainer : styles.receivedContainer]}>
          <View style={[
            styles.requestBubble,
            isSent ? styles.sentRequestBubble : styles.receivedRequestBubble,
            (isDeclined || isCancelled) && styles.declinedRequestBubble,
          ]}>
            <View style={styles.requestHeader}>
              <Ionicons
                name="arrow-down"
                size={14}
                color={isSent ? '#fff' : '#000'}
              />
              <Text style={[styles.requestLabel, isSent ? styles.sentText : styles.receivedPaymentText]}>
                {isSent ? 'You requested' : `${params.displayName} requested`}
              </Text>
            </View>
            <Text style={[styles.paymentAmount, isSent ? styles.sentText : styles.receivedPaymentText]}>
              {xrpAmount.toFixed(2)} XRP
            </Text>
            {payment.note && (
              <Text style={[styles.paymentNote, isSent ? styles.sentTime : styles.receivedPaymentNote]}>
                {payment.note}
              </Text>
            )}

            {/* Status badge for declined/cancelled */}
            {(isDeclined || isCancelled) && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {isDeclined ? 'Declined' : 'Cancelled'}
                </Text>
              </View>
            )}

            {/* Action buttons for pending requests I received */}
            {canPayOrDecline && (
              <View style={styles.requestActions}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#6C5CE7" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDeclineRequest(payment)}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => handlePayRequest(payment)}
                    >
                      <Text style={styles.payButtonText}>Pay</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Cancel button for pending requests I sent */}
            {canCancel && (
              <View style={styles.requestActions}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#888" />
                ) : (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelRequest(payment)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel request</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedPaymentNote]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    // Regular payment (not a request)
    return (
      <View style={[styles.bubbleContainer, isSent ? styles.sentContainer : styles.receivedContainer]}>
        <View style={[styles.paymentBubble, isSent ? styles.sentPaymentBubble : styles.receivedPaymentBubble]}>
          <View style={styles.paymentHeader}>
            <Ionicons
              name={isSent ? 'arrow-forward' : 'arrow-back'}
              size={14}
              color={isSent ? '#fff' : '#000'}
            />
            <Text style={[styles.paymentLabel, isSent ? styles.sentText : styles.receivedPaymentText]}>
              {isSent ? 'You sent' : 'You received'}
            </Text>
          </View>
          <Text style={[styles.paymentAmount, isSent ? styles.sentText : styles.receivedPaymentText]}>
            {xrpAmount.toFixed(2)} XRP
          </Text>
          {payment.note && (
            <Text style={[styles.paymentNote, isSent ? styles.sentTime : styles.receivedPaymentNote]}>
              {payment.note}
            </Text>
          )}
          <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedPaymentNote]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    if (item.itemType === 'MESSAGE') {
      return renderMessageBubble(item);
    } else if (item.itemType === 'PAYMENT') {
      return renderPaymentBubble(item);
    }
    return null;
  };

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeaderContainer}>
      <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  const groupedItems = getGroupedItems();
  const canChat = conversation?.chatEnabled && isInternal;
  const canRequest = conversation?.requestEnabled && isInternal;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerName}>{params.displayName}</Text>
          <Text style={styles.headerTag}>{params.xflowTag}</Text>
        </View>
        <View style={styles.headerAvatar}>
          <Text style={styles.avatarText}>
            {params.displayName?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={groupedItems}
        keyExtractor={(item, index) => `group-${index}`}
        renderItem={({ item: group }) => (
          <View>
            {renderDateHeader(group.date)}
            {group.items.map((item: ConversationItem, idx: number) => (
              <View key={`${item.itemType}-${item.timestamp}-${idx}`}>
                {renderItem({ item })}
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {canRequest && (
          <TouchableOpacity style={styles.actionButton} onPress={handleRequestPress}>
            <Ionicons name="arrow-down" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Request</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.sendButton, !canRequest && styles.sendButtonFull]} onPress={handleSendPress}>
          <Ionicons name="arrow-forward" size={18} color="#000" />
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Message Input - only if chat is enabled */}
      {isInternal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.messageInput, !canChat && styles.messageInputDisabled]}
              placeholder={canChat ? 'Type a message...' : 'Complete a payment to chat'}
              placeholderTextColor="#666"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              editable={canChat}
            />
            {canChat && messageText.trim() ? (
              <TouchableOpacity
                style={styles.sendMessageButton}
                onPress={handleSendMessage}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.emojiButton}>
                <Ionicons name="happy-outline" size={24} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerTag: {
    fontSize: 13,
    color: '#888',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bubbleContainer: {
    marginVertical: 4,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#333',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#fff',
  },
  receivedPaymentText: {
    color: '#000',
  },
  receivedPaymentNote: {
    color: 'rgba(0,0,0,0.6)',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  sentTime: {
    color: '#888',
    textAlign: 'right',
  },
  receivedTime: {
    color: '#888',
  },
  paymentBubble: {
    maxWidth: '75%',
    padding: 16,
    borderRadius: 16,
    minWidth: 150,
  },
  sentPaymentBubble: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  receivedPaymentBubble: {
    backgroundColor: '#00D4AA',
    borderBottomLeftRadius: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: '300',
    marginVertical: 4,
  },
  paymentNote: {
    fontSize: 13,
    marginBottom: 4,
    opacity: 0.8,
  },
  requestBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    minWidth: 180,
  },
  sentRequestBubble: {
    backgroundColor: '#444',
    borderBottomRightRadius: 4,
  },
  receivedRequestBubble: {
    backgroundColor: '#FFA500',
    borderBottomLeftRadius: 4,
  },
  declinedRequestBubble: {
    opacity: 0.6,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requestLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  payButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  sendButtonFull: {
    flex: 2,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 16,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
  },
  messageInputDisabled: {
    opacity: 0.5,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
