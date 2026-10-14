import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib';
import { Skeleton, EmptyState } from './primitives';
import { Button } from './Button';
import { TARA_STATE } from '@/assets';

export interface Column<T> { key: string; header: ReactNode; cell: (row: T, i: number) => ReactNode; className?: string; align?: 'left' | 'right' | 'center'; hideOnMobile?: boolean }

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, onRowClick, empty, skeletonRows = 8, dense, className, activeKey }: {
  columns: Column<T>[]; rows: T[] | undefined; rowKey: (r: T) => string; loading?: boolean; error?: Error | null; onRetry?: () => void; onRowClick?: (r: T) => void;
  empty?: { title: string; body?: string }; skeletonRows?: number; dense?: boolean; className?: string; activeKey?: string | null;
}) {
  const { t } = useTranslation();
  if (error) return <QueryError error={error} onRetry={onRetry} />;
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('sticky top-0 border-b border-line bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink/55', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: skeletonRows }).map((_, i) => (
            <tr key={i}>{columns.map((c) => <td key={c.key} className={cn('border-b border-line/60 px-4 py-3', c.hideOnMobile && 'hidden md:table-cell')}><Skeleton className="h-5 w-full" /></td>)}</tr>
          ))}
          {!loading && rows?.map((r, i) => {
            const k = rowKey(r);
            return (
              <motion.tr
                key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.018, duration: 0.25 }}
                onClick={onRowClick ? () => onRowClick(r) : undefined} tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
                className={cn('group', onRowClick && 'cursor-pointer', activeKey === k && 'bg-surface2')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('border-b border-line/60 px-4 align-middle transition-colors group-hover:bg-surface2/70', dense ? 'py-2.5' : 'py-3.5', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.cell(r, i)}</td>
                ))}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      {!loading && rows && rows.length === 0 && <EmptyState src={TARA_STATE.box} title={empty?.title ?? t('Nothing here yet')} body={empty?.body ?? t('Try changing or clearing the filters.')} />}
    </div>
  );
}

export function QueryError({ error, onRetry, compact }: { error: Error; onRetry?: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-6' : 'py-12')}>
      {!compact && <EmptyState src={TARA_STATE.unplug} title="" size={130} className="!py-0" />}
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" />{(error as { status?: number }).status === 403 ? t('Access denied') : t('Something went wrong')}</p>
      <p className="mt-1 max-w-sm text-sm text-ink/65">{error.message}</p>
      {onRetry && <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry} icon={<RotateCw className="h-4 w-4" />}>{t('Retry')}</Button>}
    </div>
  );
}
