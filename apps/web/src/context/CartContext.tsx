'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '@qr-menu/shared';

interface CartContextState {
  items: CartItem[];
  isDrawerOpen: boolean;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  addItem: (item: MenuItem, quantity: number, specialInstructions?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('qr_cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse cart');
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('qr_cart', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (menuItem: MenuItem, quantity: number, specialInstructions?: string) => {
    setItems((prev) => {
      // Check if item already exists with SAME special instructions
      const existing = prev.find(
        (i) => i.menuItem.id === menuItem.id && i.specialInstructions === specialInstructions
      );

      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }

      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          menuItem,
          quantity,
          specialInstructions,
        },
      ];
    });
    setIsDrawerOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
  const tax = subtotal * 0.08; // Example 8% tax
  const serviceCharge = items.length > 0 ? 5.00 : 0; // Example flat service charge
  const total = subtotal + tax + serviceCharge;

  return (
    <CartContext.Provider
      value={{
        items,
        isDrawerOpen,
        subtotal,
        tax,
        serviceCharge,
        total,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}
