import { ReactNode, useEffect, useRef, useState, cloneElement, ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib';

/** Click-outside / Esc-dismissable dropdown. `trigger` receives onClick + aria props. */
export function Popover({ trigger, children, align = 'right', width = 280, className }: {
  trigger: ReactElement; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {cloneElement(trigger, { onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' } as object)}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
            className={cn('absolute z-50 mt-2 max-w-[calc(100vw-1.5rem)] origin-top rounded-2xl border border-line bg-surface p-2 shadow-lift', align === 'right' ? 'right-0' : 'left-0', className)} style={{ width }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ children, onClick, icon, active, danger }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-surface2', active && 'bg-surface2 font-semibold', danger && 'text-ink')}>
      {icon && <span className="text-b500">{icon}</span>}
      <span className="flex-1">{children}</span>
      {active && <span className="h-2 w-2 rounded-full bg-b700" />}
    </button>
  );
}
