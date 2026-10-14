import { ReactNode, useEffect, useRef, useState, useId, cloneElement, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '@/lib';
import { IconButton } from './Button';

function useLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
}
function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [open, onClose]);
}
function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus],input,textarea,select,button:not([data-close])');
      (el ?? ref.current)?.focus();
    }, 60);
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { clearTimeout(t); document.removeEventListener('keydown', trap); prev?.focus?.(); };
  }, [open, ref]);
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useLock(open); useEsc(open, onClose); useFocusTrap(open, ref);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-b900/45 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-[28px] border border-line bg-surface shadow-lift outline-none sm:rounded-[28px]" style={{ maxWidth: width }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h2 id={tid} className="text-lg font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose} data-close><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, width = 520, side = 'right', footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; side?: 'right' | 'left'; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useLock(open); useEsc(open, onClose); useFocusTrap(open, ref);
  const x = side === 'right' ? '100%' : '-100%';
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90]" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div className="absolute inset-0 bg-b900/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.aside
            ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
            initial={{ x }} animate={{ x: 0 }} exit={{ x }} transition={{ type: 'spring', stiffness: 340, damping: 38 }}
            className={cn('absolute top-0 flex h-full w-full flex-col border-line bg-surface shadow-lift outline-none', side === 'right' ? 'right-0 border-l' : 'left-0 border-r')} style={{ maxWidth: width }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 id={tid} className="min-w-0 truncate text-base font-semibold">{title}</h2>
              <IconButton label="Close panel" onClick={onClose} data-close><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Tooltip({ text, children, side = 'top' }: { text: string; children: ReactElement; side?: 'top' | 'bottom' | 'right' }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {cloneElement(children, { 'aria-describedby': show ? id : undefined } as object)}
      <AnimatePresence>
        {show && (
          <motion.span id={id} role="tooltip" initial={{ opacity: 0, y: side === 'bottom' ? -4 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
            className={cn('pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-b900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lift',
              side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2', side === 'bottom' && 'left-1/2 top-full mt-2 -translate-x-1/2', side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2')}>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ─────────── Toasts ─────────── */
interface ToastItem { id: number; kind: 'success' | 'error' | 'info'; text: string }
const useToastStore = create<{ items: ToastItem[]; add: (t: Omit<ToastItem, 'id'>) => void; remove: (id: number) => void }>((set) => ({
  items: [],
  add: (t) => { const id = Date.now() + Math.random(); set((s) => ({ items: [...s.items.slice(-3), { ...t, id }] })); setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 4200); },
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));
export const toast = {
  success: (text: string) => useToastStore.getState().add({ kind: 'success', text }),
  error: (text: string) => useToastStore.getState().add({ kind: 'error', text }),
  info: (text: string) => useToastStore.getState().add({ kind: 'info', text }),
};
export function Toaster() {
  const { items, remove } = useToastStore();
  return createPortal(
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn('pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lift', t.kind === 'error' ? 'border-b900 bg-b900 text-white' : 'border-line bg-surface text-ink')} role={t.kind === 'error' ? 'alert' : 'status'}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{t.text}</span>
              <button aria-label="Dismiss" onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
