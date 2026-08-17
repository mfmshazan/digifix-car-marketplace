import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * App-wide React Query cache for the mobile app. Created once per app session so it
 * survives re-renders. Defaults are tuned so navigating back to a screen shows cached
 * data instantly and revalidates quietly in the background:
 *   - staleTime 30s → returning to a screen within 30s won't refetch
 *   - gcTime 5min   → cached data is kept for 5 min after a screen unmounts
 *   - retry 1       → one retry on flaky mobile networks, then surface the error
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
