import { useState, useEffect, useCallback } from 'react';
import { reviewService } from '../services';

/**
 * Hook for fetching user's reviews
 */
export const useReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reviewService.getUserReviews();
      setReviews(response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Update a review
  const updateReview = async (reviewId, reviewData) => {
    try {
      const response = await reviewService.updateReview(reviewId, reviewData);
      const updatedReview = response.data || response;
      setReviews(prev => 
        prev.map(r => r.review_id === reviewId ? updatedReview : r)
      );
      return { success: true, review: updatedReview };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete a review
  const deleteReview = async (reviewId) => {
    try {
      await reviewService.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.review_id !== reviewId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    reviews,
    loading,
    error,
    updateReview,
    deleteReview,
    refetch: fetchReviews,
  };
};

/**
 * Hook for fetching reviews for a specific product
 */
export const useProductReviews = (productId) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewableOrderItems, setReviewableOrderItems] = useState([]);

  const fetchReviews = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await reviewService.getProductReviews(productId);
      setReviews(response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const checkCanReview = useCallback(async () => {
    if (!productId) return;
    try {
      const response = await reviewService.canReviewProduct(productId);
      setCanReview(response.can_review || false);
      setReviewableOrderItems(response.order_items || []);
    } catch {
      setCanReview(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [fetchReviews, checkCanReview]);

  // Create a new review
  const createReview = async (reviewData) => {
    try {
      const response = await reviewService.createReview({
        ...reviewData,
        product_id: productId,
      });
      const newReview = response.data || response;
      setReviews(prev => [newReview, ...prev]);
      setCanReview(false);
      return { success: true, review: newReview };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Calculate statistics
  const averageRating = reviewService.calculateAverageRating(reviews);
  const ratingDistribution = reviewService.getRatingDistribution(reviews);
  const totalReviews = reviews.length;

  return {
    reviews,
    loading,
    error,
    canReview,
    reviewableOrderItems,
    createReview,
    averageRating,
    ratingDistribution,
    totalReviews,
    refetch: fetchReviews,
  };
};
