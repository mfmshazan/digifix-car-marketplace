import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSalesmanOrders } from '../api/orders';

interface PendingOrdersContextType {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
  isLoading: boolean;
}

const PendingOrdersContext = createContext<PendingOrdersContextType | undefined>(undefined);

export function PendingOrdersProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getSalesmanOrders('PENDING');
      if (response.success && response.data) {
        setPendingCount(response.data.pagination?.total || response.data.orders?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch pending orders count:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <PendingOrdersContext.Provider
      value={{
        pendingCount,
        refreshPendingCount,
        isLoading,
      }}
    >
      {children}
    </PendingOrdersContext.Provider>
  );
}

export function usePendingOrders() {
  const context = useContext(PendingOrdersContext);
  if (!context) {
    throw new Error('usePendingOrders must be used within a PendingOrdersProvider');
  }
  return context;
}
