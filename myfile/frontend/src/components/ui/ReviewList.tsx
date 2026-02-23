import React from 'react';
import { Star } from 'lucide-react';
import { ReviewCard } from './ReviewCard';
import type { Review } from '../../types/schema';

interface ReviewListProps {
    reviews: (Review & { user?: { username: string } })[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

    const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        percentage: reviews.length > 0
            ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100
            : 0
    }));

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={20}
                className={i < Math.round(rating) ? 'fill-yellow-500 text-yellow-500' : 'text-earth-300'}
            />
        ));
    };

    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 bg-earth-50 rounded-lg">
                <p className="text-earth-500 text-lg">No reviews yet. Be the first to review this product!</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Rating Summary */}
            <div className="bg-earth-50 p-8 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Average Rating */}
                    <div className="text-center md:text-left">
                        <div className="text-5xl font-bold text-earth-900 mb-2">
                            {averageRating.toFixed(1)}
                        </div>
                        <div className="flex justify-center md:justify-start gap-1 mb-2">
                            {renderStars(averageRating)}
                        </div>
                        <p className="text-earth-600">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="space-y-2">
                        {ratingCounts.map(({ star, count, percentage }) => (
                            <div key={star} className="flex items-center gap-3">
                                <span className="text-sm text-earth-600 w-12">{star} star</span>
                                <div className="flex-1 h-2 bg-earth-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-earth-600 w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-earth-900">Customer Reviews</h3>
                {reviews.map((review) => (
                    <ReviewCard key={review.review_id} review={review} />
                ))}
            </div>
        </div>
    );
};
