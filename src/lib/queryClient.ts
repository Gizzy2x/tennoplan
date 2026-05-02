import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient — shared between App.tsx (provider) and
 * WorldstateSync (imperative invalidation after a background sync).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
