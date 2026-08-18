'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * App-wide React Query cache. Created once per browser session via useState so the
 * client survives re-renders. Defaults are tuned so switching dashboard tabs shows
 * cached data instantly and only revalidates in the background:
 *   - staleTime 30s  → a just-visited tab won't refetch when you flip back within 30s
 *   - gcTime 5min    → cached data is kept for 5 min after a tab unmounts
 *   - no refetch-on-focus → avoids a refetch every time the window regains focus
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
