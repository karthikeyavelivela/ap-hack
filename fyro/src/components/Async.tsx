import { ReactNode } from 'react';
import { Skeleton, QueryError } from '@/components/ui';

interface QueryLike<T> { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }

/** Renders loading skeleton / error with retry / content for a query. */
export function Async<T>({ q, children, skeleton, compact }: { q: QueryLike<T>; children: (d: T) => ReactNode; skeleton?: ReactNode; compact?: boolean }) {
  if (q.isLoading) return <>{skeleton ?? <Skeleton className="h-32 w-full" />}</>;
  if (q.isError || !q.data) return <QueryError error={(q.error as Error) ?? new Error('No data')} onRetry={() => void q.refetch()} compact={compact} />;
  return <>{children(q.data)}</>;
}
