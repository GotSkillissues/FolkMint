import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistService } from '../services';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistProductIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await wishlistService.getWishlist({ limit: 200 });
      const items = Array.isArray(res?.wishlist) ? res.wishlist : [];
      setWishlistProductIds(new Set(items.map(i => i.product_id)));
    } catch (err) {
      console.error('Failed to refresh wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) return false;
    
    const isIn = wishlistProductIds.has(productId);
    try {
      if (isIn) {
        // Find variantId for this product in current list (already fetched)
        // Or just let backend match variant for product.
        // Actually, easiest is to use a specific endpoint or just product-based remove.
        // For now, we'll re-fetch or use a known list.
        const listRes = await wishlistService.getWishlist({ limit: 200 });
        const item = listRes.wishlist.find(i => i.product_id === productId);
        if (item) {
           await wishlistService.removeFromWishlist(item.wishlist_id);
        }
      } else {
        await wishlistService.addToWishlist({ product_id: productId });
      }
      refreshWishlist();
      return true;
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      return false;
    }
  };

  const isInWishlist = (productId) => wishlistProductIds.has(productId);

  return (
    <WishlistContext.Provider value={{ wishlistProductIds, toggleWishlist, isInWishlist, refreshWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
