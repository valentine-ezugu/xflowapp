// Polyfill TextEncoder/TextDecoder for React Native (required by @stomp/stompjs)
import 'text-encoding-polyfill';

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Platform } from 'react-native';
import { tokenStorage } from './api';

// Environment configuration
const __DEV__ = process.env.NODE_ENV !== 'production';
const USE_LOCALHOST = false;

/**
 * Get WebSocket URL based on platform and environment.
 */
const getWebSocketUrl = (): string => {
  if (!__DEV__) {
    return 'wss://api.zevlian.com/ws'; // Production URL
  }

  if (USE_LOCALHOST) {
    if (Platform.OS === 'web') {
      return 'ws://localhost:8080/ws';
    } else {
      // For Expo Go on real devices, use your computer's local IP
      return 'ws://192.168.1.21:8080/ws';
    }
  }

  return 'wss://dev-api.zevlian.com/ws';
};

/**
 * Event types that can be received via WebSocket.
 */
export type WebSocketEventType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_SENT'
  | 'REQUEST_RECEIVED'
  | 'REQUEST_PAID'
  | 'REQUEST_DECLINED'
  | 'REQUEST_CANCELLED'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGES_READ';

/**
 * WebSocket event structure.
 */
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  counterpartyId?: number;
  counterpartyAddress?: string;
  timestamp: string;
}

/**
 * Listener callback type.
 */
export type WebSocketListener = (event: WebSocketEvent) => void;

/**
 * WebSocket service for real-time notifications.
 * Singleton pattern - maintains a single connection across the app.
 */
class WebSocketService {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private listeners: Set<WebSocketListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;

  /**
   * Connect to WebSocket server with JWT authentication.
   */
  async connect(): Promise<void> {
    if (this.client?.connected || this.isConnecting) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    try {
      // Get auth token (works on both web and native)
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        console.log('[WebSocket] No auth token, skipping connection');
        this.isConnecting = false;
        return;
      }

      const wsUrl = getWebSocketUrl();
      console.log('[WebSocket] Connecting to:', wsUrl);

      this.client = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => {
          if (__DEV__) {
            // Hide token in logs for security
            const sanitized = str.replace(/Bearer [A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, 'Bearer [HIDDEN]');
            console.log('[WebSocket]', sanitized);
          }
        },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('[WebSocket] Connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.subscribeToNotifications();
        },
        onDisconnect: () => {
          console.log('[WebSocket] Disconnected');
          this.subscription = null;
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          this.isConnecting = false;
        },
        onWebSocketError: (event: any) => {
          console.error('[WebSocket] WebSocket error:', JSON.stringify(event, null, 2));
          this.isConnecting = false;
        },
        onWebSocketClose: () => {
          console.log('[WebSocket] WebSocket closed');
          this.isConnecting = false;
          this.handleReconnect();
        },
      });

      // For React Native, we must provide WebSocket factory
      // React Native's WebSocket is available globally but stompjs needs explicit factory
      if (Platform.OS !== 'web') {
        console.log('[WebSocket] Configuring for React Native');
        this.client.webSocketFactory = () => {
          const ws = new WebSocket(wsUrl);
          console.log('[WebSocket] Native WebSocket created');
          return ws;
        };
        // These settings help with React Native WebSocket compatibility
        this.client.forceBinaryWSFrames = true;
        this.client.appendMissingNULLonIncoming = true;
      }

      this.client.activate();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Subscribe to user-specific notification queue.
   */
  private subscribeToNotifications(): void {
    if (!this.client?.connected) {
      console.log('[WebSocket] Cannot subscribe - not connected');
      return;
    }

    // Subscribe to user-specific queue
    // The server routes messages based on authenticated user
    this.subscription = this.client.subscribe(
      '/user/queue/notifications',
      (message: IMessage) => {
        this.handleMessage(message);
      }
    );

    console.log('[WebSocket] Subscribed to /user/queue/notifications');
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(message: IMessage): void {
    try {
      const event: WebSocketEvent = JSON.parse(message.body);
      console.log('[WebSocket] Received event:', event.type);

      // Notify all listeners
      this.listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[WebSocket] Listener error:', error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Handle reconnection attempts.
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.listeners.clear();
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected and cleaned up');
  }

  /**
   * Add a listener for WebSocket events.
   * Returns an unsubscribe function.
   */
  addListener(listener: WebSocketListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Force reconnect (e.g., after token refresh).
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
