import React from 'react';
import { Layout } from '../components/layout/Layout';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CartPage: React.FC = () => {
    const { items, removeFromCart, updateQuantity, cartTotal } = useCart();

    if (items.length === 0) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                    <div className="w-24 h-24 bg-earth-100 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">🛒</span>
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-earth-900 mb-4">Your Cart is Empty</h2>
                    <p className="text-earth-600 mb-8 max-w-md">
                        Looks like you haven't added any authentic Bangladeshi crafts to your cart yet.
                    </p>
                    <Link to="/shop" className="bg-earth-800 text-white px-8 py-3 rounded-md font-medium hover:bg-earth-900 transition-colors">
                        Start Shopping
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-serif font-bold text-earth-900 mb-8">Shopping Cart</h1>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Cart Items */}
                    <div className="flex-1 space-y-6">
                        {items.map((item) => (
                            <div key={item.cart_item_id} className="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-earth-100">
                                <div className="w-24 h-24 bg-earth-50 rounded-md overflow-hidden flex-shrink-0">
                                    <img
                                        src={item.image || '/images/1_lRUm2IW.webp'}
                                        alt={item.productName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-earth-900">{item.productName}</h3>
                                            <button
                                                onClick={() => removeFromCart(item.variant_id ?? 0)}
                                                className="text-red-400 hover:text-red-600 transition-colors p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <div className="text-sm text-earth-500 mt-1">
                                            {item.size && <span>Size: {item.size}</span>}
                                            {item.size && item.color && <span className="mx-2">|</span>}
                                            {item.color && <span>Color: {item.color}</span>}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        <div className="flex items-center border border-earth-200 rounded">
                                            <button
                                                onClick={() => updateQuantity(item.variant_id ?? 0, (item.quantity || 1) - 1)}
                                                className="px-3 py-1 bg-earth-50 text-earth-600 hover:bg-earth-100"
                                            >-</button>
                                            <span className="px-3 py-1 font-medium text-earth-900">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.variant_id ?? 0, (item.quantity || 1) + 1)}
                                                className="px-3 py-1 bg-earth-50 text-earth-600 hover:bg-earth-100"
                                            >+</button>
                                        </div>

                                        <div className="font-bold text-earth-800">
                                            ৳{((item.price) * (item.quantity || 1)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cart Summary */}
                    <div className="w-full lg:w-96">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-earth-200 sticky top-24">
                            <h3 className="text-xl font-serif font-bold text-earth-900 mb-6">Order Summary</h3>

                            <div className="space-y-3 text-earth-600 mb-6 border-b border-earth-100 pb-6">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>৳{cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span className="text-bamboo-600 font-medium">Free</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax (Estimated)</span>
                                    <span>৳{(cartTotal * 0.05).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-xl font-bold text-earth-900 mb-8">
                                <span>Total</span>
                                <span>৳{(cartTotal * 1.05).toFixed(2)}</span>
                            </div>

                            <Link
                                to="/checkout"
                                className="w-full flex justify-center items-center gap-2 bg-bamboo-600 text-white py-4 rounded-md font-bold hover:bg-bamboo-700 transition-colors shadow-sm"
                            >
                                Proceed to Checkout <ArrowRight size={20} />
                            </Link>

                            <div className="mt-6 text-center">
                                <p className="text-xs text-earth-400">Secure Checkout powered by SSL encryption</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
