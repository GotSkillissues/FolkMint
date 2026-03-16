import { useState, useEffect, useCallback } from 'react';
import { addressService } from '../services';

/**
 * Hook for managing user addresses
 */
export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await addressService.getUserAddresses();
      const rawList = response.addresses || response.data || response || [];
      const addressList = Array.isArray(rawList) ? rawList.filter((item) => item?.address_id) : [];
      setAddresses(addressList);
      
      // Auto-select first address if none selected
      if (!selectedAddress && addressList.length > 0) {
        setSelectedAddress(addressList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  }, [selectedAddress]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Add new address
  const addAddress = async (addressData) => {
    try {
      const response = await addressService.createAddress(addressData);
      const newAddress = response.address || response.data?.address || response.data || response;
      if (!newAddress?.address_id) {
        return { success: false, error: 'Invalid address response from server' };
      }
      setAddresses(prev => [...prev, newAddress]);
      return { success: true, address: newAddress };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update existing address
  const updateAddress = async (addressId, addressData) => {
    try {
      const response = await addressService.updateAddress(addressId, addressData);
      const updatedAddress = response.address || response.data?.address || response.data || response;
      if (!updatedAddress?.address_id) {
        return { success: false, error: 'Invalid address response from server' };
      }
      setAddresses(prev => 
        prev.map(addr => 
          addr.address_id === addressId ? updatedAddress : addr
        )
      );
      if (selectedAddress?.address_id === addressId) {
        setSelectedAddress(updatedAddress);
      }
      return { success: true, address: updatedAddress };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete address
  const deleteAddress = async (addressId) => {
    try {
      await addressService.deleteAddress(addressId);
      setAddresses(prev => {
        const filtered = prev.filter(addr => addr.address_id !== addressId);
        if (selectedAddress?.address_id === addressId) {
          setSelectedAddress(filtered[0] || null);
        }
        return filtered;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Select address
  const selectAddress = (addressId) => {
    const address = addresses.find(a => a.address_id === addressId);
    setSelectedAddress(address || null);
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    const parts = [
      address.street,
      address.city,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return {
    addresses,
    loading,
    error,
    selectedAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    selectAddress,
    formatAddress,
    refetch: fetchAddresses,
  };
};
