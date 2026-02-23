import React from 'react';
import { Star } from 'lucide-react';
import type { Review } from '../../types/schema';

interface ReviewCardProps {
    review: Review & { user?: { username: string } };
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={16}
                className={i < rating ? 'fill-yellow-500 text-yellow-500' : 'text-earth-300'}
            />
        ));
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-earth-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-earth-900">
                            {review.user?.username || 'Anonymous'}
                        </span>
                        <div className="flex gap-0.5">
                            {renderStars(review.rating || 0)}
                        </div>
                    </div>
                    <p className="text-sm text-earth-500">Verified Purchase</p>
                </div>
            </div>
            <p className="text-earth-700 leading-relaxed">{review.comment}</p>
        </div>
    );
};
