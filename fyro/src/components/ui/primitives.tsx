import { ReactNode, HTMLAttributes, CSSProperties } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { AlertTriangle, ArrowUp, ArrowDown, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib';

export function Card({ className, hover, pad = true, children, ...rest }: { hover?: boolean; pad?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', pad && 'p-5 sm:p-6', hover && 'card-hover', className)} {...rest}>
      {children}
    </div>
  );
}

/** Staggered entrance wrapper */
export function Reveal({ children, delay = 0, className, y = 14, ...rest }: { delay?: number; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut', delay }} className={className} {...rest}>
      {children as ReactNode}
    </motion.div>
  );
}

export function StepBadge({ n, size = 36, className }: { n: number | string; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-b900 font-bold text-inverse shadow-soft', className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={`Step ${n}`}
    >
      {n}
    </span>
  );
}

export function Pill({ children, tone = 'soft', className, icon }: { children: ReactNode; tone?: 'soft' | 'dark' | 'outline' | 'sand'; className?: string; icon?: ReactNode }) {
  const tones = {
    soft: 'bg-surface2 text-ink border border-line',
    dark: 'bg-b900 text-inverse',
    outline: 'border border-b500 text-ink',
    sand: 'bg-sand/40 text-ink border border-sand',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>{icon}{children}</span>;
}

export function SeverityBadge({ s, long, className }: { s: 1 | 2 | 3 | 4; long?: boolean; className?: string }) {
  const label = { 1: 'S1', 2: 'S2', 3: 'S3', 4: 'S4' }[s];
  const words = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }[s];
  const style: Record<number, string> = {
    1: 'bg-[#3B2414] text-white ring-1 ring-black/30 dark:bg-[#2a170a] dark:ring-sand/40',
    2: 'bg-[#6B4226] text-white',
    3: 'bg-[#A47148] text-black',
    4: 'border border-[#C9A27E] bg-transparent text-ink',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', style[s], className)} title={`${label} ${words}`}>
      {s === 1 && <AlertTriangle className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
      {label}
      {long && <span className="font-medium opacity-90">{words}</span>}
    </span>
  );
}

export function TrendArrow({ dir, value, className, significant }: { dir: 'up' | 'down' | 'flat'; value?: string | number; className?: string; significant?: boolean }) {
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : ArrowRight;
  const sym = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▶';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-sand/45 px-2 py-0.5 text-xs font-semibold text-black', significant && 'ring-1 ring-b700', className)} title={significant ? 'Statistically significant change' : 'Within normal variation'}>
      <span aria-hidden className="text-[10px]">{sym}</span>
      <Icon className="sr-only" />
      <span className="sr-only">{dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'Flat'}</span>
      {value !== undefined && <span>{value}</span>}
    </span>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden />;
}
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.12 }} />)}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-b700', className)} aria-label="Loading" />;
}

/** One illustration (pre-sliced asset). */
export function Sprite({ src, size = 120, className, label }: { src: string; size?: number; className?: string; label?: string }) {
  return <img src={src} alt={label ?? ''} aria-hidden={label ? undefined : true} width={size} loading="lazy" decoding="async" className={cn('h-auto shrink-0 select-none object-contain', className)} style={{ width: size }} draggable={false} />;
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} width={size} height={size} className={cn('shrink-0 rounded-full border border-line object-cover', className)} style={{ width: size, height: size }} />;
  return (
    <span aria-label={name} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-caramel to-b700 font-semibold text-white', className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function EmptyState({ src, title, body, action, className, size = 150 }: { src: string; title: string; body?: string; action?: ReactNode; className?: string; size?: number }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <Sprite src={src} size={size} />
      {title && <h3 className="mt-3 text-base font-semibold">{title}</h3>}
      {body && <p className="mt-1 max-w-sm text-sm text-ink/65">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right, className }: { eyebrow?: string; title: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-ink/60">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink/60">{sub}</div>}
    </div>
  );
}

export function Bar({ value, max = 1, className, tone = 'caramel' }: { value: number; max?: number; className?: string; tone?: 'caramel' | 'dark' | 'sand' }) {
  const colors = { caramel: 'bg-caramel', dark: 'bg-b700', sand: 'bg-sand' };
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface2', className)} role="progressbar" aria-valuenow={Math.round((value / max) * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / max) * 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className={cn('h-full rounded-full', colors[tone])} />
    </div>
  );
}
