"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { MenuItem as SharedMenuItem } from "@qr-menu/shared";

export interface MenuItem {
  id: string;
  restaurantId?: string;
  categoryId?: string;
  name: string;
  category?: string;
  price: number;
  description: string;
  image?: string;
  imageUrl?: string;
  rating?: number;
  badge?: string;
  isSpicy?: boolean;
  isChefSpecial?: boolean;
  isAvailable?: boolean;
  prepTime?: string;
  prepTimeMin?: number;
  prepTimeMax?: number;
}

export interface CartItem {
  id?: string;
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface CartContextType {
  cart: CartItem[];
  tableNumber: string | null;
  addToCart: (item: MenuItem, quantity?: number, specialInstructions?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  updateSpecialInstructions: (itemId: string, instructions: string) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  grandTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  favorites: string[];
  toggleFavorite: (itemId: string) => void;

  // Aliases for backward compatibility
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number, specialInstructions?: string) => void;
  removeItem: (itemId: string) => void;
  isDrawerOpen: boolean;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "silver_sapoon_cart";
const FAVORITES_STORAGE_KEY = "silver_sapoon_favorites";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tableNumber, setTableNumber] = useState<string | null>("07");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }

        const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }

        const storedTable = localStorage.getItem("qr_tableNumber");
        if (storedTable) {
          setTableNumber(storedTable);
        }
      } catch (err) {
        console.error("Failed to load cart from storage:", err);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (err) {
        console.error("Failed to save cart to storage:", err);
      }
    }
  }, [cart, isLoaded]);

  // Save favorites to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (err) {
        console.error("Failed to save favorites to storage:", err);
      }
    }
  }, [favorites, isLoaded]);

  const addToCart = useCallback((item: MenuItem, quantity = 1, specialInstructions = "") => {
    // Normalize image property
    const normalizedItem: MenuItem = {
      ...item,
      image: item.image || item.imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=85",
      category: item.category || "Main",
      rating: item.rating ?? 4.8,
      price: Number(item.price) || 0,
    };

    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id
            ? {
                ...i,
                quantity: i.quantity + quantity,
                specialInstructions: specialInstructions || i.specialInstructions,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          id: `cart-${item.id}-${Date.now()}`,
          menuItem: normalizedItem,
          quantity,
          specialInstructions,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const updateSpecialInstructions = useCallback((itemId: string, instructions: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.menuItem.id === itemId ? { ...i, specialInstructions: instructions } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + (Number(item.menuItem.price) || 0) * item.quantity, 0);
  const tax = Math.round(subtotal * 0.16);
  const serviceCharge = subtotal > 0 ? 150 : 0;
  const grandTotal = subtotal + tax + serviceCharge;

  return (
    <CartContext.Provider
      value={{
        cart,
        tableNumber,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateSpecialInstructions,
        clearCart,
        subtotal,
        tax,
        serviceCharge,
        grandTotal,
        isCartOpen,
        setIsCartOpen,
        openDrawer: () => setIsCartOpen(true),
        closeDrawer: () => setIsCartOpen(false),
        favorites,
        toggleFavorite,
        items: cart,
        addItem: addToCart,
        removeItem: removeFromCart,
        isDrawerOpen: isCartOpen,
        total: grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export const useCartContext = useCart;