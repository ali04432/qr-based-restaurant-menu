'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

export interface TableContextState {
  restaurantId: string | null;
  tableId: string | null;
  tableNumber: string | null;
  restaurantName: string | null;
  isLoading: boolean;
  setSession: (params: {
    restaurantId: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
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
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((params: {
    restaurantId: string;
    tableId: string;
    tableNumber?: string;
    restaurantName?: string;
  }) => {
    setRestaurantId(params.restaurantId);
    setTableId(params.tableId);
    setTableNumber(params.tableNumber || params.tableId);
    if (params.restaurantName) setRestaurantName(params.restaurantName);

    if (typeof window !== 'undefined') {
      localStorage.setItem('qr_restaurantId', params.restaurantId);
      localStorage.setItem('qr_tableId', params.tableId);
      if (params.tableNumber) localStorage.setItem('qr_tableNumber', params.tableNumber);
      if (params.restaurantName) localStorage.setItem('qr_restaurantName', params.restaurantName);
    }
  }, []);

  const clearSession = useCallback(() => {
    setRestaurantId(null);
    setTableId(null);
    setTableNumber(null);
    setRestaurantName(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('qr_restaurantId');
      localStorage.removeItem('qr_tableId');
      localStorage.removeItem('qr_tableNumber');
      localStorage.removeItem('qr_restaurantName');
    }
  }, []);

  useEffect(() => {
    const urlRestaurant = searchParams.get('restaurant');
    const urlTable = searchParams.get('table');

    if (urlRestaurant && urlTable) {
      setRestaurantId(urlRestaurant);
      setTableId(urlTable);
      setTableNumber(urlTable);
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        localStorage.setItem('qr_restaurantId', urlRestaurant);
        localStorage.setItem('qr_tableId', urlTable);
        localStorage.setItem('qr_tableNumber', urlTable);
      }
    } else if (typeof window !== 'undefined') {
      const storedRestaurant = localStorage.getItem('qr_restaurantId');
      const storedTableId = localStorage.getItem('qr_tableId');
      const storedTable = localStorage.getItem('qr_tableNumber');
      const storedName = localStorage.getItem('qr_restaurantName');

      setRestaurantId(storedRestaurant || 'a0000000-0000-0000-0000-000000000001');
      setTableId(storedTableId || 'b0000001-0000-0000-0000-000000000001');
      setTableNumber(storedTable || '07');
      setRestaurantName(storedName || 'Silver Sapoon');
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
        isLoading,
        setSession,
        clearSession,
      }}
    >
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

