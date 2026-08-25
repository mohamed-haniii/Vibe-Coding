import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSocket } from '../api/client';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
}

interface SocketContextType {
  isConnected: boolean;
  notifications: NotificationItem[];
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function addToast(message: string, type: 'info' | 'success' | 'warning' = 'info') {
      const item: NotificationItem = {
        id: Math.random().toString(36).substr(2, 9),
        message,
        type,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };
      setNotifications(prev => [item, ...prev.slice(0, 4)]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Event handlers
    socket.on('new-visit-in-queue', (data: any) => {
      addToast(`مريض جديد في قائمة الانتظار: ${data.patientName} (رقم الدور: #${data.queueNumber})`, 'info');
    });

    socket.on('consultation-completed', (data: any) => {
      addToast(`تم كشف وإغلاق زيارة المريض: ${data.patientName} بنجاح لدى الدكتورة`, 'success');
    });

    socket.on('shift-opened', (data: any) => {
      addToast(`تم فتح شيفت جديد بواسطة الكاشير: ${data.cashierName}`, 'info');
    });

    socket.on('shift-closed', (data: any) => {
      addToast(`تم إغلاق الشيفت للكاشير: ${data.cashierName}`, 'warning');
    });

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new-visit-in-queue');
      socket.off('consultation-completed');
      socket.off('shift-opened');
      socket.off('shift-closed');
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{
      isConnected,
      notifications,
      dismissNotification,
      clearNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
