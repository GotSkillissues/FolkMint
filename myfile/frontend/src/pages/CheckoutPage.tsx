import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
    const { cartTotal, clearCart } = useCart();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
        clearCart();
    };

    if (isSubmitted) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                    <div className="w-24 h-24 bg-bamboo-100 rounded-full flex items-center justify-center mb-6 text-bamboo-600">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-earth-900 mb-4">Order Placed Successfully!</h2>
                    <p className="text-earth-600 mb-8 max-w-md">
                        Thank you for supporting our artisans. Your order #FM-{Math.floor(Math.random() * 10000)} has been received.
                    </p>
                    <Link to="/" className="bg-earth-800 text-white px-8 py-3 rounded-md font-medium hover:bg-earth-900 transition-colors">
                        Return Home
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-serif font-bold text-earth-900 mb-8 text-center">Checkout</h1>

                <div className="bg-white p-8 rounded-lg shadow-sm border border-earth-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-earth-800 mb-4 border-b border-earth-100 pb-2">Shipping Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" required placeholder="First Name" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                <input type="text" required placeholder="Last Name" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                <input type="email" required placeholder="Email Address" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none md:col-span-2" />
                                <input type="text" required placeholder="Street Address" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none md:col-span-2" />
                                <input type="text" required placeholder="City" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                <input type="text" required placeholder="Zip Code" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-earth-800 mb-4 border-b border-earth-100 pb-2">Payment Details</h3>
                            <div className="bg-earth-50 p-4 rounded text-center text-earth-600 text-sm mb-4">
                                This is a demo checkout. No actual payment will be processed.
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <input type="text" placeholder="Card Number" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="MM/YY" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                    <input type="text" placeholder="CVC" className="p-3 border border-earth-300 rounded focus:ring-1 focus:ring-bamboo-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-earth-200">
                            <div className="text-xl font-bold text-earth-900">Total: ৳{(cartTotal * 1.05).toFixed(2)}</div>
                            <button type="submit" className="bg-bamboo-600 text-white px-8 py-3 rounded font-bold hover:bg-bamboo-700 transition-colors">
                                Place Order
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};
