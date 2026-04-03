import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res?.unread_count || 0);
    } catch (err) {
      console.error('Failed to refresh unread count:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Optionally poll or set up a listener here
  
  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
