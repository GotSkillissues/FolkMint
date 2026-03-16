import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const getItemId = (item) => item?.cartItemId || item?.variant_id || item?.product_id || item?._id || item?.id;

const getItemPrice = (item) => Number(item?.price ?? item?.base_price ?? 0);

const getItemImage = (item) => {
  if (item?.image) return item.image;
  if (item?.image_url) return item.image_url;

  const firstVariant = item?.variants?.[0];
  const firstImage = firstVariant?.images?.find((img) => img?.is_primary) || firstVariant?.images?.[0];

  return firstImage?.image_url || '/placeholder-product.jpg';
};

const getItemStock = (item) => {
  if (typeof item?.stock === 'number') return item.stock;
  if (typeof item?.total_stock === 'number') return item.total_stock;

  const variants = item?.variants || [];
  if (!variants.length) return 0;

  return variants.reduce((sum, variant) => sum + (variant?.stock_quantity || 0), 0);
};

const normalizeCartItem = (item, quantity = 1) => ({
  ...item,
  cartItemId: getItemId(item),
  price: getItemPrice(item),
  image: getItemImage(item),
  stock: getItemStock(item),
  quantity,
});

const getInitialCartItems = () => {
  try {
    const savedCart = localStorage.getItem('cart');
    if (!savedCart) return [];
    const parsed = JSON.parse(savedCart);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(getInitialCartItems);

  const cartTotal = cartItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    const normalizedItem = normalizeCartItem(product, quantity);

    if (!normalizedItem.cartItemId) {
      return;
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(item => getItemId(item) === normalizedItem.cartItemId);
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map(item =>
          getItemId(item) === normalizedItem.cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        return [...prevItems, normalizedItem];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter(item => getItemId(item) !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems((prevItems) =>
      prevItems.map(item =>
        getItemId(item) === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  const getItemQuantity = (productId) => {
    const item = cartItems.find(item => getItemId(item) === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;
