'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, SafeUser, LoginInput } from '@qr-menu/shared';
import { apiClient } from '../lib/api-client';

interface AuthContextState {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  quickChefLogin: (restaurantId: string) => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('qr_staff_token');

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Dev bypass: restore the mock chef session without hitting the API
    if (storedToken === 'mock-chef-token') {
      const storedRestaurantId = localStorage.getItem('qr_mock_restaurant_id') || 'restaurant-123';
      const mockChef: SafeUser = {
        id: 'chef-dev-001',
        restaurantId: storedRestaurantId,
        name: 'Head Chef',
        email: 'chef@restaurant.com',
        role: UserRole.CHEF,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setToken(storedToken);
      setUser(mockChef);
      setIsLoading(false);
      return;
    }

    // Real token — verify with the API
    setToken(storedToken);
    apiClient.get<SafeUser>('/api/auth/me', { token: storedToken })
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('qr_staff_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (credentials: LoginInput) => {
    const data = await apiClient.post<{ user: SafeUser; accessToken: string }>('/api/auth/login', credentials);
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('qr_staff_token', data.accessToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('qr_staff_token');
  };

  // Quick session simulator for KDS dev/testing without a real login
  const quickChefLogin = (restaurantId: string) => {
    const mockChef: SafeUser = {
      id: 'chef-dev-001',
      restaurantId,
      name: 'Head Chef',
      email: 'chef@restaurant.com',
      role: UserRole.CHEF,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setUser(mockChef);
    setToken('mock-chef-token');
    localStorage.setItem('qr_staff_token', 'mock-chef-token');
    // Persist the restaurantId so the mock session can be restored on refresh
    localStorage.setItem('qr_mock_restaurant_id', restaurantId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        quickChefLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
