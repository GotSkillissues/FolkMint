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
      const addressList = response.data || response || [];
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
      const newAddress = response.data || response;
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
      const updatedAddress = response.data || response;
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
      setAddresses(prev => prev.filter(addr => addr.address_id !== addressId));
      if (selectedAddress?.address_id === addressId) {
        setSelectedAddress(addresses.find(a => a.address_id !== addressId) || null);
      }
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
