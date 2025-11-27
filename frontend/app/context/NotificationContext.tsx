'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Socket.IO connects to base URL (without /api)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      id,
      ...notification,
      duration: notification.duration || 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Create WebSocket connection
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');

      // Join appropriate rooms based on user role
      const joinData: any = {
        userId: user.id,
        role: user.role,
      };

      if (user.role === 'school' && user.school_id) {
        joinData.schoolId = user.school_id;
      } else if (user.role === 'catering' && user.catering_id) {
        joinData.cateringId = user.catering_id;
      }

      newSocket.emit('join', joinData);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Listen for verification created events
    newSocket.on('verification:created', (data) => {
      console.log('📢 Verification created:', data);

      addNotification({
        type: 'success',
        title: 'Verifikasi Berhasil',
        message: data.message || 'Pengiriman telah diverifikasi',
        duration: 7000,
      });
    });

    // Listen for delivery update events
    newSocket.on('delivery:updated', (data) => {
      console.log('📢 Delivery updated:', data);

      addNotification({
        type: 'info',
        title: 'Update Pengiriman',
        message: data.message || 'Status pengiriman telah diupdate',
        duration: 5000,
      });
    });

    // Listen for issue created events
    newSocket.on('issue:created', (data) => {
      console.log('📢 Issue created:', data);

      addNotification({
        type: 'warning',
        title: 'Laporan Masalah',
        message: data.message || 'Laporan masalah baru diterima',
        duration: 6000,
      });
    });

    // Listen for general notifications
    newSocket.on('notification', (data) => {
      console.log('📢 Notification:', data);

      addNotification({
        type: data.type || 'info',
        title: data.title || 'Notifikasi',
        message: data.message,
        duration: data.duration,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
