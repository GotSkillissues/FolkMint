import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services';

/**
 * Hook for fetching user's orders
 */
export const useOrders = (initialParams = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [params, setParams] = useState(initialParams);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getUserOrders({
        ...params,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      if (response.data) {
        setOrders(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          }));
        }
      } else if (Array.isArray(response)) {
        setOrders(response);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [params, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const filterByStatus = (status) => {
    setParams(prev => ({ ...prev, status }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const cancelOrder = async (orderId) => {
    try {
      await orderService.cancelOrder(orderId);
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.order_id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        )
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    orders,
    loading,
    error,
    pagination,
    setPage,
    filterByStatus,
    cancelOrder,
    refetch: fetchOrders,
  };
};

/**
 * Hook for fetching a single order by ID
 */
export const useOrder = (orderId) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getOrderById(orderId);
      setOrder(response.data || response);
    } catch (err) {
      setError(err.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!order || !orderService.canCancelOrder(order)) {
      return { success: false, error: 'Cannot cancel this order' };
    }
    try {
      await orderService.cancelOrder(orderId);
      setOrder(prev => ({ ...prev, status: 'cancelled' }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    order,
    loading,
    error,
    cancelOrder,
    canCancel: order ? orderService.canCancelOrder(order) : false,
    canReview: order ? orderService.canReviewOrder(order) : false,
    refetch: fetchOrder,
  };
};
