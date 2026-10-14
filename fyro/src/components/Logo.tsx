import { Link } from 'react-router-dom';
import { cn } from '@/lib';

export function LogoMark({ size = 28, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 64 70" aria-hidden className="shrink-0">
      <path d="M26 2c8 4 16 12 18 24 3-3 6-6 7-10 8 8 13 18 11 28-2 12-12 20-26 20-8 0-12-2-16-5l2-8C8 46 4 38 8 28 12 18 22 14 26 2z" fill={light ? '#fff' : '#4A2A16'} />
      <path d="M31 22c6 3 10 9 10 17 0 9-6 15-14 15-7 0-11-5-11-11 0-9 8-14 15-21z" fill="#A47148" />
      <circle cx="30" cy="44" r="7" fill="#F2C48D" />
    </svg>
  );
}

export function Logo({ to = '/', size = 30, light, className, tag }: { to?: string; size?: number; light?: boolean; className?: string; tag?: boolean }) {
  return (
    <Link to={to} aria-label="FYRO home" className={cn('inline-flex flex-col leading-none', className)}>
      <span className="inline-flex items-center gap-2">
        <LogoMark size={size * 0.8} light={light} />
        <span className={cn('font-display tracking-wide', light ? 'text-white' : 'text-ink')} style={{ fontSize: size }}>FYRO<span className="text-caramel">.</span></span>
      </span>
      {tag && <span className={cn('mt-1 text-[10px] font-medium tracking-wide', light ? 'text-white/80' : 'text-ink/60')}>Store voices, turned into action.</span>}
    </Link>
  );
}
