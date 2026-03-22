import { useState, useEffect, useCallback } from 'react';
import { reviewService } from '../services';

// Backend response for user reviews: { reviews: [...], pagination: { page, limit, total, pages } }
// Backend response for product reviews: { summary: { total_reviews, avg_rating, distribution }, reviews: [...], pagination }
// Backend response for canReview: { can_review: bool, reason: string|null }

export const useReviews = () => {
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewService.getUserReviews();
      setReviews(Array.isArray(res?.reviews) ? res.reviews : []);
      if (res?.pagination) {
        setPagination(prev => ({ ...prev, ...res.pagination }));
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateReview = async (reviewId, reviewData) => {
    try {
      const res = await reviewService.updateReview(reviewId, reviewData);
      const updated = res?.review ?? null;
      if (updated) {
        setReviews(prev => prev.map(r => r.review_id === reviewId ? { ...r, ...updated } : r));
      }
      return { success: true, review: updated };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to update review' };
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await reviewService.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.review_id !== reviewId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to delete review' };
    }
  };

  return { reviews, loading, error, pagination, updateReview, deleteReview, refetch: fetchReviews };
};

// Hook for a product's public reviews — used on ProductDetail
export const useProductReviews = (productId) => {
  const [reviews,    setReviews]    = useState([]);
  const [summary,    setSummary]    = useState(null);   // { total_reviews, avg_rating, distribution }
  const [canReview,  setCanReview]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchReviews = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await reviewService.getProductReviews(productId);
      setReviews(Array.isArray(res?.reviews) ? res.reviews : []);
      if (res?.summary) setSummary(res.summary);
      if (res?.pagination) setPagination(prev => ({ ...prev, ...res.pagination }));
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const checkCanReview = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await reviewService.canReviewProduct(productId);
      setCanReview(res?.can_review === true);
    } catch {
      setCanReview(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [fetchReviews, checkCanReview]);

  const createReview = async (reviewData) => {
    try {
      const res = await reviewService.createReview({ ...reviewData, product_id: productId });
      const created = res?.review ?? null;
      if (created) {
        setReviews(prev => [created, ...prev]);
        setCanReview(false);
        // Optimistically bump summary count
        setSummary(prev => prev
          ? { ...prev, total_reviews: (prev.total_reviews || 0) + 1 }
          : prev
        );
      }
      return { success: true, review: created };
    } catch (err) {
      return { success: false, error: err?.error || err?.message || 'Failed to submit review' };
    }
  };

  return {
    reviews,
    summary,
    canReview,
    loading,
    error,
    pagination,
    createReview,
    refetch: fetchReviews,
  };
};