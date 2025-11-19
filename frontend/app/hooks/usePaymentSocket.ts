'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface PaymentUpdateEvent {
  type: 'payment_locked' | 'payment_released' | 'payment_updated';
  allocationId: string;
  amount: number;
  status: string;
  timestamp: string;
}

interface UsePaymentSocketOptions {
  userId?: number;
  cateringId?: number;
  onPaymentUpdate?: (event: PaymentUpdateEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// hook untuk koneksi socket.io realtime updates
export function usePaymentSocket({
  userId,
  cateringId,
  onPaymentUpdate,
  onConnect,
  onDisconnect,
}: UsePaymentSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // fungsi untuk connect ke socket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    // event handlers
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
      reconnectAttempts.current = 0;

      // join room berdasarkan user role
      if (userId && cateringId) {
        socketRef.current?.emit('join', {
          userId,
          role: 'catering',
          cateringId,
        });
      }

      onConnect?.();
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      onDisconnect?.();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached, falling back to polling');
        socketRef.current?.disconnect();
      }
    });

    // listen untuk payment events
    socketRef.current.on('payment:locked', (data) => {
      onPaymentUpdate?.({
        type: 'payment_locked',
        ...data,
      });
    });

    socketRef.current.on('payment:released', (data) => {
      onPaymentUpdate?.({
        type: 'payment_released',
        ...data,
      });
    });

    socketRef.current.on('payment:updated', (data) => {
      onPaymentUpdate?.({
        type: 'payment_updated',
        ...data,
      });
    });

    // generic payment update event
    socketRef.current.on('payment_update', (data) => {
      onPaymentUpdate?.(data);
    });
  }, [userId, cateringId, onPaymentUpdate, onConnect, onDisconnect]);

  // fungsi untuk disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // fungsi untuk emit event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // connect saat mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    connect,
    disconnect,
    emit,
  };
}

// hook wrapper untuk payments data dengan socket support
export function usePaymentsDataWithSocket(
  userId?: number,
  cateringId?: number,
  refreshData?: () => void
) {
  const handlePaymentUpdate = useCallback(
    (event: PaymentUpdateEvent) => {
      console.log('Payment update received:', event);

      // refresh data ketika ada update
      refreshData?.();
    },
    [refreshData]
  );

  const { isConnected } = usePaymentSocket({
    userId,
    cateringId,
    onPaymentUpdate: handlePaymentUpdate,
    onConnect: () => {
      console.log('Connected to payment updates');
    },
    onDisconnect: () => {
      console.log('Disconnected from payment updates');
    },
  });

  return {
    isSocketConnected: isConnected,
  };
}

export type { PaymentUpdateEvent };
