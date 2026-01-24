import { useEffect, useCallback, useRef } from 'react';
import { webSocketService, WebSocketEvent, WebSocketEventType } from '@/services/websocket';

/**
 * Hook to connect to WebSocket and listen for events.
 * Automatically connects on mount and disconnects on unmount.
 *
 * @param onEvent - Callback for all events
 * @param eventTypes - Optional filter for specific event types
 */
export function useWebSocket(
  onEvent?: (event: WebSocketEvent) => void,
  eventTypes?: WebSocketEventType[]
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect();

    // Add listener if callback provided
    let unsubscribe: (() => void) | undefined;

    if (onEventRef.current) {
      unsubscribe = webSocketService.addListener((event) => {
        // Filter by event types if specified
        if (eventTypes && !eventTypes.includes(event.type)) {
          return;
        }
        onEventRef.current?.(event);
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [eventTypes?.join(',')]); // Re-subscribe if event types change

  const isConnected = useCallback(() => {
    return webSocketService.isConnected();
  }, []);

  const reconnect = useCallback(async () => {
    await webSocketService.reconnect();
  }, []);

  return {
    isConnected,
    reconnect,
  };
}

/**
 * Hook for conversation-specific WebSocket events.
 * Filters events by counterparty ID or address.
 */
export function useConversationWebSocket(
  counterpartyId: number | null,
  counterpartyAddress: string | null,
  onEvent: (event: WebSocketEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect();

    const unsubscribe = webSocketService.addListener((event) => {
      // Filter by counterparty
      const matchesUser = counterpartyId && event.counterpartyId === counterpartyId;
      const matchesAddress = counterpartyAddress && event.counterpartyAddress === counterpartyAddress;

      if (matchesUser || matchesAddress) {
        onEventRef.current(event);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [counterpartyId, counterpartyAddress]);
}
