import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const userService = {

  // GET /api/auth/me
  getProfile: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/users/:id  — only first_name, last_name (no email, no username in schema)
  updateProfile: async (userData) => {
    try {
      const currentUser = getStoredUser();
      if (!currentUser?.user_id) throw new Error('No user session found. Please log in again.');
      // Only send fields the backend accepts for self-update
      const payload = {};
      if (Object.prototype.hasOwnProperty.call(userData, 'first_name')) payload.first_name = userData.first_name;
      if (Object.prototype.hasOwnProperty.call(userData, 'last_name'))  payload.last_name  = userData.last_name;
      const response = await apiClient.patch(API_ENDPOINTS.USERS.BY_ID(currentUser.user_id), payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/users/:id  — password field only
  // Backend validates: min 6 chars, 1 uppercase, 1 number
  changePassword: async ({ password }) => {
    try {
      const currentUser = getStoredUser();
      if (!currentUser?.user_id) throw new Error('No user session found. Please log in again.');
      const response = await apiClient.patch(API_ENDPOINTS.USERS.BY_ID(currentUser.user_id), { password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

// POST /api/auth/register
  // Only endpoint that creates users. Always creates as 'customer'.
  // Caller must PATCH role separately if admin role is needed.
  createUser: async (userData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // GET /api/users/me/preferences
  getPreferences: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.MY_PREFERENCES);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ── Admin operations ──────────────────────────────────

  getAllUsers: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(userId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Admin: can also update role
  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.USERS.BY_ID(userId), userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(userId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ── Utilities ─────────────────────────────────────────

  getFullName: (user) => {
    if (!user) return '';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '';
  },

  getInitials: (user) => {
    if (!user) return '?';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name[0].toUpperCase();
    if (user.email)      return user.email[0].toUpperCase();
    return '?';
  },

  isAdmin: (user) => user?.role === 'admin',

  formatJoinDate: (createdAt) =>
    new Date(createdAt).toLocaleDateString('en-BD', { year: 'numeric', month: 'long' }),
};

export default userService;