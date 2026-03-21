import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Notification Service
 * Handles all notification-related API calls
 * Maps to: notification table
 */
const notificationService = {

  // GET /api/notifications
  // Returns current user's notifications. Admin sees their own.
  getNotifications: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // GET /api/notifications/unread-count
  getUnreadCount: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // GET /api/notifications/:id
  getNotificationById: async (notificationId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.BY_ID(notificationId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/notifications/:id/read
  markAsRead: async (notificationId) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/notifications/read-all
  markAllAsRead: async () => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE /api/notifications/:id
  deleteNotification: async (notificationId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.BY_ID(notificationId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE /api/notifications/read
  // Deletes all read notifications for the current user
  deleteReadNotifications: async () => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE_READ);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/notifications/system
  // Admin only. user_id provided → single user. No user_id → broadcast to all customers.
  sendSystemNotification: async (payload) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.SEND_SYSTEM, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default notificationService;