import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services';

const CartContext = createContext(null);

const getItemId    = (item) => item?.cartItemId || item?.variant_id || item?.product_id || item?._id || item?.id;
const getItemPrice = (item) => Number(item?.price ?? item?.base_price ?? 0);
const getItemImage = (item) => {
  if (item?.image)     return item.image;
  if (item?.image_url) return item.image_url;
  const firstVariant = item?.variants?.[0];
  const firstImage   = firstVariant?.images?.find(i => i?.is_primary) || firstVariant?.images?.[0];
  return firstImage?.image_url || '/placeholder-product.jpg';
};
const getItemStock = (item) => {
  if (typeof item?.stock        === 'number') return item.stock;
  if (typeof item?.total_stock  === 'number') return item.total_stock;
  return (item?.variants || []).reduce((s, v) => s + (v?.stock_quantity || 0), 0);
};

const normalizeCartItem = (item, quantity = 1) => ({
  ...item,
  cartItemId: getItemId(item),
  price:      getItemPrice(item),
  image:      getItemImage(item),
  stock:      getItemStock(item),
  quantity,
});

// Normalize a row coming back from GET /api/cart
const normalizeServerItem = (row) => ({
  cartItemId:  row.variant_id,
  variant_id:  row.variant_id,
  product_id:  row.product_id,
  name:        row.name,
  price:       Number(row.price ?? 0),
  image:       row.primary_image || row.image_url || '/placeholder-product.jpg',
  size:        row.size || null,
  stock:       Number(row.stock_quantity ?? 0),
  quantity:    row.quantity,
});

const getLocalItems = () => {
  try {
    const raw = localStorage.getItem('cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};

export const CartProvider = ({ children }) => {
  const [cartItems,    setCartItems]    = useState(getLocalItems);
  const [serverSynced, setServerSynced] = useState(false);
  const [syncing,      setSyncing]      = useState(false);

  // ── Persist guest cart to localStorage ──────────────────────────────
  useEffect(() => {
    if (!serverSynced) {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
  }, [cartItems, serverSynced]);

  // ── Load server cart ─────────────────────────────────────────────────
  const loadServerCart = useCallback(async () => {
    try {
      const res   = await cartService.getCart();
      const items = Array.isArray(res?.items) ? res.items.map(normalizeServerItem) : [];
      setCartItems(items);
      setServerSynced(true);
      localStorage.removeItem('cart');
    } catch {
      // stay in local mode — server unreachable or not authed
    }
  }, []);

  // ── Called by AuthContext after login — syncs guest cart then loads server ─
  const syncGuestCartAndLoad = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const localItems = getLocalItems();
      if (localItems.length > 0) {
        const syncPayload = localItems
          .filter(i => i.variant_id && i.quantity > 0)
          .map(i => ({ variant_id: i.variant_id, quantity: i.quantity }));
        if (syncPayload.length > 0) {
          await cartService.syncCart(syncPayload);
        }
      }
      await loadServerCart();
    } catch {
      await loadServerCart();
    } finally {
      setSyncing(false);
    }
  }, [syncing, loadServerCart]);

  // ── Called by AuthContext on logout ───────────────────────────────────
  const resetToLocal = useCallback(() => {
    setCartItems([]);
    setServerSynced(false);
    localStorage.removeItem('cart');
  }, []);

  // ── ADD ──────────────────────────────────────────────────────────────
  const addToCart = useCallback(async (product, quantity = 1) => {
    const normalized = normalizeCartItem(product, quantity);
    if (!normalized.cartItemId) return;

    if (serverSynced) {
      try {
        await cartService.addToCart(normalized.product_id, normalized.variant_id, quantity);
        await loadServerCart();
        return;
      } catch { /* fall through to optimistic local update */ }
    }

    setCartItems(prev => {
      const existing = prev.find(i => getItemId(i) === normalized.cartItemId);
      if (existing) {
        return prev.map(i =>
          getItemId(i) === normalized.cartItemId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, normalized];
    });
  }, [serverSynced, loadServerCart]);

  // ── REMOVE ───────────────────────────────────────────────────────────
  const removeFromCart = useCallback(async (itemId) => {
    if (serverSynced) {
      try {
        // itemId here is variant_id for server cart
        await cartService.removeFromCart(itemId);
        await loadServerCart();
        return;
      } catch { /* fall through */ }
    }
    setCartItems(prev => prev.filter(i => getItemId(i) !== itemId));
  }, [serverSynced, loadServerCart]);

  // ── UPDATE QUANTITY ──────────────────────────────────────────────────
  const updateQuantity = useCallback(async (itemId, quantity) => {
    if (quantity <= 0) { removeFromCart(itemId); return; }

    if (serverSynced) {
      try {
        await cartService.updateCartItem(itemId, quantity);
        await loadServerCart();
        return;
      } catch { /* fall through */ }
    }

    setCartItems(prev =>
      prev.map(i => getItemId(i) === itemId ? { ...i, quantity } : i)
    );
  }, [serverSynced, loadServerCart, removeFromCart]);

  // ── CLEAR ────────────────────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (serverSynced) {
      try { await cartService.clearCart(); } catch { /* ignore */ }
    }
    setCartItems([]);
    localStorage.removeItem('cart');
  }, [serverSynced]);

  const getItemQuantity = useCallback((itemId) => {
    const item = cartItems.find(i => getItemId(i) === itemId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const cartTotal = cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const cartCount = cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      cartCount,
      serverSynced,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getItemQuantity,
      loadServerCart,
      syncGuestCartAndLoad,
      resetToLocal,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;