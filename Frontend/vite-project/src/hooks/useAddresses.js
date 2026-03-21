import { useState, useEffect, useCallback } from 'react';
import { addressService } from '../services';

// Schema truth: address has only street, city, postal_code, country, is_default
// No first_name, last_name, apartment, district in the DB
// The old hook faked those fields via localStorage — removed entirely

const getErrorMessage = (err, fallback) =>
  err?.error || err?.message || fallback;

export const useAddresses = () => {
  const [addresses, setAddresses]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await addressService.getUserAddresses();
      const list = Array.isArray(res?.addresses) ? res.addresses : [];
      setAddresses(list);
      // keep selectedAddress in sync — if it was deleted upstream, clear it
      setSelectedAddress(prev => {
        if (!prev) return list.find(a => a.is_default) || list[0] || null;
        const still = list.find(a => a.address_id === prev.address_id);
        return still ?? (list.find(a => a.is_default) || list[0] || null);
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch addresses'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  // POST /api/addresses
  const addAddress = async (addressData) => {
    try {
      const res = await addressService.createAddress(addressData);
      const created = res?.address;
      if (!created?.address_id) {
        return { success: false, error: 'Invalid response from server' };
      }
      setAddresses(prev => {
        // if new address is default, demote all others locally
        const base = created.is_default
          ? prev.map(a => ({ ...a, is_default: false }))
          : prev;
        return [created, ...base];
      });
      if (created.is_default) {
        setSelectedAddress(created);
      } else if (!selectedAddress) {
        setSelectedAddress(created);
      }
      return { success: true, address: created };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to add address') };
    }
  };

  // PATCH /api/addresses/:id  (fields only — never sends is_default)
  const updateAddress = async (addressId, addressData) => {
    try {
      const res = await addressService.updateAddress(addressId, addressData);
      const updated = res?.address;
      if (!updated?.address_id) {
        return { success: false, error: 'Invalid response from server' };
      }
      setAddresses(prev =>
        prev.map(a => a.address_id === addressId ? { ...a, ...updated } : a)
      );
      if (selectedAddress?.address_id === addressId) {
        setSelectedAddress(prev => ({ ...prev, ...updated }));
      }
      return { success: true, address: updated };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to update address') };
    }
  };

  // PATCH /api/addresses/:id/default  — dedicated endpoint, atomically clears others
  const setDefaultAddress = async (addressId) => {
    try {
      const res = await addressService.setDefaultAddress(addressId);
      const updated = res?.address;
      if (!updated?.address_id) {
        return { success: false, error: 'Invalid response from server' };
      }
      // demote all locally, then set the one confirmed by server
      setAddresses(prev =>
        prev.map(a =>
          a.address_id === addressId
            ? { ...a, is_default: true }
            : { ...a, is_default: false }
        )
      );
      setSelectedAddress(updated);
      return { success: true, address: updated };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to set default address') };
    }
  };

  // DELETE /api/addresses/:id
  // Backend handles soft-delete vs hard-delete and auto-promotes next default
  // We refetch after delete so local state reflects what the server decided
  const deleteAddress = async (addressId) => {
    try {
      await addressService.deleteAddress(addressId);
      // Refetch so default promotion from backend is reflected accurately
      await fetchAddresses();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to delete address') };
    }
  };

  const selectAddress = (addressId) => {
    const found = addresses.find(a => a.address_id === addressId);
    if (found) setSelectedAddress(found);
  };

  // Human-readable single line — only real schema fields
  const formatAddress = (address) => {
    if (!address) return '';
    return [
      address.street,
      address.city,
      address.postal_code,
      address.country,
    ].filter(Boolean).join(', ');
  };

  return {
    addresses,
    loading,
    error,
    selectedAddress,
    addAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    selectAddress,
    formatAddress,
    refetch: fetchAddresses,
  };
};