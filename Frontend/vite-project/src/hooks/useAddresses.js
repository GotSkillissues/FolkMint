import { useState, useEffect, useCallback } from 'react';
import { addressService } from '../services';

const ADDRESS_META_STORAGE_KEY = 'folkmint_address_meta';

const readAddressMetaMap = () => {
  try {
    const raw = localStorage.getItem(ADDRESS_META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeAddressMetaMap = (metaMap) => {
  localStorage.setItem(ADDRESS_META_STORAGE_KEY, JSON.stringify(metaMap || {}));
};

const attachAddressMeta = (address, metaMap) => {
  const meta = metaMap?.[String(address?.address_id)] || {};
  return {
    ...address,
    first_name: meta.first_name || '',
    last_name: meta.last_name || '',
    apartment: meta.apartment || '',
    district: meta.district || '',
  };
};

const toApiAddressPayload = (addressData) => ({
  street: addressData?.street || '',
  city: addressData?.city || '',
  postal_code: addressData?.postal_code || '',
  country: addressData?.country || 'Bangladesh',
  is_default: !!addressData?.is_default,
});

const toMetaAddressPayload = (addressData) => ({
  first_name: addressData?.first_name || '',
  last_name: addressData?.last_name || '',
  apartment: addressData?.apartment || '',
  district: addressData?.district || '',
});

const getErrorMessage = (err, fallback) => {
  return err?.error || err?.message || fallback;
};

/**
 * Hook for managing user addresses
 */
export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressMetaMap, setAddressMetaMap] = useState(readAddressMetaMap);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await addressService.getUserAddresses();
      const rawList = response.addresses || response.data || response || [];
      const addressList = Array.isArray(rawList)
        ? rawList
          .filter((item) => item?.address_id)
          .map((item) => attachAddressMeta(item, addressMetaMap))
        : [];
      setAddresses(addressList);
      
      // Auto-select first address if none selected
      if (!selectedAddress && addressList.length > 0) {
        setSelectedAddress(addressList[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch addresses'));
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, addressMetaMap]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Add new address
  const addAddress = async (addressData) => {
    try {
      const response = await addressService.createAddress(toApiAddressPayload(addressData));
      const newAddress = response.address || response.data?.address || response.data || response;
      if (!newAddress?.address_id) {
        return { success: false, error: 'Invalid address response from server' };
      }

      const nextMetaMap = {
        ...addressMetaMap,
        [String(newAddress.address_id)]: toMetaAddressPayload(addressData),
      };
      setAddressMetaMap(nextMetaMap);
      writeAddressMetaMap(nextMetaMap);

      const mergedAddress = attachAddressMeta(newAddress, nextMetaMap);
      setAddresses((prev) => {
        const normalized = mergedAddress.is_default
          ? prev.map((addr) => ({ ...addr, is_default: false }))
          : prev;
        return [...normalized, mergedAddress];
      });

      if (mergedAddress.is_default) {
        setSelectedAddress(mergedAddress);
      }

      return { success: true, address: mergedAddress };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to add address') };
    }
  };

  // Update existing address
  const updateAddress = async (addressId, addressData) => {
    try {
      const response = await addressService.updateAddress(addressId, toApiAddressPayload(addressData));
      const updatedAddress = response.address || response.data?.address || response.data || response;
      if (!updatedAddress?.address_id) {
        return { success: false, error: 'Invalid address response from server' };
      }

      const nextMetaMap = {
        ...addressMetaMap,
        [String(addressId)]: toMetaAddressPayload(addressData),
      };
      setAddressMetaMap(nextMetaMap);
      writeAddressMetaMap(nextMetaMap);

      const mergedAddress = attachAddressMeta(updatedAddress, nextMetaMap);
      setAddresses((prev) => {
        const normalized = mergedAddress.is_default
          ? prev.map((addr) => ({ ...addr, is_default: false }))
          : prev;

        return normalized.map((addr) =>
          addr.address_id === addressId ? mergedAddress : addr
        );
      });

      if (selectedAddress?.address_id === addressId) {
        setSelectedAddress(mergedAddress);
      } else if (mergedAddress.is_default) {
        setSelectedAddress(mergedAddress);
      }

      return { success: true, address: mergedAddress };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to update address') };
    }
  };

  // Delete address
  const deleteAddress = async (addressId) => {
    try {
      await addressService.deleteAddress(addressId);

      const nextMetaMap = { ...addressMetaMap };
      delete nextMetaMap[String(addressId)];
      setAddressMetaMap(nextMetaMap);
      writeAddressMetaMap(nextMetaMap);

      setAddresses(prev => {
        const filtered = prev.filter(addr => addr.address_id !== addressId);

        const hasDefault = filtered.some((addr) => addr.is_default);
        const normalized = !hasDefault && filtered.length > 0
          ? filtered.map((addr, index) => ({ ...addr, is_default: index === 0 }))
          : filtered;

        if (selectedAddress?.address_id === addressId) {
          setSelectedAddress(normalized[0] || null);
        }
        return normalized;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Failed to delete address') };
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
      [address.first_name, address.last_name].filter(Boolean).join(' ').trim(),
      address.street,
      address.apartment,
      address.city,
      address.district,
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
