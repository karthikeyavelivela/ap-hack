import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, Spinner } from '@/components/ui';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => n < 2 && ![401, 403, 404].includes((e as { status?: number }).status ?? 0) && (e as { code?: string }).code !== 'SIMULATED',
      retryDelay: (n) => 400 * 2 ** n,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}
