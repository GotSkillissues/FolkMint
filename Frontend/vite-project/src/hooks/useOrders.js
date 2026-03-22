import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services';

// Backend response shape: { orders: [...], pagination: { page, limit, total, pages } }
// Backend response shape for single: { order: { ...order, items: [...], payment: {} } }

export const useOrders = (initialParams = {}) => {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [params,     setParams]     = useState(initialParams);

  const fetchOrders = useCallback(async (page = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getUserOrders({
        ...params,
        page,
        limit: pagination.limit,
      });
      setOrders(Array.isArray(res?.orders) ? res.orders : []);
      if (res?.pagination) {
        setPagination(prev => ({
          ...prev,
          page:  res.pagination.page  ?? prev.page,
          total: res.pagination.total ?? 0,
          pages: res.pagination.pages ?? 1,
        }));
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, pagination.limit]);

  useEffect(() => { fetchOrders(pagination.page); }, [fetchOrders, pagination.page]);

  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const filterByStatus = (status) => {
    setParams(prev => {
      const next = { ...prev };
      if (status && status !== 'all') next.status = status;
      else delete next.status;
      return next;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const cancelOrder = async (orderId) => {
    try {
      await orderService.cancelOrder(orderId);
      setOrders(prev =>
        prev.map(o => o.order_id === orderId ? { ...o, status: 'cancelled' } : o)
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to cancel order' };
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
    refetch: () => fetchOrders(pagination.page),
  };
};

// Hook for a single order — used on order detail views
export const useOrder = (orderId) => {
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrderById(orderId);
      // Backend returns { order: { ...fields, items: [], payment: {} } }
      setOrder(res?.order ?? null);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!order) return { success: false, error: 'Order not loaded' };
    if (!orderService.canCancelOrder(order)) return { success: false, error: 'Cannot cancel this order' };
    try {
      await orderService.cancelOrder(orderId);
      setOrder(prev => ({ ...prev, status: 'cancelled' }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to cancel order' };
    }
  };

  return {
    order,
    loading,
    error,
    cancelOrder,
    canCancel: order ? orderService.canCancelOrder(order) : false,
    canReview: order ? orderService.canReviewOrder(order) : false,
    refetch:   fetchOrder,
  };
};