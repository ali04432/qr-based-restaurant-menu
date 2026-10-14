'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export interface TableContextState {
  restaurantId: string | null;
  tableId: string | null;
  tableNumber: string | null;
  restaurantName: string | null;
  qrToken: string | null;
  isTableVerified: boolean;
  tableStatus: string | null;
  isLoading: boolean;
  welcomeNotice: string | null;
  dismissNotice: () => void;
  setSession: (params: {
    restaurantId: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
    qrToken?: string;
  }) => void;
  clearSession: () => void;
}

const TableContext = createContext<TableContextState | undefined>(undefined);

export function TableProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isTableVerified, setIsTableVerified] = useState<boolean>(false);
  const [tableStatus, setTableStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeNotice, setWelcomeNotice] = useState<string | null>(null);

  const dismissNotice = useCallback(() => {
    setWelcomeNotice(null);
  }, []);

  const setSession = useCallback((params: {
    restaurantId: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
    qrToken?: string;
  }) => {
    setRestaurantId(params.restaurantId);
    setTableId(params.tableId);
    setTableNumber(params.tableNumber || params.tableId);
    if (params.restaurantName) setRestaurantName(params.restaurantName);
    if (params.qrToken) setQrToken(params.qrToken);
    setIsTableVerified(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem('qr_restaurantId', params.restaurantId);
      localStorage.setItem('qr_tableId', params.tableId);
      if (params.tableNumber) localStorage.setItem('qr_tableNumber', params.tableNumber);
      if (params.restaurantName) localStorage.setItem('qr_restaurantName', params.restaurantName);
      if (params.qrToken) localStorage.setItem('qr_token', params.qrToken);
    }
  }, []);

  const clearSession = useCallback(() => {
    setRestaurantId(null);
    setTableId(null);
    setTableNumber(null);
    setRestaurantName(null);
    setQrToken(null);
    setIsTableVerified(false);
    setTableStatus(null);
    setWelcomeNotice(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('qr_restaurantId');
      localStorage.removeItem('qr_tableId');
      localStorage.removeItem('qr_tableNumber');
      localStorage.removeItem('qr_restaurantName');
      localStorage.removeItem('qr_token');
    }
  }, []);

  // Validate table with backend when URL parameters are present
  useEffect(() => {
    const urlRestaurant = searchParams.get('restaurant') || searchParams.get('restaurantId');
    const urlTable = searchParams.get('table');
    const urlTableId = searchParams.get('tableId');
    const urlToken = searchParams.get('token') || searchParams.get('qrToken');

    const effectiveRestaurant = urlRestaurant;
    const effectiveTable = urlTable || urlTableId;

    if (effectiveRestaurant && effectiveTable) {
      // Immediate initial optimistic assignment
      const initialTableNum = urlTable || urlTableId || '';
      const initialTableId = urlTableId || urlTable || '';

      setRestaurantId(effectiveRestaurant);
      setTableId(initialTableId);
      setTableNumber(initialTableNum);
      if (urlToken) setQrToken(urlToken);

      if (typeof window !== 'undefined') {
        localStorage.setItem('qr_restaurantId', effectiveRestaurant);
        localStorage.setItem('qr_tableId', initialTableId);
        localStorage.setItem('qr_tableNumber', initialTableNum);
        if (urlToken) localStorage.setItem('qr_token', urlToken);
      }

      // Authoritative validation with backend API
      const validateTable = async () => {
        try {
          const query = new URLSearchParams({
            restaurantId: effectiveRestaurant,
            table: effectiveTable,
          });
          if (urlToken) query.append('token', urlToken);

          const result: any = await apiClient.get(`/api/tables/validate?${query.toString()}`);

          if (result && result.table) {
            const authoritativeTableId = result.table.id;
            const authoritativeTableNum = result.table.tableNumber;
            const resName = result.restaurant?.name || 'Restaurant';

            setTableId(authoritativeTableId);
            setTableNumber(authoritativeTableNum);
            setRestaurantName(resName);
            setTableStatus(result.table.status);
            setIsTableVerified(true);
            setWelcomeNotice(`Welcome to Table ${authoritativeTableNum}! Ordering is now active.`);

            if (typeof window !== 'undefined') {
              localStorage.setItem('qr_restaurantId', effectiveRestaurant);
              localStorage.setItem('qr_tableId', authoritativeTableId);
              localStorage.setItem('qr_tableNumber', authoritativeTableNum);
              localStorage.setItem('qr_restaurantName', resName);
            }
          }
        } catch (err) {
          console.warn('[TableContext] Could not validate table against API, using QR param fallback:', err);
          // Fallback to initial values without throwing
          setIsTableVerified(true);
          setWelcomeNotice(`Seated at Table ${initialTableNum}.`);
        } finally {
          setIsLoading(false);
        }
      };

      validateTable();
    } else if (typeof window !== 'undefined') {
      const storedRestaurant = localStorage.getItem('qr_restaurantId');
      const storedTableId = localStorage.getItem('qr_tableId');
      const storedTable = localStorage.getItem('qr_tableNumber');
      const storedName = localStorage.getItem('qr_restaurantName');
      const storedToken = localStorage.getItem('qr_token');

      if (storedRestaurant && (storedTableId || storedTable)) {
        setRestaurantId(storedRestaurant);
        setTableId(storedTableId || storedTable);
        setTableNumber(storedTable || storedTableId);
        setRestaurantName(storedName);
        setQrToken(storedToken);
        setIsTableVerified(true);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  return (
    <TableContext.Provider
      value={{
        restaurantId,
        tableId,
        tableNumber,
        restaurantName,
        qrToken,
        isTableVerified,
        tableStatus,
        isLoading,
        welcomeNotice,
        dismissNotice,
        setSession,
        clearSession,
      }}
    >
      {welcomeNotice && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2 mx-auto">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>{welcomeNotice}</span>
          </div>
          <button
            type="button"
            onClick={dismissNotice}
            className="text-black/70 hover:text-black font-black text-sm px-2 py-0.5 rounded"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </TableContext.Provider>
  );
}

export function useTableContext() {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTableContext must be used within a TableProvider');
  }
  return context;
}
