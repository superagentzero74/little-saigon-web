'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartMerchandise {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  product: { title: string; handle: string };
}

interface CartLine {
  id: string;
  quantity: number;
  merchandise: CartMerchandise;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  lines: CartLine[];
}

interface ShoppingContextType {
  cart: Cart | null;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  isLoading: boolean;
  itemCount: number;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lso-cart');
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored cart:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (cart) {
      localStorage.setItem('lso-cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('lso-cart');
    }
  }, [cart]);

  const clearCart = () => {
    setCart(null);
    localStorage.removeItem('lso-cart');
  };

  const itemCount = cart?.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;

  return (
    <ShoppingContext.Provider value={{ cart, setCart, clearCart, isLoading, itemCount }}>
      {children}
    </ShoppingContext.Provider>
  );
}

export function useShoppingCart() {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShoppingCart must be used within ShoppingProvider');
  }
  return context;
}
