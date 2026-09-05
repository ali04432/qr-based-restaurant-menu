'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Branch } from '@qr-menu/shared';
import { adminService } from '../services/admin.service';
import { useAuthContext } from './AuthContext';

interface BranchContextType {
  branches: Branch[];
  currentBranchId: string | null;
  currentBranch: Branch | null;
  setCurrentBranchId: (id: string | null) => void;
  isLoadingBranches: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchIdState] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);

  // Initialize from user.branchId or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qr_admin_active_branch');
      if (stored) {
        setCurrentBranchIdState(stored === 'ALL' ? null : stored);
      } else if (user?.branchId) {
        setCurrentBranchIdState(user.branchId);
      }
    }
  }, [user?.branchId]);

  const setCurrentBranchId = useCallback((id: string | null) => {
    setCurrentBranchIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('qr_admin_active_branch', id);
      } else {
        localStorage.setItem('qr_admin_active_branch', 'ALL');
      }
    }
  }, []);

  const refreshBranches = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingBranches(true);
      const list = await adminService.getBranches(restaurantId, token);
      setBranches(Array.isArray(list) ? list : []);
    } catch {
      // Soft-fail: if backend has no branches yet, default to empty list
      setBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    if (token) {
      refreshBranches();
    }
  }, [token, refreshBranches]);

  const currentBranch = branches.find((b) => b.id === currentBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranchId,
        currentBranch,
        setCurrentBranchId,
        isLoadingBranches,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext(): BranchContextType {
  const context = useContext(BranchContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    return {
      branches: [],
      currentBranchId: null,
      currentBranch: null,
      setCurrentBranchId: () => {},
      isLoadingBranches: false,
      refreshBranches: async () => {},
    };
  }
  return context;
}
