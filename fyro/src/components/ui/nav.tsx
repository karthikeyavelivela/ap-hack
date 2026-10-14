import { Fragment, ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib';
import { Button } from './Button';

/** History-aware back button with a parent-route fallback. */
export function BackButton({ fallback, label, className }: { fallback: string; label?: string; className?: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useTranslation();
  const go = () => { if (loc.key !== 'default' && window.history.length > 1) nav(-1); else nav(fallback); };
  return (
    <Button variant="secondary" size="sm" onClick={go} icon={<ArrowLeft className="h-4 w-4" />} className={className} aria-label={label ?? t('Back')}>
      {label ?? t('Back')}
    </Button>
  );
}

export interface Crumb { label: string; to?: string }
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink/65">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li className={cn('min-w-0 truncate', last && 'font-semibold text-ink')} aria-current={last ? 'page' : undefined}>
                {c.to && !last ? <Link to={c.to} className="rounded px-1 hover:bg-surface2 hover:text-ink">{c.label}</Link> : <span className="px-1">{c.label}</span>}
              </li>
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, subtitle, back, crumbs, actions, className }: { title: ReactNode; subtitle?: ReactNode; back?: string; crumbs?: Crumb[]; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6', className)}>
      {(back || crumbs) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {back && <BackButton fallback={back} />}
          {crumbs && <Breadcrumbs items={crumbs} />}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink/65">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Pagination({ page, pages, onPage, total, pageSize }: { page: number; pages: number; onPage: (p: number) => void; total?: number; pageSize?: number }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-ink/60">{total !== undefined && pageSize ? t('Showing {{a}}–{{b}} of {{n}}', { a: (page - 1) * pageSize + 1, b: Math.min(total, page * pageSize), n: total.toLocaleString('en-IN') }) : `${page} / ${pages}`}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} icon={<ChevronLeft className="h-4 w-4" />} aria-label="Previous page">{t('Prev')}</Button>
        <span className="px-3 tabular-nums">{page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} iconRight={<ChevronRight className="h-4 w-4" />} aria-label="Next page">{t('Next')}</Button>
      </div>
    </div>
  );
}
