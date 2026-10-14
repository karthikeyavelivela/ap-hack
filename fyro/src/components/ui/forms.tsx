import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
  pill?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, icon, error, hint, className, type = 'text', pill = true, id, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className={className}>
      {label && <label htmlFor={iid} className="mb-1.5 block px-1 text-xs font-semibold text-ink/75">{label}</label>}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-b500">{icon}</span>}
        <input
          ref={ref}
          id={iid}
          type={isPw && show ? 'text' : type}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${iid}-e` : hint ? `${iid}-h` : undefined}
          className={cn('field', !pill && '!rounded-2xl', !!icon && 'pl-11', isPw && 'pr-12', error && '!border-b900 !bg-surface')}
          {...rest}
        />
        {isPw && (
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-b500 hover:bg-surface">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? <p id={`${iid}-e`} role="alert" className="mt-1 px-1 text-xs font-medium text-ink">⚠ {error}</p> : hint ? <p id={`${iid}-h`} className="mt-1 px-1 text-xs text-ink/55">{hint}</p> : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, { label?: string; error?: string; className?: string } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>>(function Textarea({ label, error, className, id, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  return (
    <div className={className}>
      {label && <label htmlFor={iid} className="mb-1.5 block px-1 text-xs font-semibold text-ink/75">{label}</label>}
      <textarea ref={ref} id={iid} aria-invalid={!!error || undefined} className={cn('field !rounded-2xl min-h-[96px] resize-y', error && '!border-b900')} {...rest} />
      {error && <p role="alert" className="mt-1 px-1 text-xs font-medium">⚠ {error}</p>}
    </div>
  );
});

export interface Option { value: string; label: string }
export function Select({ label, options, value, onChange, className, placeholder, size = 'md', ...rest }: {
  label?: string; options: Option[]; value: string; onChange: (v: string) => void; className?: string; placeholder?: string; size?: 'sm' | 'md';
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'className' | 'size'>) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block px-1 text-xs font-semibold text-ink/75">{label}</label>}
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn('field appearance-none pr-10', size === 'sm' && '!py-2 text-[13px]')} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-b500" aria-hidden />
      </div>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (b: boolean) => void; label: ReactNode; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2.5 text-sm', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-b500 bg-surface transition peer-checked:bg-b700 peer-checked:border-b700 peer-focus-visible:shadow-glow">
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (b: boolean) => void; label: string; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-7 w-12 shrink-0 rounded-full border border-line transition-colors', checked ? 'bg-b700' : 'bg-surface2', className)}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-soft', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format, className }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; format?: (n: number) => string; className?: string }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-semibold text-ink/75">
        <label htmlFor={id}>{label}</label>
        <span className="rounded-full bg-surface2 px-2 py-0.5 tabular-nums text-ink">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full accent-[rgb(var(--brown-700))]"
        style={{ background: `linear-gradient(to right, rgb(var(--caramel)) ${pct}%, rgb(var(--surface-2)) ${pct}%)` }} />
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, className, size = 'md', label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md'; label?: string }) {
  const gid = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface2 p-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} className={cn('relative rounded-full font-semibold transition-colors', size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]', on ? 'text-inverse' : 'text-ink hover:bg-surface')}>
            {on && <motion.span layoutId={`seg-${gid}`} transition={{ type: 'spring', stiffness: 500, damping: 36 }} className="absolute inset-0 rounded-full bg-b900" />}
            <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const gid = useId();
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} role="tab" aria-selected={on} onClick={() => onChange(t.value)} className={cn('relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors', on ? 'text-ink' : 'text-ink/55 hover:text-ink')}>
            <span className="inline-flex items-center gap-2">
              {t.label}
              {t.count !== undefined && <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] tabular-nums">{t.count}</span>}
            </span>
            {on && <motion.span layoutId={`tab-${gid}`} className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-b700" />}
          </button>
        );
      })}
    </div>
  );
}
