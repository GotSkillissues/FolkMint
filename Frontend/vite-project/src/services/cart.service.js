import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Cart Service
 * Handles server-synced cart operations
 * Maps to: cart, cart_item tables
 * 
 * Note: This service handles both authenticated (server) and 
 * guest (localStorage) cart management
 */
const cartService = {
  // ==================== SERVER CART (Authenticated Users) ====================

  // Get cart from server
  getCart: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CART.GET);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add item to cart
  addToCart: async (variantId, quantity = 1) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CART.ADD_ITEM, {
        variant_id: variantId,
        quantity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update cart item quantity
  updateCartItem: async (cartItemId, quantity) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.CART.UPDATE_ITEM(cartItemId), {
        quantity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Remove item from cart
  removeFromCart: async (cartItemId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CART.REMOVE_ITEM(cartItemId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CART.CLEAR);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Sync local cart to server (after login)
  syncCart: async (localCartItems) => {
    try {
      // localCartItems: [{ variant_id, quantity }, ...]
      const response = await apiClient.post(API_ENDPOINTS.CART.SYNC, {
        items: localCartItems,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== LOCAL CART (Guest Users) ====================

  // Get cart from localStorage
  getLocalCart: () => {
    const cart = localStorage.getItem(STORAGE_KEYS.CART);
    return cart ? JSON.parse(cart) : { items: [], total: 0 };
  },

  // Save cart to localStorage
  saveLocalCart: (cart) => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  },

  // Add item to local cart
  addToLocalCart: (item) => {
    const cart = cartService.getLocalCart();
    const existingIndex = cart.items.findIndex(i => i.variant_id === item.variant_id);
    
    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }
    
    cart.total = cartService.calculateTotal(cart.items);
    cartService.saveLocalCart(cart);
    return cart;
  },

  // Update local cart item
  updateLocalCartItem: (variantId, quantity) => {
    const cart = cartService.getLocalCart();
    const index = cart.items.findIndex(i => i.variant_id === variantId);
    
    if (index >= 0) {
      if (quantity <= 0) {
        cart.items.splice(index, 1);
      } else {
        cart.items[index].quantity = quantity;
      }
    }
    
    cart.total = cartService.calculateTotal(cart.items);
    cartService.saveLocalCart(cart);
    return cart;
  },

  // Remove from local cart
  removeFromLocalCart: (variantId) => {
    const cart = cartService.getLocalCart();
    cart.items = cart.items.filter(i => i.variant_id !== variantId);
    cart.total = cartService.calculateTotal(cart.items);
    cartService.saveLocalCart(cart);
    return cart;
  },

  // Clear local cart
  clearLocalCart: () => {
    localStorage.removeItem(STORAGE_KEYS.CART);
    return { items: [], total: 0 };
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Calculate cart total
  calculateTotal: (items) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
  },

  // Calculate cart count
  calculateCount: (items) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Get item quantity by variant ID
  getItemQuantity: (items, variantId) => {
    const item = items.find(i => i.variant_id === variantId);
    return item ? item.quantity : 0;
  },

  // Check if variant is in cart
  isInCart: (items, variantId) => {
    return items.some(i => i.variant_id === variantId);
  },

  // Merge local cart with server cart (after login)
  mergeCart: async (localCart, serverCart) => {
    const mergedItems = [...serverCart.items];
    
    for (const localItem of localCart.items) {
      const existingIndex = mergedItems.findIndex(
        i => i.variant_id === localItem.variant_id
      );
      
      if (existingIndex >= 0) {
        // Add quantities if item exists
        mergedItems[existingIndex].quantity += localItem.quantity;
      } else {
        // Add new item
        mergedItems.push(localItem);
      }
    }
    
    return mergedItems;
  },
};

export default cartService;
