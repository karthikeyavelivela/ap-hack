import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Orb } from '@/components/Orb';
import { TaraChat } from './TaraChat';
import { useTara } from '@/store';

/** Floating launcher + slide-in panel (full-screen sheet on mobile). */
export default function TaraDock() {
  const { open, setOpen, mood } = useTara();
  const loc = useLocation();
  const { t } = useTranslation();
  if (loc.pathname === '/app/tara') return null;
  return (
    <div data-tara-dock>
      <AnimatePresence>
        {open && (
          <motion.aside role="dialog" aria-label="Tara assistant" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-0 z-[120] flex flex-col bg-surface shadow-lift sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[420px] sm:rounded-[28px] sm:border sm:border-line">
            <button onClick={() => setOpen(false)} aria-label={t('Close Tara')} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface2 hover:bg-line"><X className="h-4 w-4" /></button>
            <TaraChat />
          </motion.aside>
        )}
      </AnimatePresence>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label={t('Open Tara assistant')} data-tour="tara-launcher" className="fixed bottom-5 right-5 z-[110] flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6">
          <Orb size={60} mood={mood === 'idle' ? 'idle' : mood} />
        </button>
      )}
    </div>
  );
}
