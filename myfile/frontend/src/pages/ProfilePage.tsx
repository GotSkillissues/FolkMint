import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { User, Package, MapPin, LogOut, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Review, User as UserType } from '../types/schema';
import { reviews as mockReviews } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{ name: string, id: number } | null>(null);
    const [rating, setRating] = useState(5);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewSubmitted, setReviewSubmitted] = useState(false);

    // Auth and Data state
    const { logout, user: authUser } = useAuth();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Address Editing state
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [tempAddress, setTempAddress] = useState('');
    const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            console.log('ProfilePage: fetchProfile called, authUser:', authUser);
            if (!authUser) {
                console.log('ProfilePage: No authUser, navigating to /login');
                navigate('/login');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                console.log(`ProfilePage: Fetching profile for user ${authUser.user_id}`);
                const response = await fetch(`/api/user/profile/${authUser.user_id}`);
                console.log('ProfilePage: Response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('ProfilePage: Received data:', data);
                    setProfileData(data.profile);
                    setOrders(data.orders);
                    setTempAddress(data.profile?.address || '');
                } else {
                    const errorData = await response.json().catch(() => ({ detail: 'Unknown server error' }));
                    console.error('ProfilePage: Fetch failed:', errorData);
                    setError(errorData.detail || 'Failed to fetch profile data');
                }
            } catch (error) {
                console.error('ProfilePage: Catch error:', error);
                setError('Could not connect to the backend server. Please make sure it is running.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [authUser, navigate]);

    const openReviewModal = (productName: string, productId: number) => {
        setSelectedProduct({ name: productName, id: productId });
        setRating(5);
        setHoveredRating(0);
        setComment('');
        setReviewModalOpen(true);
        setReviewSubmitted(false);
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProduct || !authUser) return;

        // Create new review
        const newReview: Review & { user?: UserType } = {
            review_id: mockReviews.length + 1,
            rating,
            comment,
            user_id: authUser.user_id,
            product_id: selectedProduct.id,
            user: {
                user_id: authUser.user_id,
                username: authUser.username,
                email: authUser.email,
                password_hash: '',
                first_name: authUser.first_name,
                last_name: authUser.last_name,
                role: 'customer'
            }
        };

        // Add to mock reviews (in real app, this would be an API call)
        mockReviews.push(newReview);

        setReviewSubmitted(true);
        setTimeout(() => {
            setReviewModalOpen(false);
            setReviewSubmitted(false);
        }, 2000);
    };

    const handleUpdateAddress = async () => {
        if (!authUser) return;

        setIsUpdatingAddress(true);
        try {
            const response = await fetch(`/api/user/profile/${authUser.user_id}/address`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: tempAddress })
            });

            if (response.ok) {
                setProfileData({ ...profileData, address: tempAddress });
                setIsEditingAddress(false);
            } else {
                alert('Failed to update address');
            }
        } catch (error) {
            console.error('Error updating address:', error);
            alert('Error connecting to server');
        } finally {
            setIsUpdatingAddress(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bamboo-600"></div>
                </div>
            </Layout>
        );
    }

    if (error) {
        const isUserNotFound = error.includes('User not found');

        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-red-50 text-red-700 p-8 rounded-lg border border-red-200 max-w-lg">
                        <h2 className="text-2xl font-bold mb-4">Profile Error</h2>
                        <p className="mb-6">{error}</p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-earth-200 text-earth-800 px-6 py-2 rounded-md font-bold hover:bg-earth-300 transition-colors"
                            >
                                Try Again
                            </button>

                            {isUserNotFound && (
                                <button
                                    onClick={handleLogout}
                                    className="bg-bamboo-600 text-white px-6 py-2 rounded-md font-bold hover:bg-bamboo-700 transition-colors"
                                >
                                    Log In Again
                                </button>
                            )}
                        </div>

                        {isUserNotFound && (
                            <p className="mt-4 text-sm text-red-500">
                                Your session might have expired or the server was restarted.
                            </p>
                        )}
                    </div>
                </div>
            </Layout>
        );
    }

    if (!authUser || !profileData) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-earth-600 mb-4">No profile data found.</p>
                    <Link to="/login" className="text-bamboo-600 font-bold hover:underline">
                        Please Login Again
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="bg-earth-100 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-earth-400 border-4 border-white shadow-sm">
                            <User size={48} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-earth-900">{profileData.first_name} {profileData.last_name}</h1>
                            <p className="text-earth-600">{profileData.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 space-y-2">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'orders' ? 'bg-earth-800 text-white' : 'bg-white text-earth-700 hover:bg-earth-50'}`}
                        >
                            <Package size={20} /> My Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeTab === 'profile' ? 'bg-earth-800 text-white' : 'bg-white text-earth-700 hover:bg-earth-50'}`}
                        >
                            <User size={20} /> Personal Info
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-md bg-white text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} /> Sign Out
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeTab === 'orders' ? (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-earth-900 mb-6">Order History</h2>
                                {orders.length > 0 ? orders.map(order => (
                                    <div key={order.order_id} className="bg-white border border-earth-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-earth-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-earth-200">
                                            <div>
                                                <p className="text-sm text-earth-500 uppercase tracking-wide font-bold">Order Placed</p>
                                                <p className="text-earth-900">{new Date(order.order_date || '').toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-earth-500 uppercase tracking-wide font-bold">Total</p>
                                                <p className="text-earth-900 font-bold">৳{typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : order.total_amount}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-earth-500 uppercase tracking-wide font-bold">Order #</p>
                                                <p className="text-earth-900">{order.order_id}</p>
                                            </div>
                                            <div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'Delivered' ? 'bg-bamboo-100 text-bamboo-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            {order.items && order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center py-2 border-b border-earth-100 last:border-0 hover:bg-earth-50/50 transition-colors">
                                                    <div className="flex gap-4">
                                                        <Link to={`/product/${item.product_id}`} className="w-16 h-16 bg-earth-100 rounded-md overflow-hidden flex-shrink-0">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-earth-300 bg-earth-100">
                                                                    <Package size={24} />
                                                                </div>
                                                            )}
                                                        </Link>
                                                        <div>
                                                            <Link to={`/product/${item.product_id}`} className="font-bold text-earth-900 hover:text-bamboo-600 transition-colors">
                                                                {item.name}
                                                            </Link>
                                                            <p className="text-sm text-earth-500">Qty: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => openReviewModal(item.name, item.product_id)}
                                                        className="text-bamboo-600 font-medium hover:underline text-sm"
                                                    >
                                                        Review Product
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 bg-white rounded-lg border border-earth-200">
                                        <Package className="mx-auto text-earth-300 mb-4" size={48} />
                                        <p className="text-earth-500">You haven't placed any orders yet.</p>
                                        <Link to="/shop" className="text-bamboo-600 font-bold hover:underline mt-2 inline-block">Go Shopping</Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-lg border border-earth-200 shadow-sm">
                                <h2 className="text-2xl font-bold text-earth-900 mb-6">Personal Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-earth-500 mb-1">First Name</label>
                                        <input type="text" value={profileData.first_name || ''} readOnly className="w-full p-3 border border-earth-200 rounded bg-earth-50 text-earth-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-earth-500 mb-1">Last Name</label>
                                        <input type="text" value={profileData.last_name || ''} readOnly className="w-full p-3 border border-earth-200 rounded bg-earth-50 text-earth-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-earth-500 mb-1">Email</label>
                                        <input type="email" value={profileData.email || ''} readOnly className="w-full p-3 border border-earth-200 rounded bg-earth-50 text-earth-700" />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-earth-900 mt-8 mb-4 flex items-center gap-2">
                                    <MapPin size={20} /> Shipping Address
                                </h3>
                                <div className="p-4 border border-earth-200 rounded bg-earth-50">
                                    {isEditingAddress ? (
                                        <div className="space-y-4">
                                            <textarea
                                                className="w-full p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none bg-white font-sans text-earth-700"
                                                rows={3}
                                                value={tempAddress}
                                                onChange={(e) => setTempAddress(e.target.value)}
                                                placeholder="Enter your shipping address"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleUpdateAddress}
                                                    disabled={isUpdatingAddress}
                                                    className="bg-bamboo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-bamboo-700 disabled:opacity-50"
                                                >
                                                    {isUpdatingAddress ? 'Saving...' : 'Save Address'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingAddress(false);
                                                        setTempAddress(profileData.address || '');
                                                    }}
                                                    className="bg-earth-200 text-earth-700 px-4 py-2 rounded text-sm font-bold hover:bg-earth-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <p className="text-earth-700">{profileData.address || 'No address provided'}</p>
                                            <button
                                                onClick={() => setIsEditingAddress(true)}
                                                className="text-bamboo-600 font-medium hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {reviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        {reviewSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-bamboo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-bamboo-600">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-earth-900 mb-2">Review Submitted!</h3>
                                <p className="text-earth-600">Thank you for your feedback.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitReview}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-earth-900">Review {selectedProduct?.name}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setReviewModalOpen(false)}
                                        className="text-earth-400 hover:text-earth-600"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-earth-700 mb-2">Rating</label>
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
                                                    size={28}
                                                    className={star <= (hoveredRating || rating) ? 'fill-yellow-500 text-yellow-500' : 'text-earth-300'}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-earth-700 mb-2">Comment</label>
                                    <textarea
                                        rows={4}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none"
                                        placeholder="Share your experience..."
                                        required
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-bamboo-600 text-white py-3 rounded-md font-bold hover:bg-bamboo-700 transition-colors"
                                >
                                    Submit Review
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};
