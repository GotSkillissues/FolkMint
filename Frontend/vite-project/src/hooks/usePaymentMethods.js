import { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../services';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '../utils/constants';

/**
 * Hook for managing user payment methods
 */
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentService.getUserPaymentMethods();
      const methods = response.data || response || [];
      setPaymentMethods(methods);
      
      // Auto-select first method if none selected
      if (!selectedMethod && methods.length > 0) {
        setSelectedMethod(methods[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, [selectedMethod]);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Add new payment method
  const addPaymentMethod = async (methodData) => {
    try {
      const response = await paymentService.addPaymentMethod(methodData);
      const newMethod = response.data || response;
      setPaymentMethods(prev => [...prev, newMethod]);
      return { success: true, method: newMethod };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update payment method
  const updatePaymentMethod = async (methodId, methodData) => {
    try {
      const response = await paymentService.updatePaymentMethod(methodId, methodData);
      const updatedMethod = response.data || response;
      setPaymentMethods(prev => 
        prev.map(m => m.method_id === methodId ? updatedMethod : m)
      );
      if (selectedMethod?.method_id === methodId) {
        setSelectedMethod(updatedMethod);
      }
      return { success: true, method: updatedMethod };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete payment method
  const deletePaymentMethod = async (methodId) => {
    try {
      await paymentService.deletePaymentMethod(methodId);
      setPaymentMethods(prev => prev.filter(m => m.method_id !== methodId));
      if (selectedMethod?.method_id === methodId) {
        setSelectedMethod(paymentMethods.find(m => m.method_id !== methodId) || null);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Select payment method
  const selectMethod = (methodId) => {
    const method = paymentMethods.find(m => m.method_id === methodId);
    setSelectedMethod(method || null);
  };

  // Get display label for method type
  const getMethodLabel = (type) => {
    return PAYMENT_METHOD_LABELS[type] || type;
  };

  // Get icon for method type
  const getMethodIcon = (type) => {
    return PAYMENT_METHOD_ICONS[type] || '💳';
  };

  // Format method for display
  const formatMethod = (method) => {
    if (!method) return '';
    const label = getMethodLabel(method.type);
    if (method.card_last4) {
      return `${label} (****${method.card_last4})`;
    }
    return label;
  };

  // Check if method is expired (for cards)
  const isExpired = (method) => {
    if (!method.expiry_date) return false;
    return new Date(method.expiry_date) < new Date();
  };

  // Get methods by type
  const getMethodsByType = (type) => {
    return paymentMethods.filter(m => m.type === type);
  };

  // Check if user has mobile payment
  const hasMobilePayment = paymentMethods.some(m => 
    ['bkash', 'nagad', 'rocket'].includes(m.type)
  );

  // Check if user has card
  const hasCard = paymentMethods.some(m => m.type === 'card');

  return {
    paymentMethods,
    loading,
    error,
    selectedMethod,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    selectMethod,
    getMethodLabel,
    getMethodIcon,
    formatMethod,
    isExpired,
    getMethodsByType,
    hasMobilePayment,
    hasCard,
    refetch: fetchPaymentMethods,
  };
};
