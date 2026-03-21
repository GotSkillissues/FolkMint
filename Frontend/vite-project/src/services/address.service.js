import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

// Schema: address(address_id, street, city, postal_code, country, is_default, is_deleted, user_id)
// No first_name, last_name, apartment, district — those columns do not exist in the DB

const addressService = {

  // GET /api/addresses
  getUserAddresses: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADDRESSES.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // GET /api/addresses/:id
  getAddressById: async (addressId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADDRESSES.BY_ID(addressId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/addresses
  // Required: street, city, country
  // Optional: postal_code, is_default
  createAddress: async (addressData) => {
    try {
      const payload = {
        street:      String(addressData.street      || '').trim(),
        city:        String(addressData.city        || '').trim(),
        postal_code: String(addressData.postal_code || '').trim() || undefined,
        country:     String(addressData.country     || 'Bangladesh').trim(),
        is_default:  !!addressData.is_default,
      };
      const response = await apiClient.post(API_ENDPOINTS.ADDRESSES.BASE, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/addresses/:id
  // Backend accepts: street, city, postal_code, country
  // IMPORTANT: backend REJECTS is_default here — use setDefaultAddress instead
  updateAddress: async (addressId, addressData) => {
    try {
      const payload = {};
      if (Object.prototype.hasOwnProperty.call(addressData, 'street'))
        payload.street = String(addressData.street || '').trim();
      if (Object.prototype.hasOwnProperty.call(addressData, 'city'))
        payload.city = String(addressData.city || '').trim();
      if (Object.prototype.hasOwnProperty.call(addressData, 'postal_code'))
        payload.postal_code = String(addressData.postal_code || '').trim() || null;
      if (Object.prototype.hasOwnProperty.call(addressData, 'country'))
        payload.country = String(addressData.country || 'Bangladesh').trim();
      // Never send is_default here — backend returns 400
      const response = await apiClient.patch(API_ENDPOINTS.ADDRESSES.BY_ID(addressId), payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/addresses/:id/default
  // Dedicated endpoint to change which address is default — clears all others atomically
  setDefaultAddress: async (addressId) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.ADDRESSES.SET_DEFAULT(addressId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE /api/addresses/:id
  // Backend soft-deletes if address is referenced by an order, hard-deletes otherwise
  // If deleted address was default, backend auto-promotes the next most recent one
  deleteAddress: async (addressId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.ADDRESSES.BY_ID(addressId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default addressService;