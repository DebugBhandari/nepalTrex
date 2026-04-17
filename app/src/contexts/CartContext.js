import { createContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({}); // { staySlug: { stayId, stayName, items: [] } }
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nepaltrex_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem('nepaltrex_cart', JSON.stringify(cart));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
  }, [cart, isHydrated]);

  const getCartTotals = useCallback(() => {
    let totalItems = 0;
    let totalPrice = 0;
    Object.values(cart).forEach((stay) => {
      (stay.items || []).forEach((item) => {
        totalItems += item.quantity || 1;
        totalPrice += (item.unitPrice || 0) * (item.quantity || 1);
      });
    });
    return { totalItems, totalPrice };
  }, [cart]);

  const addToCart = useCallback((stay, menuItem) => {
    setCart((prev) => {
      const staySlug = stay.slug;
      const existing = prev[staySlug] || {
        stayId: stay.id,
        stayName: stay.name,
        staySlug: stay.slug,
        items: [],
      };

      const itemIndex = existing.items.findIndex(
        (i) => i.menuItemId === menuItem.id && i.menuItemName === menuItem.name
      );

      let updatedItems;
      if (itemIndex !== -1) {
        updatedItems = [...existing.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity: (updatedItems[itemIndex].quantity || 1) + 1,
        };
      } else {
        updatedItems = [
          ...existing.items,
          {
            menuItemId: menuItem.id || null,
            menuItemName: menuItem.name,
            menuItemCategory: menuItem.category,
            unitPrice: Number(menuItem.price),
            quantity: 1,
          },
        ];
      }

      return {
        ...prev,
        [staySlug]: {
          ...existing,
          items: updatedItems,
        },
      };
    });
  }, []);

  const updateItemQuantity = useCallback((staySlug, itemIndex, quantity) => {
    setCart((prev) => {
      const existing = prev[staySlug];
      if (!existing) return prev;

      const updatedItems = [...existing.items];
      if (quantity <= 0) {
        updatedItems.splice(itemIndex, 1);
      } else {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity: Math.max(1, Number(quantity)),
        };
      }

      if (updatedItems.length === 0) {
        // Remove stay from cart if no items
        const next = { ...prev };
        delete next[staySlug];
        return next;
      }

      return {
        ...prev,
        [staySlug]: {
          ...existing,
          items: updatedItems,
        },
      };
    });
  }, []);

  const removeFromCart = useCallback((staySlug, itemIndex) => {
    setCart((prev) => {
      const existing = prev[staySlug];
      if (!existing) return prev;

      const updatedItems = existing.items.filter((_, i) => i !== itemIndex);

      if (updatedItems.length === 0) {
        const next = { ...prev };
        delete next[staySlug];
        return next;
      }

      return {
        ...prev,
        [staySlug]: {
          ...existing,
          items: updatedItems,
        },
      };
    });
  }, []);

  const removeStayFromCart = useCallback((staySlug) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[staySlug];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  const value = {
    cart,
    isHydrated,
    getCartTotals,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    removeStayFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartContext;
