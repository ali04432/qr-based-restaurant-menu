'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export interface TableContextState {
  restaurantId: string | null;
  restaurantSlug: string | null;
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
    restaurantSlug?: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
    qrToken?: string;
  }) => void;
  clearSession: () => void;
}

const TableContext = createContext<TableContextState | undefined>(undefined);

export function TableProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TableProviderInner>{children}</TableProviderInner>
    </Suspense>
  );
}

function TableProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
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
    restaurantSlug?: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
    qrToken?: string;
  }) => {
    const cleanTableNum = params.tableNumber
      ? (params.tableNumber.length === 1 ? `0${params.tableNumber}` : params.tableNumber)
      : (params.tableId.length <= 2 ? (params.tableId.length === 1 ? `0${params.tableId}` : params.tableId) : params.tableId);

    setRestaurantId(params.restaurantId);
    if (params.restaurantSlug) setRestaurantSlug(params.restaurantSlug);
    setTableId(params.tableId);
    setTableNumber(cleanTableNum);
    if (params.restaurantName) setRestaurantName(params.restaurantName);
    if (params.qrToken) setQrToken(params.qrToken);
    setIsTableVerified(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem('qr_restaurantId', params.restaurantId);
      if (params.restaurantSlug) localStorage.setItem('qr_restaurantSlug', params.restaurantSlug);
      localStorage.setItem('qr_tableId', params.tableId);
      localStorage.setItem('qr_tableNumber', cleanTableNum);
      if (params.restaurantName) localStorage.setItem('qr_restaurantName', params.restaurantName);
      if (params.qrToken) localStorage.setItem('qr_token', params.qrToken);
    }
  }, []);

  const clearSession = useCallback(() => {
    setRestaurantId(null);
    setRestaurantSlug(null);
    setTableId(null);
    setTableNumber(null);
    setRestaurantName(null);
    setQrToken(null);
    setIsTableVerified(false);
    setTableStatus(null);
    setWelcomeNotice(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('qr_restaurantId');
      localStorage.removeItem('qr_restaurantSlug');
      localStorage.removeItem('qr_tableId');
      localStorage.removeItem('qr_tableNumber');
      localStorage.removeItem('qr_restaurantName');
      localStorage.removeItem('qr_token');
    }
  }, []);

  // Synchronize session from URL parameters or persistent browser storage
  useEffect(() => {
    const urlRestaurant = searchParams.get('restaurant') || searchParams.get('restaurantId');
    const urlTable = searchParams.get('table');
    const urlTableId = searchParams.get('tableId');
    const urlToken = searchParams.get('token') || searchParams.get('qrToken');

    const effectiveRestaurant = urlRestaurant;
    const effectiveTable = urlTable || urlTableId;

    if (effectiveRestaurant && effectiveTable) {
      // Immediate optimistic assignment
      const rawNum = urlTable || urlTableId || '';
      const initialTableNum = rawNum.length === 1 ? `0${rawNum}` : rawNum;
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
            const resId = result.restaurant?.id || effectiveRestaurant;
            const resSlug = result.restaurant?.slug || null;
            const resName = result.restaurant?.name || null;

            setRestaurantId(resId);
            setRestaurantSlug(resSlug);
            setTableId(authoritativeTableId);
            setTableNumber(authoritativeTableNum);
            setRestaurantName(resName);
            setTableStatus(result.table.status);
            setIsTableVerified(true);
            setWelcomeNotice(`Welcome to Table ${authoritativeTableNum}! Ordering is active.`);

            if (typeof window !== 'undefined') {
              localStorage.setItem('qr_restaurantId', resId);
              if (resSlug) localStorage.setItem('qr_restaurantSlug', resSlug);
              localStorage.setItem('qr_tableId', authoritativeTableId);
              localStorage.setItem('qr_tableNumber', authoritativeTableNum);
              if (resName) localStorage.setItem('qr_restaurantName', resName);
            }
          } else {
            setIsTableVerified(false);
          }
        } catch (err) {
          console.warn('[TableContext] Could not validate table against API:', err);
          setIsTableVerified(false);
        } finally {
          setIsLoading(false);
        }
      };

      validateTable();
    } else if (typeof window !== 'undefined') {
      const storedRestaurant = localStorage.getItem('qr_restaurantId');
      const storedSlug = localStorage.getItem('qr_restaurantSlug');
      const storedTableId = localStorage.getItem('qr_tableId');
      const storedTable = localStorage.getItem('qr_tableNumber');
      const storedName = localStorage.getItem('qr_restaurantName');
      const storedToken = localStorage.getItem('qr_token');

      if (storedRestaurant && (storedTableId || storedTable)) {
        const cleanTable = storedTable ? (storedTable.length === 1 ? `0${storedTable}` : storedTable) : (storedTableId || null);
        setRestaurantId(storedRestaurant);
        setRestaurantSlug(storedSlug || null);
        setTableId(storedTableId || storedTable);
        setTableNumber(cleanTable);
        setRestaurantName(storedName || null);
        setQrToken(storedToken);
        setIsTableVerified(true);
        setIsLoading(false);
      } else {
        // Enforce strict multi-tenant QR integrity:
        // A customer must NEVER be assigned to a restaurant or table in production without scanning a valid QR code.
        // Default test data is only permitted through an explicitly enabled development-only configuration, never in production.
        const isDev = process.env.NODE_ENV === 'development';
        const enableDevFallback = process.env.NEXT_PUBLIC_ENABLE_DEV_TABLE_FALLBACK === 'true';

        if (isDev && enableDevFallback) {
          const resolveDevDefaultRestaurant = async () => {
            try {
              const res: any = await apiClient.get('/api/menu');
              if (res && res.restaurant) {
                setRestaurantId(res.restaurant.id);
                setRestaurantSlug(res.restaurant.slug || null);
                setRestaurantName(res.restaurant.name || null);
                if (res.table) {
                  setTableId(res.table.id);
                  setTableNumber(res.table.tableNumber);
                  setIsTableVerified(true);
                }
              }
            } catch (e) {
              // Ignore dev fallback errors
            } finally {
              setIsLoading(false);
            }
          };
          resolveDevDefaultRestaurant();
        } else {
          // Production / Standard mode: Keep session unassigned until a valid QR code is scanned
          setRestaurantId(null);
          setRestaurantSlug(null);
          setTableId(null);
          setTableNumber(null);
          setRestaurantName(null);
          setQrToken(null);
          setIsTableVerified(false);
          setTableStatus(null);
          setIsLoading(false);
        }
      }
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  return (
    <TableContext.Provider
      value={{
        restaurantId,
        restaurantSlug,
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
