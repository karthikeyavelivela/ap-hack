import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base = 'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2';
const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-b900 to-caramel text-inverse shadow-soft hover:shadow-lift',
  dark: 'bg-b900 text-inverse hover:bg-b700',
  secondary: 'bg-surface2 text-ink border border-line hover:border-b500',
  outline: 'border border-b500 text-ink hover:bg-surface2',
  ghost: 'text-ink hover:bg-surface2',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-[13px]', md: 'h-11 px-6 text-sm', lg: 'h-[52px] px-8 text-[15px]' };

interface Common { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; iconRight?: ReactNode; full?: boolean; children?: ReactNode; className?: string }
type BtnProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;
type LinkBtnProps = Common & { to: string } & Omit<LinkProps, 'children' | 'className' | 'to'>;

function inner({ loading, icon, iconRight, children }: Common) {
  return (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'primary', size = 'md', loading, icon, iconRight, full, children, className, disabled, type = 'button', ...rest }, ref) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(rest as object)}
    >
      {inner({ loading, icon, iconRight, children })}
    </motion.button>
  );
});

export function LinkButton({ variant = 'primary', size = 'md', icon, iconRight, full, children, className, to, ...rest }: LinkBtnProps) {
  return (
    <Link to={to} className={cn(base, variants[variant], sizes[size], full && 'w-full', 'hover:-translate-y-0.5', className)} {...rest}>
      {inner({ icon, iconRight, children })}
    </Link>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, { label: string; children: ReactNode; active?: boolean; className?: string; size?: 'sm' | 'md' } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>>(
  function IconButton({ label, children, active, className, size = 'md', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-transparent text-ink transition hover:bg-surface2 active:scale-95', size === 'md' ? 'h-10 w-10' : 'h-8 w-8', active && 'bg-surface2 border-line', className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
