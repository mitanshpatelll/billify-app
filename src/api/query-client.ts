import { QueryClient } from '@tanstack/react-query';

import { ApiError, onSessionEnded } from './client';

// Customer-side screens are online-only and cached by TanStack Query (Architecture: data flow).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Retry network trouble and 5xx (a waking server), never a clear "no" like 404 or 429.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
    },
  },
});

// A 401 ends the session: drop everything cached for it.
onSessionEnded(() => queryClient.clear());
