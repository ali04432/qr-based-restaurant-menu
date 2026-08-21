'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

interface TableContextState {
  restaurantId: string | null;
  tableNumber: string | null;
  isLoading: boolean;
}

const TableContext = createContext<TableContextState | undefined>(undefined);

export function TableProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<TableContextState>({
    restaurantId: null,
    tableNumber: null,
    isLoading: true,
  });

  useEffect(() => {
    const urlRestaurant = searchParams.get('restaurant');
    const urlTable = searchParams.get('table');

    if (urlRestaurant && urlTable) {
      // Prioritize URL and save to local storage
      setState({ restaurantId: urlRestaurant, tableNumber: urlTable, isLoading: false });
      localStorage.setItem('qr_restaurantId', urlRestaurant);
      localStorage.setItem('qr_tableNumber', urlTable);
    } else {
      // Fallback to local storage if available
      const storedRestaurant = localStorage.getItem('qr_restaurantId');
      const storedTable = localStorage.getItem('qr_tableNumber');
      
      setState({
        restaurantId: storedRestaurant,
        tableNumber: storedTable,
        isLoading: false,
      });
    }
  }, [searchParams]);

  return (
    <TableContext.Provider value={state}>
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
