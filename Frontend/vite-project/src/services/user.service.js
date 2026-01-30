import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * User Service
 * Handles user profile and preferences
 * Maps to: users, user_preferences, preference_category tables
 */
const userService = {
  // ==================== PROFILE ====================

  // Get user profile
  getProfile: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.PROFILE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      // userData: { first_name?, last_name?, username?, email? }
      const response = await apiClient.put(API_ENDPOINTS.USERS.UPDATE_PROFILE, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      // passwordData: { current_password, new_password }
      const response = await apiClient.put(API_ENDPOINTS.USERS.CHANGE_PASSWORD, passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== PREFERENCES ====================

  // Get user preferences (view count & preferred categories)
  getPreferences: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.PREFERENCES);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user preferences
  updatePreferences: async (preferencesData) => {
    try {
      // preferencesData: { category_ids: number[] }
      const response = await apiClient.put(API_ENDPOINTS.USERS.UPDATE_PREFERENCES, preferencesData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Increment view count (called when viewing products)
  incrementViewCount: async () => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.USERS.PREFERENCES + '/view');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== ADMIN OPERATIONS ====================

  // Get all users (admin only)
  getAllUsers: async (params = {}) => {
    try {
      // params: { page, limit, role, search }
      const response = await apiClient.get(API_ENDPOINTS.USERS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user by ID (admin only)
  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(userId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user (admin only)
  updateUser: async (userId, userData) => {
    try {
      // userData: { first_name?, last_name?, role?, etc. }
      const response = await apiClient.put(API_ENDPOINTS.USERS.BY_ID(userId), userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete user (admin only)
  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(userId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Get user's full name
  getFullName: (user) => {
    if (!user) return '';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.username;
  },

  // Get user's initials
  getInitials: (user) => {
    if (!user) return '?';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username ? user.username[0].toUpperCase() : '?';
  },

  // Check if user is admin
  isAdmin: (user) => {
    return user?.role === 'admin';
  },

  // Check if user is customer
  isCustomer: (user) => {
    return user?.role === 'customer';
  },

  // Format join date
  formatJoinDate: (createdAt) => {
    return new Date(createdAt).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'long',
    });
  },
};

export default userService;
