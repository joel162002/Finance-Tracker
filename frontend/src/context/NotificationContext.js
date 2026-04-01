import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    enable_notifications: true,
    budget_alerts: true,
    recurring_alerts: true,
    threshold_warning: 80,
    threshold_danger: 90
  });

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, []);

  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      const response = await api.put('/notifications/preferences', newPrefs);
      setPreferences(response.data);
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }, []);

  const checkRecurringNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await api.get('/notifications/check-recurring');
      fetchNotifications(); // Refresh notifications after check
    } catch (error) {
      console.error('Failed to check recurring notifications:', error);
    }
  }, [fetchNotifications]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  const value = {
    notifications,
    unreadCount,
    loading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updatePreferences,
    checkRecurringNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
