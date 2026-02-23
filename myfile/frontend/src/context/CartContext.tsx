import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, ProductVariant, Product } from '../types/schema';

// Extended CartItem to include product details for display
export interface CartItemWithDetails extends CartItem {
    productName: string;
    price: number;
    image?: string;
    size?: string;
    color?: string;
    product_id: number;
}

interface CartContextType {
    items: CartItemWithDetails[];
    addToCart: (variant: ProductVariant, product: Product, quantity: number, image?: string) => void;
    removeFromCart: (variantId: number) => void;
    updateQuantity: (variantId: number, quantity: number) => void;
    cartTotal: number;
    itemCount: number;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItemWithDetails[]>([]);
    const [userId, setUserId] = useState<number | null>(null);

    // Track user from local storage
    useEffect(() => {
        const checkUser = () => {
            const authUser = JSON.parse(localStorage.getItem('folkmint_user') || 'null');
            if (authUser?.user_id && authUser.user_id !== userId) {
                setUserId(authUser.user_id);
                fetchCart(authUser.user_id);
            } else if (!authUser && userId !== null) {
                setUserId(null);
                setItems([]);
            }
        };

        const fetchCart = async (uid: number) => {
            try {
                const res = await fetch(`/api/cart/${uid}`);
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    setItems(data.items.map((item: any) => ({
                        cart_item_id: item.cart_item_id,
                        cart_id: item.cart_id,
                        variant_id: item.variant_id,
                        quantity: item.quantity,
                        productName: item.name,
                        price: item.price,
                        image: item.image || '',
                        size: item.size || '',
                        color: item.color || '',
                        product_id: item.product_id
                    })));
                }
            } catch (err) {
                console.error('Failed to fetch cart:', err);
            }
        };

        checkUser();
        // Add listener for login/logout events if needed, for now just poll or check standard
        const interval = setInterval(checkUser, 2000);
        return () => clearInterval(interval);
    }, [userId]);

    // Calculate totals
    const cartTotal = items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
    const itemCount = items.reduce((count, item) => count + (item.quantity || 1), 0);

    const addToCart = async (variant: ProductVariant, product: Product, quantity: number, image?: string) => {
        const newItem: CartItemWithDetails = {
            cart_item_id: Date.now(),
            cart_id: 1,
            variant_id: variant.variant_id,
            quantity: quantity,
            productName: product.name || 'Product',
            price: variant.price || product.base_price || 0,
            image: image,
            size: variant.size || '',
            color: variant.color || '',
            product_id: product.product_id
        };

        setItems(prev => {
            const existingItem = prev.find(item => item.variant_id === variant.variant_id);
            if (existingItem) {
                return prev.map(item =>
                    item.variant_id === variant.variant_id
                        ? { ...item, quantity: (item.quantity || 0) + quantity }
                        : item
                );
            }
            return [...prev, newItem];
        });

        // Backend Sync
        if (userId) {
            try {
                await fetch(`/api/cart/add?user_id=${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ variant_id: variant.variant_id, quantity })
                });
            } catch (err) {
                console.error('Failed to sync add to cart:', err);
            }
        }
    };

    const removeFromCart = async (variantId: number) => {
        const itemToRemove = items.find(i => i.variant_id === variantId);
        setItems(prev => prev.filter(item => item.variant_id !== variantId));

        // Backend Sync
        if (userId && itemToRemove?.cart_item_id) {
            try {
                await fetch(`/api/cart/item/${itemToRemove.cart_item_id}`, { method: 'DELETE' });
            } catch (err) {
                console.error('Failed to sync remove from cart:', err);
            }
        }
    };

    const updateQuantity = async (variantId: number, quantity: number) => {
        if (quantity < 1) return;
        setItems(prev => prev.map(item =>
            item.variant_id === variantId ? { ...item, quantity } : item
        ));

        // Backend Sync
        if (userId) {
            const itemToUpdate = items.find(i => i.variant_id === variantId);
            if (itemToUpdate?.cart_item_id) {
                try {
                    await fetch(`/api/cart/item/${itemToUpdate.cart_item_id}?quantity=${quantity}`, { method: 'PUT' });
                } catch (err) {
                    console.error('Failed to sync update quantity:', err);
                }
            }
        }
    };

    const clearCart = () => {
        setItems([]);
    };

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, cartTotal, itemCount, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
