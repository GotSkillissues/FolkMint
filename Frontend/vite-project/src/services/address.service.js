import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Address Service
 * Handles all address-related API calls
 * Maps to: address table
 */
const addressService = {
  // Get all addresses for the current user
  getUserAddresses: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADDRESSES.USER_ADDRESSES);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get address by ID
  getAddressById: async (addressId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADDRESSES.BY_ID(addressId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new address
  createAddress: async (addressData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ADDRESSES.BASE, addressData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update address
  updateAddress: async (addressId, addressData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ADDRESSES.BY_ID(addressId), addressData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete address
  deleteAddress: async (addressId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.ADDRESSES.BY_ID(addressId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all addresses (admin only)
  getAllAddresses: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADDRESSES.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default addressService;
