import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { api } from '@/services/api';
import { ConversationItem, PaymentConversationResponse, PaymentDetailDto } from '@/types/payment';
import { usePayments } from '@/context/PaymentsContext';

export default function CounterpartyConversationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    id: string; // The userId or address from the URL path
    type: 'user' | 'address'; // Query param to indicate type
    displayName: string;
    xflowTag?: string;
  }>();

  // Use PaymentsContext for caching
  const { getConversation, loadConversation: fetchConversation, isLoadingConversation, addMessageToConversation } = usePayments();

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      parent?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasInitiallyLoaded = useRef(false);

  // Parse params - type indicates if it's a user or address
  const isInternalUser = params.type === 'user';
  const userId = isInternalUser ? parseInt(params.id, 10) : null;
  const address = !isInternalUser ? params.id : null;

  // Get cached conversation immediately
  const conversation = getConversation(userId, address);
  const isLoading = isLoadingConversation(userId, address) && !conversation;

  // Reset initial load tracking when conversation changes
  useEffect(() => {
    hasInitiallyLoaded.current = false;
  }, [userId, address]);

  // Load fresh data in background
  useEffect(() => {
    fetchConversation(userId, address);
  }, [userId, address, fetchConversation]);

  // Helper to reload conversation (for request actions)
  const reloadConversation = useCallback(async () => {
    await fetchConversation(userId, address);
  }, [userId, address, fetchConversation]);

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

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending || !conversation?.chatEnabled || !userId) return;

    const content = messageText.trim();
    setIsSending(true);
    setMessageText(''); // Clear immediately for better UX

    try {
      const response = await api.payment.sendMessage({
        recipientId: userId,
        content,
      });
      // Optimistically add message to conversation via context
      const newItem: ConversationItem = {
        itemType: 'MESSAGE',
        timestamp: response.createdAt,
        sent: true,
        message: {
          id: response.messageId,
          sent: true,
          content: response.content,
          read: false,
          createdAt: response.createdAt,
        },
      };
      addMessageToConversation(userId, newItem);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageText(content); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPress = () => {
    if (userId && params.xflowTag) {
      router.push({
        pathname: '/(send)/amount',
        params: {
          type: 'user',
          xflowTag: params.xflowTag,
          displayName: params.displayName,
        },
      });
    } else if (address) {
      router.push({
        pathname: '/(send)/amount',
        params: {
          type: 'external',
          address: address,
          displayName: params.displayName,
        },
      });
    }
  };

  const handleRequestPress = () => {
    if (!userId || !params.xflowTag) return;
    router.push({
      pathname: '/(request)/amount',
      params: {
        xflowTag: params.xflowTag,
        displayName: params.displayName,
      },
    });
  };

  const handlePayRequest = async (payment: PaymentDetailDto) => {
    const xrpAmount = parseFloat(payment.xrpAmount) || 0;
    const confirmMessage = `Pay ${xrpAmount.toFixed(2)} XRP to ${params.displayName}?`;

    // Use window.confirm on web, Alert.alert on native
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        setIsProcessingRequest(payment.id);
        try {
          await api.payment.payRequest({ paymentRequestId: payment.id });
          await reloadConversation();
        } catch (error: any) {
          console.error('Pay request error:', error);
          window.alert(error.message || 'Failed to pay request');
        } finally {
          setIsProcessingRequest(null);
        }
      }
    } else {
      Alert.alert(
        'Pay Request',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: async () => {
              setIsProcessingRequest(payment.id);
              try {
                await api.payment.payRequest({ paymentRequestId: payment.id });
                await reloadConversation();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to pay request');
              } finally {
                setIsProcessingRequest(null);
              }
            },
          },
        ]
      );
    }
  };

  const handleDeclineRequest = async (payment: PaymentDetailDto) => {
    const confirmMessage = `Decline payment request from ${params.displayName}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        setIsProcessingRequest(payment.id);
        try {
          await api.payment.declineRequest({ paymentRequestId: payment.id });
          await reloadConversation();
        } catch (error: any) {
          window.alert(error.message || 'Failed to decline request');
        } finally {
          setIsProcessingRequest(null);
        }
      }
    } else {
      Alert.alert(
        'Decline Request',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              setIsProcessingRequest(payment.id);
              try {
                await api.payment.declineRequest({ paymentRequestId: payment.id });
                await reloadConversation();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to decline request');
              } finally {
                setIsProcessingRequest(null);
              }
            },
          },
        ]
      );
    }
  };

  const handleCancelRequest = async (payment: PaymentDetailDto) => {
    const confirmMessage = 'Cancel this payment request?';

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        setIsProcessingRequest(payment.id);
        try {
          await api.payment.cancelRequest(payment.id);
          await reloadConversation();
        } catch (error: any) {
          window.alert(error.message || 'Failed to cancel request');
        } finally {
          setIsProcessingRequest(null);
        }
      }
    } else {
      Alert.alert(
        'Cancel Request',
        confirmMessage,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              setIsProcessingRequest(payment.id);
              try {
                await api.payment.cancelRequest(payment.id);
                await reloadConversation();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel request');
              } finally {
                setIsProcessingRequest(null);
              }
            },
          },
        ]
      );
    }
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
    const { message, sent } = item;

    return (
      <View style={[styles.bubbleContainer, sent ? styles.sentContainer : styles.receivedContainer]}>
        <View style={[styles.messageBubble, sent ? styles.sentBubble : styles.receivedBubble]}>
          <Text style={[styles.messageText, sent ? styles.sentText : styles.receivedText]}>
            {message.content}
          </Text>
          <Text style={[styles.timeText, sent ? styles.sentTime : styles.receivedTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      EUR: '€', USD: '$', GBP: '£', PLN: 'zł', NGN: '₦',
      JPY: '¥', CNY: '¥', INR: '₹', KRW: '₩', BRL: 'R$',
      CHF: 'CHF', AUD: 'A$', CAD: 'C$', MXN: 'MX$', ZAR: 'R',
    };
    return symbols[currency] || currency;
  };

  const renderPaymentBubble = (item: ConversationItem) => {
    if (!item.payment) return null;
    const { payment, sent } = item;
    const isRequest = payment.type === 'REQUEST';
    const isPending = payment.status === 'REQUESTED';
    const isDeclined = payment.status === 'DECLINED';
    const isCancelled = payment.status === 'CANCELLED';
    const isProcessing = isProcessingRequest === payment.id;
    const xrpAmount = parseFloat(payment.xrpAmount) || 0;
    const fiatValue = parseFloat(payment.fiatValue) || 0;
    const currencySymbol = getCurrencySymbol(payment.fiatCurrency || 'EUR');

    // For requests: sent means I sent the request (I'm asking for money)
    // canRespond means I can pay/decline (I received the request)
    const canPayOrDecline = isRequest && isPending && payment.canRespond;
    const canCancel = isRequest && isPending && payment.myRequest;

    if (isRequest) {
      return (
        <View style={[styles.bubbleContainer, sent ? styles.sentContainer : styles.receivedContainer]}>
          <View style={[
            styles.paymentBubble,
            sent ? styles.sentPaymentBubble : styles.receivedPaymentBubble,
            (isDeclined || isCancelled) && styles.declinedPaymentBubble,
          ]}>
            {/* Label with arrow */}
            <View style={styles.paymentLabelRow}>
              <Ionicons name={sent ? 'arrow-forward' : 'arrow-back'} size={12} color="#888" />
              <Text style={styles.paymentLabelText}>
                {sent ? 'You requested' : 'Requested'}
              </Text>
            </View>

            {/* Amount - XRP first, then fiat */}
            <Text style={styles.paymentAmountText}>
              {xrpAmount.toFixed(2)} XRP
            </Text>
            {fiatValue > 0 && (
              <Text style={styles.paymentFiatText}>
                {currencySymbol}{fiatValue.toFixed(2)}
              </Text>
            )}

            {/* Note if present */}
            {payment.note && (
              <Text style={styles.paymentNoteText}>{payment.note}</Text>
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
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Time */}
            <Text style={styles.paymentTimeText}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      );
    }

    // Regular payment (not a request) - bubble on right if sent, left if received
    return (
      <View style={[styles.bubbleContainer, sent ? styles.sentContainer : styles.receivedContainer]}>
        <View style={[
          styles.paymentBubble,
          sent ? styles.sentPaymentBubble : styles.receivedPaymentBubble,
        ]}>
          {/* Label with arrow */}
          <View style={styles.paymentLabelRow}>
            <Ionicons
              name={sent ? 'arrow-forward' : 'arrow-back'}
              size={12}
              color={sent ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
            />
            <Text style={[styles.paymentLabelText, !sent && styles.receivedPaymentLabel]}>
              {sent ? 'You sent' : 'You received'}
            </Text>
          </View>

          {/* Amount - XRP first, then fiat */}
          <Text style={[styles.paymentAmountText, !sent && styles.receivedPaymentText]}>
            {xrpAmount.toFixed(2)} XRP
          </Text>
          {fiatValue > 0 && (
            <Text style={[styles.paymentFiatText, !sent && styles.receivedPaymentFiatText]}>
              {currencySymbol}{fiatValue.toFixed(2)}
            </Text>
          )}

          {/* Note if present */}
          {payment.note && (
            <Text style={[styles.paymentNoteText, !sent && styles.receivedPaymentNote]}>
              {payment.note}
            </Text>
          )}

          {/* Time */}
          <Text style={[styles.paymentTimeText, !sent && styles.receivedPaymentTime]}>
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
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  const groupedItems = getGroupedItems();
  const canChat = conversation?.chatEnabled && isInternalUser;
  const canRequest = conversation?.requestEnabled && isInternalUser;

  return (
    <GestureDetector gesture={swipeGesture}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerName}>{params.displayName}</Text>
              {params.xflowTag && <Text style={styles.headerTag}>{params.xflowTag}</Text>}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onLayout={() => {
            // Scroll to end on initial layout (instant, no animation)
            if (!hasInitiallyLoaded.current) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                hasInitiallyLoaded.current = true;
              }, 50);
            }
          }}
          onContentSizeChange={() => {
            // Only animate scroll for new messages after initial load
            if (hasInitiallyLoaded.current) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }}
        />

        {/* Action Buttons - Revolut style */}
        <View style={styles.actionBar}>
          {canRequest && (
            <TouchableOpacity style={styles.requestButton} onPress={handleRequestPress}>
              <Ionicons name="arrow-back" size={16} color="#fff" />
              <Text style={styles.requestButtonText}>Request</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.sendActionButton, !canRequest && styles.sendButtonFull]} onPress={handleSendPress}>
            <Ionicons name="arrow-forward" size={16} color="#000" />
            <Text style={styles.sendActionButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Message Input - only for internal users */}
        {isInternalUser && (
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
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
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
  receivedPaymentLabel: {
    color: 'rgba(0,0,0,0.5)',
  },
  receivedPaymentFiatText: {
    color: 'rgba(0,0,0,0.6)',
  },
  receivedPaymentNote: {
    color: 'rgba(0,0,0,0.6)',
  },
  receivedPaymentTime: {
    color: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 16,
    minWidth: 160,
    maxWidth: '70%',
  },
  declinedPaymentBubble: {
    opacity: 0.5,
  },
  paymentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  paymentLabelText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  paymentAmountText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginVertical: 4,
  },
  paymentFiatText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: -2,
  },
  paymentNoteText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  paymentTimeText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
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
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  sendActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  sendActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
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
