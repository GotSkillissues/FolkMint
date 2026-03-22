import { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../services';

const PAYMENT_LABELS = {
  cod:        'Cash on Delivery',
  bkash:      'bKash',
  visa:       'Visa',
  mastercard: 'Mastercard',
  amex:       'American Express',
};

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res     = await paymentService.getUserPaymentMethods();
      const methods = Array.isArray(res?.payment_methods) ? res.payment_methods : [];
      setPaymentMethods(methods);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []); // no deps — stable reference

  useEffect(() => { fetchPaymentMethods(); }, [fetchPaymentMethods]);

  const addPaymentMethod = async (methodData) => {
    try {
      const res       = await paymentService.addPaymentMethod(methodData);
      const newMethod = res?.payment_method;
      if (!newMethod?.payment_method_id) return { success: false, error: 'Invalid response from server' };
      setPaymentMethods(prev => {
        const base = newMethod.is_default
          ? prev.map(m => ({ ...m, is_default: false }))
          : prev;
        return [newMethod, ...base];
      });
      return { success: true, method: newMethod };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to add payment method' };
    }
  };

  // PATCH /api/payment-methods/:id/default
  const setDefault = async (methodId) => {
    try {
      const res     = await paymentService.setDefaultPaymentMethod(methodId);
      const updated = res?.payment_method;
      if (!updated?.payment_method_id) return { success: false, error: 'Invalid response from server' };
      setPaymentMethods(prev =>
        prev.map(m => ({ ...m, is_default: m.payment_method_id === methodId }))
      );
      return { success: true, method: updated };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to set default' };
    }
  };

  const deletePaymentMethod = async (methodId) => {
    try {
      await paymentService.deletePaymentMethod(methodId);
      setPaymentMethods(prev => {
        const filtered    = prev.filter(m => m.payment_method_id !== methodId);
        const wasDefault  = prev.find(m => m.payment_method_id === methodId)?.is_default;
        // Backend auto-promotes on delete — refetch to get accurate default
        if (wasDefault && filtered.length > 0) {
          // Optimistically promote first remaining
          filtered[0] = { ...filtered[0], is_default: true };
        }
        return filtered;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to delete payment method' };
    }
  };

  const getLabel = (type) => PAYMENT_LABELS[type] || type;

  return {
    paymentMethods,
    loading,
    error,
    addPaymentMethod,
    setDefault,
    deletePaymentMethod,
    getLabel,
    refetch: fetchPaymentMethods,
  };
};