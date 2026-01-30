import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const userService = {
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
      const response = await apiClient.put(API_ENDPOINTS.USERS.UPDATE_PROFILE, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.USERS.CHANGE_PASSWORD, passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default userService;
