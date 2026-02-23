import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface ReviewFormProps {
    onSubmit: (rating: number, comment: string, username: string) => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0 || !comment.trim() || !username.trim()) {
            alert('Please fill in all fields and select a rating');
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        onSubmit(rating, comment, username);

        // Reset form
        setRating(0);
        setComment('');
        setUsername('');
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-8 rounded-lg border border-earth-200 shadow-sm">
            <h3 className="text-2xl font-bold text-earth-900 mb-6">Write a Review</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star Rating */}
                <div>
                    <label className="block text-sm font-bold text-earth-900 mb-2">
                        Your Rating *
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="transition-transform hover:scale-110"
                            >
                                <Star
                                    size={32}
                                    className={
                                        star <= (hoveredRating || rating)
                                            ? 'fill-yellow-500 text-yellow-500'
                                            : 'text-earth-300'
                                    }
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Username */}
                <div>
                    <label htmlFor="username" className="block text-sm font-bold text-earth-900 mb-2">
                        Your Name *
                    </label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-earth-300 rounded-md focus:ring-2 focus:ring-bamboo-500 focus:border-bamboo-500 outline-none"
                        placeholder="Enter your name"
                        required
                    />
                </div>

                {/* Comment */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-bold text-earth-900 mb-2">
                        Your Review *
                    </label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-earth-300 rounded-md focus:ring-2 focus:ring-bamboo-500 focus:border-bamboo-500 outline-none resize-none"
                        placeholder="Share your experience with this product..."
                        required
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-md font-bold text-white transition-colors ${isSubmitting
                        ? 'bg-earth-400 cursor-not-allowed'
                        : 'bg-bamboo-600 hover:bg-bamboo-700'
                        }`}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </form>
        </div>
    );
};
